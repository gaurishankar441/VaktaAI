import { EmbeddingsService, EmbeddingChunk } from './embeddings';

// Simplified in-memory vector store (in production, this would be Qdrant)
export interface VectorSearchResult {
  chunk: EmbeddingChunk;
  score: number;
}

export class RAGService {
  private embeddingsService: EmbeddingsService;
  private vectorStore: Map<string, EmbeddingChunk> = new Map();
  private documentIndex: Map<string, string[]> = new Map(); // documentId -> chunkIds

  constructor() {
    this.embeddingsService = new EmbeddingsService();
  }

  // Ingest document into vector store
  async ingestDocument(
    documentId: string,
    text: string,
    metadata: { title: string; type: string; source: string }
  ): Promise<void> {
    try {
      // Process document into chunks with embeddings
      const chunks = await this.embeddingsService.processDocument(text, {
        source: documentId,
        title: metadata.title,
        type: metadata.type
      });

      const chunkIds: string[] = [];

      // Store chunks in vector store
      for (const chunk of chunks) {
        this.vectorStore.set(chunk.id, chunk);
        chunkIds.push(chunk.id);
      }

      // Update document index
      this.documentIndex.set(documentId, chunkIds);
      
      console.log(`Ingested ${chunks.length} chunks for document ${documentId}`);
    } catch (error) {
      console.error(`Failed to ingest document ${documentId}:`, error);
      throw error;
    }
  }

  // Hybrid search: BM25 + Vector similarity
  async hybridSearch(
    query: string, 
    documentIds?: string[], 
    k: number = 8
  ): Promise<VectorSearchResult[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingsService.generateQueryEmbedding(query);
      
      // Get candidate chunks
      const candidateChunks = this.getCandidateChunks(documentIds);
      
      if (candidateChunks.length === 0) {
        return [];
      }

      // Calculate BM25 scores
      const bm25Scores = this.calculateBM25Scores(query, candidateChunks);
      
      // Calculate vector similarity scores
      const vectorScores = candidateChunks.map(chunk => ({
        chunk,
        score: this.embeddingsService.cosineSimilarity(queryEmbedding, chunk.embedding)
      }));

      // Combine scores (weighted hybrid approach)
      const hybridResults = candidateChunks.map((chunk, index) => ({
        chunk,
        score: 0.3 * bm25Scores[index] + 0.7 * vectorScores[index].score
      }));

      // Sort by combined score and return top-k
      const sortedResults = hybridResults
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(k * 3, 24)); // Get more candidates for reranking

      // Apply reranking (simplified - in production would use bge-reranker-v2-m3)
      return this.rerankResults(query, sortedResults).slice(0, k);
      
    } catch (error) {
      console.error('Hybrid search failed:', error);
      return [];
    }
  }

  // Get candidate chunks for search
  private getCandidateChunks(documentIds?: string[]): EmbeddingChunk[] {
    if (!documentIds || documentIds.length === 0) {
      return Array.from(this.vectorStore.values());
    }

    const chunks: EmbeddingChunk[] = [];
    for (const docId of documentIds) {
      const chunkIds = this.documentIndex.get(docId) || [];
      for (const chunkId of chunkIds) {
        const chunk = this.vectorStore.get(chunkId);
        if (chunk) chunks.push(chunk);
      }
    }
    return chunks;
  }

  // Simplified BM25 scoring
  private calculateBM25Scores(query: string, chunks: EmbeddingChunk[]): number[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const k1 = 1.5;
    const b = 0.75;
    
    // Calculate average document length
    const avgDocLen = chunks.reduce((sum, chunk) => 
      sum + chunk.text.split(/\s+/).length, 0) / chunks.length;

    return chunks.map(chunk => {
      const docTerms = chunk.text.toLowerCase().split(/\s+/);
      const docLength = docTerms.length;
      
      let score = 0;
      
      for (const term of queryTerms) {
        // Term frequency in document
        const tf = docTerms.filter(t => t.includes(term)).length;
        if (tf === 0) continue;
        
        // Inverse document frequency (simplified)
        const df = chunks.filter(c => 
          c.text.toLowerCase().includes(term)
        ).length;
        const idf = Math.log((chunks.length - df + 0.5) / (df + 0.5));
        
        // BM25 formula
        const bm25Term = idf * (tf * (k1 + 1)) / 
          (tf + k1 * (1 - b + b * (docLength / avgDocLen)));
        
        score += bm25Term;
      }
      
      return Math.max(0, score);
    });
  }

  // Simplified reranking (in production would use bge-reranker-v2-m3)
  private rerankResults(query: string, results: VectorSearchResult[]): VectorSearchResult[] {
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    
    return results.map(result => {
      const textWords = new Set(result.chunk.text.toLowerCase().split(/\s+/));
      const overlap = Array.from(queryWords).filter(word => textWords.has(word)).length;
      const rerankBoost = overlap / Math.max(queryWords.size, 1);
      
      return {
        ...result,
        score: result.score * (1 + rerankBoost * 0.2) // Small boost for term overlap
      };
    }).sort((a, b) => b.score - a.score);
  }

  // Generate answer with citations from retrieved chunks
  generateContextForLLM(
    results: VectorSearchResult[],
    maxTokens: number = 2000
  ): { context: string; citations: Array<{ id: string; source: string; page?: number }> } {
    let context = '';
    const citations: Array<{ id: string; source: string; page?: number }> = [];
    let tokenCount = 0;
    
    for (const result of results) {
      const chunk = result.chunk;
      const chunkTokens = Math.ceil(chunk.text.length / 4); // Rough token estimate
      
      if (tokenCount + chunkTokens > maxTokens) break;
      
      context += `[Doc ${chunk.metadata.source}${chunk.metadata.page ? `, p.${chunk.metadata.page}` : ''}${chunk.metadata.section ? ` §${chunk.metadata.section}` : ''}]\n${chunk.text}\n\n`;
      
      citations.push({
        id: chunk.id,
        source: chunk.metadata.source,
        page: chunk.metadata.page
      });
      
      tokenCount += chunkTokens;
    }
    
    return { context: context.trim(), citations };
  }

  // Get document status
  getDocumentStatus(documentId: string): { 
    exists: boolean; 
    chunkCount: number; 
    status: 'processing' | 'ready' | 'error' 
  } {
    const chunkIds = this.documentIndex.get(documentId);
    
    if (!chunkIds) {
      return { exists: false, chunkCount: 0, status: 'error' };
    }
    
    return { 
      exists: true, 
      chunkCount: chunkIds.length, 
      status: 'ready' 
    };
  }

  // Remove document from vector store
  removeDocument(documentId: string): boolean {
    const chunkIds = this.documentIndex.get(documentId);
    if (!chunkIds) return false;
    
    for (const chunkId of chunkIds) {
      this.vectorStore.delete(chunkId);
    }
    
    this.documentIndex.delete(documentId);
    return true;
  }
}
