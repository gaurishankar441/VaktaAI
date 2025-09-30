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
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
        encoding_format: "float",
      });

      return response.data.map((item, index) => ({
        embedding: item.embedding,
        tokens: Math.floor((response.usage?.total_tokens || 0) / texts.length),
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
      const response = await openai.chat.completions.create({
        model: options.model || "gpt-5",
        messages: messages as any,
        response_format: options.responseFormat,
        max_completion_tokens: options.maxTokens,
      });

      return {
        content: response.choices[0].message.content || "",
        tokens: response.usage?.total_tokens || 0,
      };
    } catch (error) {
      console.error("OpenAI chat completion error:", error);
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
