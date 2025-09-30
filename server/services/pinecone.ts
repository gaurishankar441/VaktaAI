import { Pinecone } from '@pinecone-database/pinecone';

export interface VectorMatch {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface QueryResult {
  matches: VectorMatch[];
  namespace?: string;
}

export class PineconeService {
  private client: Pinecone | null = null;
  private indexName: string;

  constructor() {
    this.indexName = process.env.PINECONE_INDEX_NAME || 'edushepherd-embeddings';
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      const apiKey = process.env.PINECONE_API_KEY || process.env.PINECONE_API_KEY_ENV_VAR;
      
      if (!apiKey) {
        console.warn("Pinecone API key not found, vector operations will fail");
        return;
      }

      this.client = new Pinecone({
        apiKey: apiKey,
      });

      console.log("Pinecone client initialized successfully");
      
      // Ensure index exists
      await this.ensureIndexExists();
    } catch (error) {
      console.error("Failed to initialize Pinecone client:", error);
    }
  }

  private async ensureIndexExists(): Promise<void> {
    if (!this.client) return;

    try {
      const indexes = await this.client.listIndexes();
      const indexExists = indexes.indexes?.some(idx => idx.name === this.indexName);

      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.indexName}`);
        await this.client.createIndex({
          name: this.indexName,
          dimension: 1536, // OpenAI text-embedding-3-small dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        
        // Wait for index to be ready
        console.log("Waiting for index to be ready...");
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        console.log(`Pinecone index ${this.indexName} created successfully`);
      } else {
        console.log(`Pinecone index ${this.indexName} already exists`);
      }
    } catch (error) {
      console.error("Failed to ensure Pinecone index exists:", error);
      // Don't throw - allow the service to continue with degraded functionality
    }
  }

  async upsertVector(
    id: string,
    embedding: number[],
    metadata: Record<string, any>,
    namespace?: string
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Pinecone client not initialized");
    }

    try {
      const index = this.client.index(this.indexName);
      const ns = namespace ? index.namespace(namespace) : index;

      // Filter out null/undefined values from metadata
      const cleanMetadata = Object.fromEntries(
        Object.entries(metadata).filter(([_, value]) => 
          value !== null && value !== undefined
        )
      );

      await ns.upsert([
        {
          id,
          values: embedding,
          metadata: cleanMetadata,
        },
      ]);
    } catch (error) {
      console.error("Pinecone upsert error:", error);
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
      throw new Error("Pinecone client not initialized");
    }

    try {
      const index = this.client.index(this.indexName);
      const ns = namespace ? index.namespace(namespace) : index;

      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await ns.upsert(
          batch.map(vector => {
            // Filter out null/undefined values from metadata
            const cleanMetadata = Object.fromEntries(
              Object.entries(vector.metadata).filter(([_, value]) => 
                value !== null && value !== undefined
              )
            );
            
            return {
              id: vector.id,
              values: vector.embedding,
              metadata: cleanMetadata,
            };
          })
        );
      }
    } catch (error) {
      console.error("Pinecone batch upsert error:", error);
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
      throw new Error("Pinecone client not initialized");
    }

    try {
      const index = this.client.index(this.indexName);
      const ns = namespace ? index.namespace(namespace) : index;

      const response = await ns.query({
        vector: embedding,
        topK,
        includeMetadata: true,
        filter,
      });

      return {
        matches: response.matches || [],
        namespace,
      };
    } catch (error) {
      console.error("Pinecone query error:", error);
      throw new Error(`Failed to query vectors: ${error.message}`);
    }
  }

  async deleteVector(id: string, namespace?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Pinecone client not initialized");
    }

    try {
      const index = this.client.index(this.indexName);
      const ns = namespace ? index.namespace(namespace) : index;

      await ns.deleteOne(id);
    } catch (error) {
      console.error("Pinecone delete error:", error);
      throw new Error(`Failed to delete vector: ${error.message}`);
    }
  }

  async deleteByFilter(filter: Record<string, any>, namespace?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Pinecone client not initialized");
    }

    try {
      const index = this.client.index(this.indexName);
      const ns = namespace ? index.namespace(namespace) : index;

      await ns.deleteMany(filter);
    } catch (error) {
      console.error("Pinecone delete by filter error:", error);
      throw new Error(`Failed to delete vectors by filter: ${error.message}`);
    }
  }

  async deleteNamespace(namespace: string): Promise<void> {
    if (!this.client) {
      throw new Error("Pinecone client not initialized");
    }

    try {
      const index = this.client.index(this.indexName);
      await index.namespace(namespace).deleteAll();
    } catch (error) {
      console.error("Pinecone delete namespace error:", error);
      throw new Error(`Failed to delete namespace: ${error.message}`);
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }
}

export const pineconeService = new PineconeService();
