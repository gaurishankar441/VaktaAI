import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

export interface ChatResponse {
  content: string;
  tokens: number;
}

export interface StreamingChatOptions {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  onToken?: (token: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
}

export class OpenAIService {
  async createEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      // Validate input text
      if (!text || text.trim().length === 0) {
        console.warn("Empty text provided for embedding");
        // Return a zero vector for empty text
        return {
          embedding: new Array(1536).fill(0), // text-embedding-3-small has 1536 dimensions
          tokens: 0,
        };
      }
      
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
      });

      return {
        embedding: response.data[0].embedding,
        tokens: response.usage?.total_tokens || 0,
      };
    } catch (error) {
      console.error("OpenAI embedding error:", error);
      throw new Error(`Failed to create embedding: ${error.message}`);
    }
  }

  async createBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      // Filter out empty or whitespace-only texts
      const validTexts = texts.filter(text => text && text.trim().length > 0);
      
      // Return empty results if no valid texts
      if (validTexts.length === 0) {
        console.warn("No valid texts provided for batch embeddings");
        return [];
      }
      
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: validTexts,
        encoding_format: "float",
      });

      return response.data.map((item, index) => ({
        embedding: item.embedding,
        tokens: Math.floor((response.usage?.total_tokens || 0) / validTexts.length),
      }));
    } catch (error) {
      console.error("OpenAI batch embedding error:", error);
      throw new Error(`Failed to create batch embeddings: ${error.message}`);
    }
  }

  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    options: {
      model?: string;
      responseFormat?: { type: "json_object" };
      maxTokens?: number;
    } = {}
  ): Promise<ChatResponse> {
    try {
      console.log("[OpenAI] Calling chat completion with model:", options.model || "gpt-5");
      console.log("[OpenAI] Response format:", options.responseFormat?.type || "text");
      console.log("[OpenAI] Max tokens:", options.maxTokens || "default");
      
      const response = await openai.chat.completions.create({
        model: options.model || "gpt-5",
        messages: messages as any,
        response_format: options.responseFormat,
        max_completion_tokens: options.maxTokens,
      });

      console.log("[OpenAI] Response received");
      console.log("[OpenAI] Finish reason:", response.choices[0].finish_reason);
      console.log("[OpenAI] Content length:", response.choices[0].message.content?.length || 0);
      console.log("[OpenAI] Tokens used:", response.usage?.total_tokens || 0);

      const content = response.choices[0].message.content || "";
      const finishReason = response.choices[0].finish_reason;
      
      // If finish reason is "length", the response was cut off
      if (finishReason === "length") {
        console.warn("[OpenAI] Response was truncated due to length limit");
        console.warn("[OpenAI] Partial content length:", content?.length || 0);
        console.warn("[OpenAI] Content preview:", content?.substring(0, 200));
        
        // For JSON responses, try to repair/complete the JSON
        if (options.responseFormat?.type === 'json_object' && content) {
          // Return the partial content - the caller will handle JSON parsing
          return {
            content: content,
            tokens: response.usage?.total_tokens || 0,
            truncated: true,
          };
        }
        
        // For text responses, append a note about truncation
        if (content && content.trim().length > 0) {
          return {
            content: content + "\n\n[Response was truncated due to length limit]",
            tokens: response.usage?.total_tokens || 0,
            truncated: true,
          };
        }
        
        // If no content at all, return a fallback message
        return {
          content: "The response was too long and could not be completed. Please try a more specific query.",
          tokens: response.usage?.total_tokens || 0,
          truncated: true,
        };
      }
      
      if (!content || content.trim().length === 0) {
        console.error("[OpenAI] Empty content received! Finish reason:", finishReason);
        throw new Error(`OpenAI returned empty content. Finish reason: ${finishReason}`);
      }

      return {
        content,
        tokens: response.usage?.total_tokens || 0,
      };
    } catch (error) {
      console.error("[OpenAI] Chat completion error:", error);
      throw new Error(`Failed to complete chat: ${error.message}`);
    }
  }

  async *streamChatCompletion(
    messages: Array<{ role: string; content: string }>,
    options: {
      model?: string;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    try {
      const stream = await openai.chat.completions.create({
        model: options.model || "gpt-5",
        messages: messages as any,
        stream: true,
        max_completion_tokens: options.maxTokens,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    } catch (error) {
      console.error("OpenAI streaming error:", error);
      throw new Error(`Failed to stream chat: ${error.message}`);
    }
  }

  async createStreamingResponse(
    messages: Array<{ role: string; content: string }>,
    res: any,
    options: {
      model?: string;
      maxTokens?: number;
    } = {}
  ): Promise<void> {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    try {
      let fullContent = '';
      
      for await (const token of this.streamChatCompletion(messages, options)) {
        fullContent += token;
        res.write(`data: ${JSON.stringify({ token, type: 'token' })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ content: fullContent, type: 'complete' })}\n\n`);
      res.write('data: [DONE]\n\n');
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message, type: 'error' })}\n\n`);
    } finally {
      res.end();
    }
  }
}

export const openaiService = new OpenAIService();
