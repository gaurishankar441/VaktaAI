import { embeddingService } from './embeddings.js';
import { cohereService } from './cohere.js';
import { openaiService } from './openai.js';
import { storage } from '../storage.js';
import type { Chunk } from '@shared/schema';

export interface RAGContext {
  chunks: Chunk[];
  citations: Array<{
    chunkId: string;
    source: string;
    page?: number;
    time?: number;
    relevanceScore?: number;
  }>;
}

export interface RAGResponse {
  answer: string;
  takeaways: string[];
  citations: Array<{
    chunkId: string;
    source: string;
    page?: number;
    time?: number;
  }>;
  tokensUsed: number;
}

export class RAGService {
  private readonly MAX_CONTEXT_LENGTH = 8000; // tokens
  private readonly CHUNK_OVERLAP_PENALTY = 0.1;

  async retrieveContext(
    query: string,
    documentIds: string[],
    topK: number = 8
  ): Promise<RAGContext> {
    try {
      // Step 1: Vector similarity search
      const candidateChunks = await embeddingService.queryDocumentEmbeddings(
        query,
        documentIds,
        topK * 2 // Get more candidates for reranking
      );

      if (candidateChunks.length === 0) {
        return { chunks: [], citations: [] };
      }

      // Step 2: Rerank with Cohere
      const rerankedChunks = await cohereService.rerankChunks(
        query,
        candidateChunks,
        topK
      );

      // Step 3: Filter overlapping chunks and build citations
      const finalChunks = this.filterOverlappingChunks(rerankedChunks.slice(0, topK));
      const citations = finalChunks.map(chunk => {
        const document = documentIds.find(id => chunk.documentId === id);
        return {
          chunkId: chunk.id,
          source: `Document ${chunk.documentId}`,
          page: chunk.startPage,
          time: chunk.startTime ? parseFloat(chunk.startTime.toString()) : undefined,
          relevanceScore: (chunk as any).relevanceScore,
        };
      });

      return {
        chunks: finalChunks,
        citations,
      };
    } catch (error) {
      console.error("Failed to retrieve RAG context:", error);
      throw error;
    }
  }

  async generateResponse(
    query: string,
    context: RAGContext,
    options: {
      streaming?: boolean;
      res?: any;
    } = {}
  ): Promise<RAGResponse> {
    const contextText = this.buildContextText(context.chunks);
    
    const prompt = this.buildRAGPrompt(query, contextText);

    try {
      if (options.streaming && options.res) {
        // For streaming responses, we need to handle this differently
        await this.generateStreamingResponse(prompt, options.res);
        return {
          answer: "Streaming response in progress",
          takeaways: [],
          citations: context.citations,
          tokensUsed: 0,
        };
      } else {
        const response = await openaiService.chatCompletion(
          [
            {
              role: "system",
              content: "You are DocChatAssistant. Use only the provided context to answer questions with proper citations."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          {
            responseFormat: { type: "json_object" },
            maxTokens: 1000,
          }
        );

        const parsedResponse = JSON.parse(response.content);
        
        return {
          answer: parsedResponse.answer || response.content,
          takeaways: parsedResponse.takeaways || [],
          citations: context.citations,
          tokensUsed: response.tokens,
        };
      }
    } catch (error) {
      console.error("Failed to generate RAG response:", error);
      throw error;
    }
  }

  async generateStreamingResponse(
    prompt: string,
    res: any
  ): Promise<void> {
    const messages = [
      {
        role: "system",
        content: "You are DocChatAssistant. Use only the provided context to answer questions with proper citations. Provide a thoughtful, well-structured response."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    await openaiService.createStreamingResponse(messages, res);
  }

  private buildContextText(chunks: Chunk[]): string {
    return chunks.map((chunk, index) => {
      let sourceMeta = "";
      if (chunk.startPage) {
        sourceMeta = `page ${chunk.startPage}`;
        if (chunk.endPage && chunk.endPage !== chunk.startPage) {
          sourceMeta += `-${chunk.endPage}`;
        }
      } else if (chunk.startTime) {
        const minutes = Math.floor(parseFloat(chunk.startTime.toString()) / 60);
        const seconds = Math.floor(parseFloat(chunk.startTime.toString()) % 60);
        sourceMeta = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }

      return `---
Source: Document ${chunk.documentId}, ${sourceMeta}
Text: ${chunk.text}
---`;
    }).join('\n\n');
  }

  private buildRAGPrompt(query: string, contextText: string): string {
    return `You are **DocChatAssistant**. Use only retrieved contexts.

Retrieved Contexts:
${contextText}

User Question: "${query}"

Instructions:
- Reason step-by-step internally.
- Answer concisely with citations [source: page/time] for each factual claim.
- If insufficient context, say: "I'm sorry, not enough data to answer confidently."
- End with 2–4 "Key takeaways" bullets.

Output JSON:
{ "answer": "...", "takeaways": ["...", "..."] }`;
  }

  private filterOverlappingChunks(chunks: Chunk[]): Chunk[] {
    const filtered: Chunk[] = [];
    
    for (const chunk of chunks) {
      let shouldAdd = true;
      
      // Check for overlap with already selected chunks
      for (const existingChunk of filtered) {
        if (this.chunksOverlap(chunk, existingChunk)) {
          // Keep the higher scoring chunk (assuming they're ordered by score)
          const chunkScore = (chunk as any).relevanceScore || 0;
          const existingScore = (existingChunk as any).relevanceScore || 0;
          
          if (chunkScore <= existingScore + this.CHUNK_OVERLAP_PENALTY) {
            shouldAdd = false;
            break;
          } else {
            // Remove the lower scoring chunk
            const existingIndex = filtered.indexOf(existingChunk);
            if (existingIndex > -1) {
              filtered.splice(existingIndex, 1);
            }
          }
        }
      }
      
      if (shouldAdd) {
        filtered.push(chunk);
      }
    }
    
    return filtered;
  }

  private chunksOverlap(chunk1: Chunk, chunk2: Chunk): boolean {
    // Same document and overlapping pages/times
    if (chunk1.documentId !== chunk2.documentId) {
      return false;
    }

    // Check page overlap
    if (chunk1.startPage && chunk2.startPage) {
      const chunk1End = chunk1.endPage || chunk1.startPage;
      const chunk2End = chunk2.endPage || chunk2.startPage;
      
      return !(chunk1End < chunk2.startPage || chunk2End < chunk1.startPage);
    }

    // Check time overlap
    if (chunk1.startTime && chunk2.startTime) {
      const chunk1EndTime = chunk1.endTime || chunk1.startTime;
      const chunk2EndTime = chunk2.endTime || chunk2.startTime;
      
      const chunk1Start = parseFloat(chunk1.startTime.toString());
      const chunk1End = parseFloat(chunk1EndTime.toString());
      const chunk2Start = parseFloat(chunk2.startTime.toString());
      const chunk2End = parseFloat(chunk2EndTime.toString());
      
      return !(chunk1End < chunk2Start || chunk2End < chunk1Start);
    }

    // Check text similarity for potential duplicates
    const similarity = this.calculateTextSimilarity(chunk1.text, chunk2.text);
    return similarity > 0.8;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  async generateSummary(documentIds: string[]): Promise<{
    summary: string[];
    quizIdeas: string[];
  }> {
    try {
      // Get representative chunks from each document
      const allChunks: Chunk[] = [];
      for (const documentId of documentIds) {
        const chunks = await storage.getDocumentChunks(documentId);
        // Take every 5th chunk for summary to get good coverage
        const sampleChunks = chunks.filter((_, index) => index % 5 === 0).slice(0, 10);
        allChunks.push(...sampleChunks);
      }

      const contextText = this.buildContextText(allChunks);
      
      const prompt = `Role: DocChatSummarizer
Input: Retrieved chunks.
Task: Produce 5–8 bullets strictly from context. Then add 2–3 "Potential quiz ideas".
Flag contradictions as: "Note: conflicting sources" with citations.

Context:
${contextText}

Output JSON format:
{ "summary": ["bullet 1", "bullet 2", ...], "quiz_ideas": ["idea 1", "idea 2", ...] }`;

      const response = await openaiService.chatCompletion(
        [
          {
            role: "system",
            content: "You are a document summarizer. Analyze the provided context and create a concise summary with quiz ideas."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        {
          responseFormat: { type: "json_object" },
          maxTokens: 800,
        }
      );

      const parsed = JSON.parse(response.content);
      return {
        summary: parsed.summary || [],
        quizIdeas: parsed.quiz_ideas || [],
      };
    } catch (error) {
      console.error("Failed to generate summary:", error);
      throw error;
    }
  }

  async extractHighlights(documentIds: string[]): Promise<Array<{
    text: string;
    source: string;
    page?: number;
    time?: number;
  }>> {
    try {
      // Get all chunks and find the most important ones
      const allChunks: Chunk[] = [];
      for (const documentId of documentIds) {
        const chunks = await storage.getDocumentChunks(documentId);
        allChunks.push(...chunks);
      }

      // For highlights, we'll use a simple approach of finding chunks with important keywords
      const highlights = allChunks
        .filter(chunk => this.isHighlightWorthy(chunk.text))
        .slice(0, 6)
        .map(chunk => ({
          text: chunk.text.length > 200 ? chunk.text.substring(0, 200) + "..." : chunk.text,
          source: `Document ${chunk.documentId}`,
          page: chunk.startPage,
          time: chunk.startTime ? parseFloat(chunk.startTime.toString()) : undefined,
        }));

      return highlights;
    } catch (error) {
      console.error("Failed to extract highlights:", error);
      throw error;
    }
  }

  private isHighlightWorthy(text: string): boolean {
    const importantKeywords = [
      'important', 'key', 'main', 'primary', 'essential', 'crucial', 'significant',
      'conclusion', 'summary', 'in conclusion', 'therefore', 'result',
      'definition', 'means', 'refers to', 'defined as',
      'first', 'second', 'third', 'finally', 'steps', 'process'
    ];
    
    const lowerText = text.toLowerCase();
    return importantKeywords.some(keyword => lowerText.includes(keyword)) ||
           text.length > 100; // Longer chunks are more likely to be substantial
  }
}

export const ragService = new RAGService();
