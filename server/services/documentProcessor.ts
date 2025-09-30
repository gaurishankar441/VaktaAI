import { openaiService } from './openai.js';
import { embeddingService } from './embeddings.js';
import { storage } from '../storage.js';
import type { Document, InsertDocument, InsertChunk, File } from '@shared/schema';
import { ObjectStorageService } from '../objectStorage.js';

export interface ProcessingResult {
  document: Document;
  chunksCreated: number;
  vectorsStored: number;
  processingTime: number;
}

export interface ChunkData {
  text: string;
  startPage?: number;
  endPage?: number;
  startTime?: number;
  endTime?: number;
  metadata?: any;
}

export class DocumentProcessorService {
  private objectStorage: ObjectStorageService;

  constructor() {
    this.objectStorage = new ObjectStorageService();
  }

  async processDocument(
    userId: string,
    fileId: string,
    sourceType: 'pdf' | 'pptx' | 'docx' | 'mp3' | 'mp4' | 'youtube' | 'url',
    sourceUrl: string,
    title: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Create document record
      const documentData: InsertDocument = {
        userId,
        fileId: sourceType === 'youtube' || sourceType === 'url' ? undefined : fileId,
        sourceType,
        sourceUrl,
        title,
        status: 'processing',
        metadata: {},
      };

      const document = await storage.createDocument(documentData);

      try {
        // Extract text and create chunks
        const chunks = await this.extractAndChunkDocument(document, sourceUrl, sourceType);
        
        // Create embeddings
        const chunksWithEmbeddings = await embeddingService.createChunkEmbeddings(chunks);
        
        // Store in vector database
        await embeddingService.storeChunkEmbeddings(chunksWithEmbeddings, document.id);

        // Update document status
        await storage.updateDocument(document.id, {
          status: 'indexed',
          totalChunks: chunks.length,
          totalPages: this.calculateTotalPages(chunks),
        });

        const processingTime = Date.now() - startTime;

        return {
          document: await storage.getDocument(document.id) as Document,
          chunksCreated: chunks.length,
          vectorsStored: chunksWithEmbeddings.length,
          processingTime,
        };
      } catch (error) {
        // Update document with error status
        await storage.updateDocument(document.id, {
          status: 'failed',
          processingError: error.message,
        });
        throw error;
      }
    } catch (error) {
      console.error("Failed to process document:", error);
      throw error;
    }
  }

  async reprocessDocument(documentId: string): Promise<ProcessingResult> {
    try {
      const document = await storage.getDocument(documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Delete existing chunks and embeddings
      await storage.deleteDocumentChunks(documentId);
      await embeddingService.deleteDocumentEmbeddings(documentId);

      // Reprocess
      return await this.processDocument(
        document.userId,
        document.fileId || '',
        document.sourceType,
        document.sourceUrl || '',
        document.title
      );
    } catch (error) {
      console.error("Failed to reprocess document:", error);
      throw error;
    }
  }

  async getProcessingStatus(documentId: string): Promise<{
    status: string;
    progress?: number;
    error?: string;
  }> {
    try {
      const document = await storage.getDocument(documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      return {
        status: document.status,
        error: document.processingError || undefined,
      };
    } catch (error) {
      console.error("Failed to get processing status:", error);
      throw error;
    }
  }

  private async extractAndChunkDocument(
    document: Document,
    sourceUrl: string,
    sourceType: string
  ): Promise<any[]> {
    let extractedText: string;
    let metadata: any = {};

    try {
      switch (sourceType) {
        case 'pdf':
          ({ text: extractedText, metadata } = await this.extractFromPDF(sourceUrl));
          break;
        case 'pptx':
          ({ text: extractedText, metadata } = await this.extractFromPPTX(sourceUrl));
          break;
        case 'docx':
          ({ text: extractedText, metadata } = await this.extractFromDOCX(sourceUrl));
          break;
        case 'mp3':
        case 'mp4':
          ({ text: extractedText, metadata } = await this.extractFromAudio(sourceUrl));
          break;
        case 'youtube':
          ({ text: extractedText, metadata } = await this.extractFromYouTube(sourceUrl));
          break;
        case 'url':
          ({ text: extractedText, metadata } = await this.extractFromURL(sourceUrl));
          break;
        default:
          throw new Error(`Unsupported source type: ${sourceType}`);
      }

      // Create chunks
      const chunkData = this.createChunks(extractedText, metadata, sourceType);
      
      // Store chunks in database
      const chunks = [];
      for (const chunk of chunkData) {
        const chunkRecord = await storage.createChunk({
          documentId: document.id,
          text: chunk.text,
          startPage: chunk.startPage,
          endPage: chunk.endPage,
          startTime: chunk.startTime ? chunk.startTime.toString() : undefined,
          endTime: chunk.endTime ? chunk.endTime.toString() : undefined,
          metadata: chunk.metadata,
        });
        chunks.push(chunkRecord);
      }

      return chunks;
    } catch (error) {
      console.error(`Failed to extract and chunk ${sourceType}:`, error);
      throw error;
    }
  }

  private async extractFromPDF(url: string): Promise<{ text: string; metadata: any }> {
    // In a real implementation, this would use libraries like pdf-parse or pdf2pic
    // For now, we'll simulate the extraction
    console.log("Extracting from PDF:", url);
    
    // Simulate PDF text extraction
    // In production, you would use libraries like:
    // - pdf-parse for text extraction
    // - pdf2pic for image extraction
    // - or external services like AWS Textract
    
    return {
      text: "Simulated PDF content extraction. In production, this would use pdf-parse or similar libraries to extract text from the PDF file.",
      metadata: {
        pages: 10,
        extractedAt: new Date().toISOString(),
        method: 'simulated_pdf_extraction'
      }
    };
  }

  private async extractFromPPTX(url: string): Promise<{ text: string; metadata: any }> {
    console.log("Extracting from PPTX:", url);
    
    // In production, use libraries like:
    // - officegen-pptx for parsing
    // - or external services
    
    return {
      text: "Simulated PPTX content extraction. In production, this would parse PowerPoint slides and extract text content.",
      metadata: {
        slides: 15,
        extractedAt: new Date().toISOString(),
        method: 'simulated_pptx_extraction'
      }
    };
  }

  private async extractFromDOCX(url: string): Promise<{ text: string; metadata: any }> {
    console.log("Extracting from DOCX:", url);
    
    // In production, use libraries like:
    // - mammoth for DOCX parsing
    // - docx-parser
    
    return {
      text: "Simulated DOCX content extraction. In production, this would use mammoth or similar libraries to extract text from Word documents.",
      metadata: {
        pages: 5,
        extractedAt: new Date().toISOString(),
        method: 'simulated_docx_extraction'
      }
    };
  }

  private async extractFromAudio(url: string): Promise<{ text: string; metadata: any }> {
    console.log("Extracting from audio:", url);
    
    // In production, this would use:
    // - OpenAI Whisper API for transcription
    // - AWS Transcribe
    // - Google Speech-to-Text
    
    try {
      // For audio files, we would typically use OpenAI's Whisper
      // const transcription = await openaiService.transcribeAudio(url);
      
      return {
        text: "Simulated audio transcription. In production, this would use OpenAI Whisper or similar speech-to-text services to transcribe audio content.",
        metadata: {
          duration: 1800, // 30 minutes
          extractedAt: new Date().toISOString(),
          method: 'simulated_audio_transcription'
        }
      };
    } catch (error) {
      console.error("Audio extraction failed:", error);
      throw error;
    }
  }

  private async extractFromYouTube(url: string): Promise<{ text: string; metadata: any }> {
    console.log("Extracting from YouTube:", url);
    
    // In production, this would:
    // 1. Extract video ID from URL
    // 2. Use YouTube API to get transcript/captions
    // 3. Or use youtube-dl + Whisper for transcription
    
    return {
      text: "Simulated YouTube transcript extraction. In production, this would use YouTube API for captions or youtube-dl + Whisper for transcription.",
      metadata: {
        videoId: this.extractYouTubeId(url),
        duration: 2400, // 40 minutes
        extractedAt: new Date().toISOString(),
        method: 'simulated_youtube_extraction'
      }
    };
  }

  private async extractFromURL(url: string): Promise<{ text: string; metadata: any }> {
    console.log("Extracting from URL:", url);
    
    // In production, this would:
    // 1. Fetch the webpage
    // 2. Parse HTML and extract main content
    // 3. Use libraries like cheerio, jsdom, or readability
    
    return {
      text: "Simulated web page content extraction. In production, this would fetch and parse web pages to extract main content.",
      metadata: {
        url,
        extractedAt: new Date().toISOString(),
        method: 'simulated_web_extraction'
      }
    };
  }

  private createChunks(text: string, metadata: any, sourceType: string): ChunkData[] {
    const maxChunkSize = 512; // tokens (approximately 400 words)
    const overlapSize = 64; // tokens
    
    // Split text into words for rough tokenization
    const words = text.split(/\s+/);
    const chunks: ChunkData[] = [];
    
    const wordsPerToken = 0.75; // Rough estimate
    const maxWordsPerChunk = Math.floor(maxChunkSize * wordsPerToken);
    const overlapWords = Math.floor(overlapSize * wordsPerToken);
    
    for (let i = 0; i < words.length; i += maxWordsPerChunk - overlapWords) {
      const chunkWords = words.slice(i, i + maxWordsPerChunk);
      const chunkText = chunkWords.join(' ');
      
      const chunk: ChunkData = {
        text: chunkText,
        metadata: {
          chunkIndex: chunks.length,
          sourceType,
          originalMetadata: metadata,
        },
      };

      // Add page/time information based on source type
      if (sourceType === 'pdf' || sourceType === 'pptx' || sourceType === 'docx') {
        // Estimate page numbers
        const estimatedPage = Math.floor(i / (words.length / (metadata.pages || 1))) + 1;
        chunk.startPage = estimatedPage;
        chunk.endPage = estimatedPage;
      } else if (sourceType === 'mp3' || sourceType === 'mp4' || sourceType === 'youtube') {
        // Estimate timestamps
        const totalDuration = metadata.duration || 3600; // Default 1 hour
        const startTime = (i / words.length) * totalDuration;
        const endTime = Math.min(((i + maxWordsPerChunk) / words.length) * totalDuration, totalDuration);
        chunk.startTime = startTime;
        chunk.endTime = endTime;
      }
      
      chunks.push(chunk);
    }
    
    return chunks;
  }

  private calculateTotalPages(chunks: any[]): number {
    const pageNumbers = chunks
      .map(chunk => chunk.endPage || chunk.startPage)
      .filter(page => page !== undefined);
    
    return pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
  }

  private extractYouTubeId(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : '';
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Delete embeddings
      await embeddingService.deleteDocumentEmbeddings(documentId);
      
      // Delete chunks
      await storage.deleteDocumentChunks(documentId);
      
      // Delete document
      await storage.deleteDocument(documentId);
    } catch (error) {
      console.error("Failed to delete document:", error);
      throw error;
    }
  }
}

export const documentProcessorService = new DocumentProcessorService();
