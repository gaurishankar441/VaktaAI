export interface RerankResult {
  index: number;
  relevanceScore: number;
  document: any;
}

export interface RerankOptions {
  query: string;
  documents: any[];
  topK?: number;
  model?: string;
}

export class CohereService {
  private apiKey: string;
  private baseUrl = 'https://api.cohere.ai/v1';

  constructor() {
    this.apiKey = process.env.COHERE_API_KEY || process.env.COHERE_API_KEY_ENV_VAR || "default_key";
  }

  async rerank(options: RerankOptions): Promise<RerankResult[]> {
    const { query, documents, topK = 8, model = 'rerank-english-v3.0' } = options;

    try {
      const response = await fetch(`${this.baseUrl}/rerank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          query,
          documents: documents.map(doc => typeof doc === 'string' ? doc : doc.text || JSON.stringify(doc)),
          top_k: topK,
          return_documents: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return data.results.map((result: any) => ({
        index: result.index,
        relevanceScore: result.relevance_score,
        document: documents[result.index],
      }));
    } catch (error) {
      console.error("Cohere rerank error:", error);
      throw new Error(`Failed to rerank documents: ${error.message}`);
    }
  }

  async rerankChunks(query: string, chunks: any[], topK: number = 8): Promise<any[]> {
    if (chunks.length === 0) return [];

    // Skip reranking if API key is missing or invalid
    if (!this.apiKey || this.apiKey === "default_key") {
      console.warn("Cohere API key not configured, skipping reranking");
      return chunks.slice(0, topK);
    }

    try {
      const results = await this.rerank({
        query,
        documents: chunks,
        topK: Math.min(topK, chunks.length),
      });

      // Return chunks sorted by relevance score
      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .map(result => ({
          ...result.document,
          relevanceScore: result.relevanceScore,
        }));
    } catch (error) {
      console.error("Failed to rerank chunks, returning original order:", error);
      // Fallback to original order if reranking fails
      return chunks.slice(0, topK);
    }
  }
}

export const cohereService = new CohereService();
