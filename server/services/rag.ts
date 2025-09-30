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
    documentId: string;
    documentTitle?: string;
    page?: number;
    time?: number;
    relevanceScore?: number;
  }>;
  documentSources?: Array<{
    documentId: string;
    title: string;
    relevanceScore: number;
    chunkCount: number;
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
        return { chunks: [], citations: [], documentSources: [] };
      }

      // Step 2: Rerank with Cohere
      const rerankedChunks = await cohereService.rerankChunks(
        query,
        candidateChunks,
        topK
      );

      // Step 3: Filter overlapping chunks and build citations with document metadata
      const finalChunks = this.filterOverlappingChunks(rerankedChunks.slice(0, topK));
      
      // Get document metadata for richer citations (only for documents that appear in finalChunks)
      const uniqueDocIds = Array.from(new Set(finalChunks.map(c => c.documentId)));
      const documentMetadata = new Map();
      await Promise.all(
        uniqueDocIds.map(async (documentId) => {
          const doc = await storage.getDocument(documentId);
          if (doc) {
            documentMetadata.set(documentId, doc);
          }
        })
      );
      
      const citations = finalChunks.map(chunk => {
        const doc = documentMetadata.get(chunk.documentId);
        return {
          chunkId: chunk.id,
          source: doc?.title || `Document ${chunk.documentId}`,
          documentId: chunk.documentId,
          documentTitle: doc?.title,
          page: chunk.startPage ?? undefined,
          time: chunk.startTime ? parseFloat(chunk.startTime.toString()) : undefined,
          relevanceScore: (chunk as any).relevanceScore,
        };
      });

      // Step 4: Calculate document-level relevance scores
      const documentScores = this.calculateDocumentRelevance(finalChunks);
      const documentSources = Array.from(documentScores.entries()).map(([docId, stats]) => ({
        documentId: docId,
        title: documentMetadata.get(docId)?.title || `Document ${docId}`,
        relevanceScore: stats.avgScore,
        chunkCount: stats.count,
      })).sort((a, b) => {
        // Sort by relevance score first, then by chunk count as tie-breaker
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return b.chunkCount - a.chunkCount;
      });

      return {
        chunks: finalChunks,
        citations,
        documentSources,
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
    const { text: contextText, includedCount } = this.buildContextTextFromCitations(context.chunks, context.citations);
    
    // Only include citations for chunks that were actually included in the context
    const includedCitations = context.citations.slice(0, includedCount);
    
    const prompt = this.buildRAGPrompt(query, contextText);

    // 🎯 SMART TOKEN ALLOCATION with proper model limit calculation
    const MODEL_MAX_TOKENS = 128000; // GPT-5 has 128k context window
    const SAFETY_MARGIN = 500; // Buffer for token estimation errors
    const MIN_COMPLETION_TOKENS = 1000; // Minimum tokens needed for useful response
    
    // Estimate tokens for each component (rough: 1 token ≈ 4 chars)
    const systemMessage = "You are DocChatAssistant. Use only the provided context to answer questions with proper citations. Always respond in valid JSON format with keys: answer (string) and takeaways (array of strings).";
    const systemPromptTokens = Math.ceil(systemMessage.length / 4);
    const userPromptWithContextTokens = Math.ceil(prompt.length / 4); // Prompt already includes context + query
    
    // Total input tokens = system message + user prompt (which contains both query + context)
    const totalInputTokens = systemPromptTokens + userPromptWithContextTokens;
    
    // Calculate MAXIMUM available tokens for response
    let maxAvailableResponseTokens = MODEL_MAX_TOKENS - totalInputTokens - SAFETY_MARGIN;
    
    // Log breakdown for debugging
    const contextTokens = Math.ceil(contextText.length / 4);
    const queryTokens = Math.ceil(query.length / 4);
    console.log(`[RAG] Token breakdown: system=${systemPromptTokens}, query=${queryTokens}, context=${contextTokens}, total_input=${totalInputTokens}`);
    
    // Determine DESIRED response tokens based on query complexity and context richness
    const chunkCount = context.chunks.length;
    let desiredResponseTokens: number;
    
    // IMPORTANT: JSON responses need MORE tokens to complete the JSON structure properly
    // If we hit token limit mid-JSON, OpenAI returns empty content
    // Base allocation on query complexity (increased for JSON format)
    if (query.length < 50) {
      desiredResponseTokens = 2500; // Increased from 1500 for JSON overhead
    } else if (query.length < 150) {
      desiredResponseTokens = 3500; // Increased from 2500 for JSON overhead
    } else {
      desiredResponseTokens = 4500; // Increased from 3500 for JSON overhead
    }
    
    // Adjust based on context richness (more chunks = potentially more detailed answer)
    if (chunkCount >= 5 && contextTokens > 2000) {
      desiredResponseTokens += 1000; // Increased from 500
    } else if (chunkCount >= 3) {
      desiredResponseTokens += 500; // Increased from 250
    }
    
    // Extra buffer for small contexts to ensure JSON completion
    if (chunkCount <= 2) {
      desiredResponseTokens += 500; // Extra buffer for small contexts
    }
    
    // CRITICAL: Strict clamp to prevent exceeding available budget
    // Use Math.min first to ensure we never exceed available, then clamp to minimum 1
    const dynamicMaxTokens = Math.max(1, Math.min(desiredResponseTokens, maxAvailableResponseTokens));
    
    // GUARD: Warn if insufficient tokens but proceed with what's available
    if (dynamicMaxTokens < MIN_COMPLETION_TOKENS) {
      console.warn(`[RAG] WARNING: Only ${dynamicMaxTokens} tokens available for response (need ${MIN_COMPLETION_TOKENS}). Context too large. Response may be abbreviated.`);
    }
    
    console.log(`[RAG] Token allocation: desired=${desiredResponseTokens}, available=${maxAvailableResponseTokens}, final=${dynamicMaxTokens} (${chunkCount} chunks)`);

    try {
      if (options.streaming && options.res) {
        // For streaming responses, pass token limit to prevent truncation
        await this.generateStreamingResponse(prompt, options.res, dynamicMaxTokens);
        return {
          answer: "Streaming response in progress",
          takeaways: [],
          citations: includedCitations,
          tokensUsed: 0,
        };
      } else {
        console.log("[RAG] Calling OpenAI chat completion...");
        const response = await openaiService.chatCompletion(
          [
            {
              role: "system",
              content: "You are DocChatAssistant. Use only the provided context to answer questions with proper citations. Always respond in valid JSON format with keys: answer (string) and takeaways (array of strings)."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          {
            responseFormat: { type: "json_object" },
            maxTokens: dynamicMaxTokens,
          }
        );

        console.log("[RAG] OpenAI response received, length:", response.content?.length || 0);
        console.log("[RAG] Response preview:", response.content?.substring(0, 200));

        // Try to parse JSON, fallback to plain text if it fails
        let parsedResponse;
        try {
          if (!response.content || response.content.trim().length === 0) {
            throw new Error("Empty response from OpenAI");
          }
          parsedResponse = JSON.parse(response.content);
          console.log("[RAG] Successfully parsed JSON response");
        } catch (parseError) {
          const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
          console.warn("[RAG] Failed to parse OpenAI response as JSON:", errorMsg);
          console.log("[RAG] Raw content:", response.content);
          // If response.content has actual content, use it
          if (response.content && response.content.trim().length > 0) {
            parsedResponse = {
              answer: response.content,
              takeaways: []
            };
          } else {
            // If no content at all, generate a helpful message
            parsedResponse = {
              answer: "I apologize, but I couldn't generate a response. Please try rephrasing your question or check if the document has been properly processed.",
              takeaways: []
            };
          }
        }
        
        const finalAnswer = parsedResponse.answer || "No answer could be generated from the provided context.";
        console.log("[RAG] Final answer length:", finalAnswer.length);
        
        return {
          answer: finalAnswer,
          takeaways: Array.isArray(parsedResponse.takeaways) ? parsedResponse.takeaways : [],
          citations: includedCitations,
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
    res: any,
    maxTokens?: number
  ): Promise<void> {
    // Use same system prompt as non-streaming for consistent token estimation
    const messages = [
      {
        role: "system",
        content: "You are DocChatAssistant. Use only the provided context to answer questions with proper citations. Always respond in valid JSON format with keys: answer (string) and takeaways (array of strings)."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    await openaiService.createStreamingResponse(messages, res, { maxTokens });
  }

  private buildContextTextFromCitations(chunks: Chunk[], citations: RAGContext['citations']): { text: string; includedCount: number } {
    // Use citations which already have document titles
    // Reserve 2000 tokens for system messages, user query, and completion
    const TOKEN_HEADROOM = 2000;
    const effectiveLimit = this.MAX_CONTEXT_LENGTH - TOKEN_HEADROOM;
    
    let totalLength = 0;
    const contextParts: string[] = [];
    let includedCount = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const citation = citations[i];
      
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

      const contextPart = `---
Source: ${citation.documentTitle || citation.source}${sourceMeta ? `, ${sourceMeta}` : ''}
Text: ${chunk.text}
---`;

      // Estimate token count (rough: 1 token ≈ 4 chars)
      const estimatedTokens = contextPart.length / 4;
      if (totalLength + estimatedTokens > effectiveLimit) {
        break; // Stop adding chunks if we exceed max context
      }
      
      contextParts.push(contextPart);
      totalLength += estimatedTokens;
      includedCount++;
    }

    return { text: contextParts.join('\n\n'), includedCount };
  }

  private async buildContextText(chunks: Chunk[]): Promise<string> {
    // Get document metadata for titles
    const documentMetadata = new Map();
    const uniqueDocIds = Array.from(new Set(chunks.map(c => c.documentId)));
    for (const documentId of uniqueDocIds) {
      const doc = await storage.getDocument(documentId);
      if (doc) {
        documentMetadata.set(documentId, doc);
      }
    }

    return chunks.map((chunk, index) => {
      const doc = documentMetadata.get(chunk.documentId);
      const docTitle = doc?.title || `Document ${chunk.documentId}`;
      
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
Source: ${docTitle}${sourceMeta ? `, ${sourceMeta}` : ''}
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
    
    const words1Array = Array.from(words1);
    const intersection = new Set(words1Array.filter(x => words2.has(x)));
    const union = new Set([...words1Array, ...Array.from(words2)]);
    
    return intersection.size / union.size;
  }

  private calculateDocumentRelevance(chunks: Chunk[]): Map<string, { avgScore: number; count: number }> {
    const documentStats = new Map<string, { totalScore: number; count: number }>();
    
    for (const chunk of chunks) {
      const score = (chunk as any).relevanceScore || 0;
      const existing = documentStats.get(chunk.documentId);
      
      if (existing) {
        existing.totalScore += score;
        existing.count += 1;
      } else {
        documentStats.set(chunk.documentId, { totalScore: score, count: 1 });
      }
    }
    
    // Convert to average scores
    const result = new Map<string, { avgScore: number; count: number }>();
    const entries = Array.from(documentStats.entries());
    for (const [docId, stats] of entries) {
      result.set(docId, {
        avgScore: stats.totalScore / stats.count,
        count: stats.count,
      });
    }
    
    return result;
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

      const contextText = await this.buildContextText(allChunks);
      
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
          page: chunk.startPage ?? undefined,
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
