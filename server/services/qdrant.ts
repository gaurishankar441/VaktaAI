import { QdrantClient } from '@qdrant/js-client-rest';

export interface VectorMatch {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface QueryResult {
  matches: VectorMatch[];
  namespace?: string;
}

// Embedding dimension should match OpenAI text-embedding-3-small
const EMBEDDING_DIMENSION = 1536;

export class QdrantService {
  private client: QdrantClient | null = null;
  private collectionName: string;
  private ready: boolean = false;

  constructor() {
    this.collectionName = process.env.QDRANT_COLLECTION_NAME || 'edushepherd_embeddings';
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      const url = process.env.QDRANT_URL || 'http://localhost:6333';
      const apiKey = process.env.QDRANT_API_KEY;

      this.client = new QdrantClient({
        url,
        apiKey,
      });

      // Try to get collection info to verify connection
      try {
        await this.client.getCollection(this.collectionName);
        this.ready = true;
        console.log("Qdrant client initialized successfully");
      } catch (error) {
        // Collection might not exist yet, create it
        await this.createCollection();
        this.ready = true;
        console.log("Qdrant collection created successfully");
      }
    } catch (error) {
      console.error("Failed to initialize Qdrant client:", error);
      this.client = null;
      this.ready = false;
    }
  }

  private async createCollection(): Promise<void> {
    if (!this.client) {
      throw new Error("Qdrant client not initialized");
    }

    try {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: EMBEDDING_DIMENSION,
          distance: 'Cosine',
        },
      });
    } catch (error) {
      console.error("Failed to create Qdrant collection:", error);
      throw error;
    }
  }

  async upsertVector(
    id: string,
    embedding: number[],
    metadata: Record<string, any>,
    namespace?: string
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Qdrant client not initialized");
    }

    try {
      const payload = { ...metadata };
      if (namespace) {
        payload._namespace = namespace;
      }

      await this.client.upsert(this.collectionName, {
        points: [
          {
            id,
            vector: embedding,
            payload,
          },
        ],
      });
    } catch (error) {
      console.error("Qdrant upsert error:", error);
      throw new Error(`Failed to upsert vector: ${error.message}`);
    }
  }

  async upsertVectors(
    vectors: Array<{
      id: string;
      embedding: number[];
      metadata: Record<string, any>;
    }>,
    namespace?: string
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Qdrant client not initialized");
    }

    try {
      const points = vectors.map(vector => {
        const payload = { ...vector.metadata };
        if (namespace) {
          payload._namespace = namespace;
        }

        return {
          id: vector.id,
          vector: vector.embedding,
          payload,
        };
      });

      const batchSize = 100;
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        await this.client.upsert(this.collectionName, {
          points: batch,
        });
      }
    } catch (error) {
      console.error("Qdrant batch upsert error:", error);
      throw new Error(`Failed to upsert vectors: ${error.message}`);
    }
  }

  async queryVectors(
    embedding: number[],
    topK: number = 10,
    namespace?: string,
    filter?: Record<string, any>
  ): Promise<QueryResult> {
    if (!this.client) {
      throw new Error("Qdrant client not initialized");
    }

    try {
      const qdrantFilter: any = {};
      
      // Add namespace filter if provided
      if (namespace) {
        qdrantFilter.must = qdrantFilter.must || [];
        qdrantFilter.must.push({
          key: '_namespace',
          match: { value: namespace },
        });
      }

      // Add custom filters if provided
      if (filter) {
        qdrantFilter.must = qdrantFilter.must || [];
        Object.entries(filter).forEach(([key, value]) => {
          qdrantFilter.must.push({
            key,
            match: { value },
          });
        });
      }

      const response = await this.client.search(this.collectionName, {
        vector: embedding,
        limit: topK,
        with_payload: true,
        filter: Object.keys(qdrantFilter).length > 0 ? qdrantFilter : undefined,
      });

      const matches: VectorMatch[] = response.map(result => ({
        id: result.id.toString(),
        score: result.score,
        metadata: result.payload as Record<string, any>,
      }));

      return {
        matches,
        namespace,
      };
    } catch (error) {
      console.error("Qdrant query error:", error);
      throw new Error(`Failed to query vectors: ${error.message}`);
    }
  }

  async deleteVector(id: string, namespace?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Qdrant client not initialized");
    }

    try {
      // Delete by point ID directly
      await this.client.delete(this.collectionName, {
        points: [id],
      });
    } catch (error) {
      console.error("Qdrant delete error:", error);
      throw new Error(`Failed to delete vector: ${error.message}`);
    }
  }

  async deleteByFilter(filter: Record<string, any>, namespace?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Qdrant client not initialized");
    }

    try {
      const qdrantFilter: any = {
        must: Object.entries(filter).map(([key, value]) => ({
          key,
          match: { value },
        })),
      };

      if (namespace) {
        qdrantFilter.must.push({
          key: '_namespace',
          match: { value: namespace },
        });
      }

      await this.client.delete(this.collectionName, {
        filter: qdrantFilter,
      });
    } catch (error) {
      console.error("Qdrant delete by filter error:", error);
      throw new Error(`Failed to delete vectors by filter: ${error.message}`);
    }
  }

  async deleteNamespace(namespace: string): Promise<void> {
    if (!this.client) {
      throw new Error("Qdrant client not initialized");
    }

    try {
      await this.client.delete(this.collectionName, {
        filter: {
          must: [
            {
              key: '_namespace',
              match: { value: namespace },
            },
          ],
        },
      });
    } catch (error) {
      console.error("Qdrant delete namespace error:", error);
      throw new Error(`Failed to delete namespace: ${error.message}`);
    }
  }

  isAvailable(): boolean {
    return this.ready && this.client !== null;
  }
}

export const qdrantService = new QdrantService();
