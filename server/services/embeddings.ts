import { openaiService } from './openai.js';
import { pineconeService } from './pinecone.js';
import { storage } from '../storage.js';
import type { Chunk, Document } from '@shared/schema';

export interface EmbeddingChunk extends Chunk {
  embedding?: number[];
}

export class EmbeddingService {
  async createChunkEmbedding(chunk: Chunk): Promise<number[]> {
    try {
      const result = await openaiService.createEmbedding(chunk.text);
      return result.embedding;
    } catch (error) {
      console.error(`Failed to create embedding for chunk ${chunk.id}:`, error);
      throw error;
    }
  }

  async createChunkEmbeddings(chunks: Chunk[]): Promise<EmbeddingChunk[]> {
    try {
      const texts = chunks.map(chunk => chunk.text);
      const results = await openaiService.createBatchEmbeddings(texts);
      
      return chunks.map((chunk, index) => ({
        ...chunk,
        embedding: results[index].embedding,
      }));
    } catch (error) {
      console.error("Failed to create batch embeddings:", error);
      throw error;
    }
  }

  async storeChunkEmbeddings(chunks: EmbeddingChunk[], documentId: string): Promise<void> {
    if (!pineconeService.isAvailable()) {
      console.warn("Pinecone not available, skipping vector storage");
      return;
    }

    try {
      const document = await storage.getDocument(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      const namespace = `doc_${documentId}`;
      const vectors = chunks
        .filter(chunk => chunk.embedding)
        .map(chunk => ({
          id: chunk.id,
          embedding: chunk.embedding!,
          metadata: {
            documentId: chunk.documentId,
            text: chunk.text,
            startPage: chunk.startPage,
            endPage: chunk.endPage,
            startTime: chunk.startTime ? parseFloat(chunk.startTime.toString()) : undefined,
            endTime: chunk.endTime ? parseFloat(chunk.endTime.toString()) : undefined,
            userId: document.userId,
            documentTitle: document.title,
            sourceType: document.sourceType,
          },
        }));

      await pineconeService.upsertVectors(vectors, namespace);

      // Update chunks with vector references
      for (const chunk of chunks) {
        if (chunk.embedding) {
          await storage.updateChunk(chunk.id, {
            vectorId: chunk.id,
            embeddingRef: `${namespace}:${chunk.id}`,
          });
        }
      }
    } catch (error) {
      console.error("Failed to store chunk embeddings:", error);
      throw error;
    }
  }

  async queryDocumentEmbeddings(
    query: string,
    documentIds: string[],
    topK: number = 10
  ): Promise<Chunk[]> {
    try {
      const queryEmbedding = await openaiService.createEmbedding(query);
      const allMatches: { chunk: Chunk; score: number }[] = [];

      if (pineconeService.isAvailable()) {
        // Query each document namespace
        for (const documentId of documentIds) {
          const namespace = `doc_${documentId}`;
          
          try {
            const results = await pineconeService.queryVectors(
              queryEmbedding.embedding,
              topK,
              namespace
            );

            for (const match of results.matches) {
              const chunk = await storage.getChunk(match.id);
              if (chunk) {
                allMatches.push({ chunk, score: match.score });
              }
            }
          } catch (error) {
            console.warn(`Failed to query namespace ${namespace}:`, error);
          }
        }

        // Sort by score and return top results
        allMatches.sort((a, b) => b.score - a.score);
        return allMatches.slice(0, topK).map(match => match.chunk);
      } else {
        // Fallback: return all chunks from documents (less efficient)
        console.warn("Pinecone not available, using fallback text search");
        const allChunks: Chunk[] = [];
        
        for (const documentId of documentIds) {
          const chunks = await storage.getDocumentChunks(documentId);
          allChunks.push(...chunks);
        }

        // Simple text matching fallback
        return allChunks
          .filter(chunk => 
            chunk.text.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, topK);
      }
    } catch (error) {
      console.error("Failed to query document embeddings:", error);
      throw error;
    }
  }

  async deleteDocumentEmbeddings(documentId: string): Promise<void> {
    if (!pineconeService.isAvailable()) {
      return;
    }

    try {
      const namespace = `doc_${documentId}`;
      await pineconeService.deleteNamespace(namespace);
    } catch (error) {
      console.error(`Failed to delete embeddings for document ${documentId}:`, error);
      // Don't throw, as this is cleanup
    }
  }
}

export const embeddingService = new EmbeddingService();
