import { pineconeService } from './pinecone.js';

export interface VectorMatch {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface QueryResult {
  matches: VectorMatch[];
  namespace?: string;
}

export interface IVectorStore {
  upsertVector(
    id: string,
    embedding: number[],
    metadata: Record<string, any>,
    namespace?: string
  ): Promise<void>;

  upsertVectors(
    vectors: Array<{
      id: string;
      embedding: number[];
      metadata: Record<string, any>;
    }>,
    namespace?: string
  ): Promise<void>;

  queryVectors(
    embedding: number[],
    topK?: number,
    namespace?: string,
    filter?: Record<string, any>
  ): Promise<QueryResult>;

  deleteVector(id: string, namespace?: string): Promise<void>;

  deleteByFilter(filter: Record<string, any>, namespace?: string): Promise<void>;

  deleteNamespace(namespace: string): Promise<void>;

  isAvailable(): boolean;
}

class VectorStoreManager {
  private store: IVectorStore | null = null;

  constructor() {
    this.initializeStore();
  }

  private initializeStore() {
    // Use Pinecone as the vector store
    if (pineconeService.isAvailable()) {
      this.store = pineconeService as IVectorStore;
      console.log("Using Pinecone as vector store");
    } 
    else {
      console.warn("Pinecone not available. Configure PINECONE_API_KEY");
      this.store = null;
    }
  }

  async upsertVector(
    id: string,
    embedding: number[],
    metadata: Record<string, any>,
    namespace?: string
  ): Promise<void> {
    if (!this.store) {
      throw new Error("No vector store configured");
    }
    return this.store.upsertVector(id, embedding, metadata, namespace);
  }

  async upsertVectors(
    vectors: Array<{
      id: string;
      embedding: number[];
      metadata: Record<string, any>;
    }>,
    namespace?: string
  ): Promise<void> {
    if (!this.store) {
      throw new Error("No vector store configured");
    }
    return this.store.upsertVectors(vectors, namespace);
  }

  async queryVectors(
    embedding: number[],
    topK: number = 10,
    namespace?: string,
    filter?: Record<string, any>
  ): Promise<QueryResult> {
    if (!this.store) {
      throw new Error("No vector store configured");
    }
    return this.store.queryVectors(embedding, topK, namespace, filter);
  }

  async deleteVector(id: string, namespace?: string): Promise<void> {
    if (!this.store) {
      throw new Error("No vector store configured");
    }
    return this.store.deleteVector(id, namespace);
  }

  async deleteByFilter(filter: Record<string, any>, namespace?: string): Promise<void> {
    if (!this.store) {
      throw new Error("No vector store configured");
    }
    return this.store.deleteByFilter(filter, namespace);
  }

  async deleteNamespace(namespace: string): Promise<void> {
    if (!this.store) {
      throw new Error("No vector store configured");
    }
    return this.store.deleteNamespace(namespace);
  }

  isAvailable(): boolean {
    return this.store !== null && this.store.isAvailable();
  }

  getStoreName(): string {
    if (!this.store) return "none";
    if (this.store === pineconeService) return "pinecone";
    return "unknown";
  }
}

export const vectorStore = new VectorStoreManager();
