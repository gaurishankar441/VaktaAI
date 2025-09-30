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
        const errorMessage = error instanceof Error ? error.message : String(error);
        await storage.updateDocument(document.id, {
          status: 'failed',
          processingError: errorMessage,
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

      // Update document with extracted metadata
      await storage.updateDocument(document.id, {
        metadata: metadata,
      });

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
    console.log("[PDF] Extracting from PDF:", url);
    
    try {
      // Import pdf-parse dynamically
      const pdfParse = (await import('pdf-parse')).default;
      
      // Fetch the PDF file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      
      // Get the PDF as a buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log("[PDF] Parsing PDF buffer, size:", buffer.length);
      
      // Parse the PDF
      const data = await pdfParse(buffer);
      
      console.log("[PDF] Extracted text length:", data.text.length);
      console.log("[PDF] Number of pages:", data.numpages);
      console.log("[PDF] Preview:", data.text.substring(0, 200));
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error("No text could be extracted from PDF");
      }
      
      return {
        text: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info,
          extractedAt: new Date().toISOString(),
          method: 'pdf-parse',
          version: data.version
        }
      };
    } catch (error) {
      console.error("[PDF] Extraction failed:", error);
      throw new Error(`Failed to extract PDF content: ${error.message}`);
    }
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
    
    try {
      const videoId = this.extractYouTubeId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      let title = 'Unknown Title';
      let authorName = 'Unknown Author';
      let duration = 0;
      let description = '';

      // Try to get video metadata using youtubei.js
      try {
        const Innertube = (await import('youtubei.js')).default;
        const youtube = await Innertube.create();
        const videoInfo = await youtube.getInfo(videoId);

        title = videoInfo.basic_info.title || 'Unknown Title';
        // Author is an object in youtubei.js, extract name
        authorName = (videoInfo.basic_info.author as any)?.name || 
                          String(videoInfo.basic_info.author) || 
                          'Unknown Author';
        duration = videoInfo.basic_info.duration || 0;
        description = videoInfo.basic_info.short_description || '';
      } catch (metadataError) {
        console.warn("Failed to fetch YouTube metadata, using fallback:", metadataError);
        // Continue with default values
      }

      // Try to get transcript using youtube-transcript
      let transcript = '';
      try {
        const { YoutubeTranscript } = await import('youtube-transcript');
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        
        // Combine transcript items with timestamps (offset is already in seconds)
        transcript = transcriptItems
          .map(item => `[${this.formatTimestamp(item.offset)}] ${item.text}`)
          .join(' ');
      } catch (transcriptError) {
        console.warn("Failed to fetch YouTube transcript:", transcriptError);
        // Fallback: use video description if transcript is not available
        transcript = description || 
                    `Transcript not available for video: ${title}. This video may not have captions enabled or may have extraction restrictions.`;
      }

      // Ensure we have some content to process
      if (!transcript || transcript.trim().length === 0) {
        transcript = `YouTube video: ${title} by ${authorName}. No transcript available. ${description ? 'Description: ' + description : 'No description available.'}`;
      }

      return {
        text: transcript,
        metadata: {
          videoId,
          title,
          author: authorName,
          duration,
          transcript: transcript,
          extractedAt: new Date().toISOString(),
          method: 'youtube_transcript_api'
        }
      };
    } catch (error) {
      console.error("YouTube extraction failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract YouTube content: ${errorMessage}`);
    }
  }

  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private async extractFromURL(url: string): Promise<{ text: string; metadata: any }> {
    console.log("Extracting from URL:", url);
    
    try {
      // Validate URL and check for SSRF
      await this.validateUrlForSSRF(url);
      
      // Fetch the webpage with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      let html: string;
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }

        // Check content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('text/html')) {
          throw new Error(`Invalid content type: ${contentType}. Expected text/html`);
        }

        // Limit response size to 4MB
        const maxSize = 4 * 1024 * 1024; // 4MB
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > maxSize) {
          throw new Error(`Content too large: ${contentLength} bytes (max ${maxSize})`);
        }

        html = await response.text();
      } finally {
        clearTimeout(timeout);
      }

      // Parse with jsdom and use Readability for content extraction
      const { JSDOM } = await import('jsdom');
      const { Readability } = await import('@mozilla/readability');
      
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      // Extract additional metadata using cheerio for more control
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);
      
      let text = '';
      let title = 'Untitled';
      let author = 'Unknown Author';
      let description = '';
      
      if (article) {
        // Use Readability results if available
        text = article.textContent || '';
        title = article.title || $('title').text() || 'Untitled';
        author = article.byline || 
                      $('meta[name="author"]').attr('content') || 
                      $('meta[property="article:author"]').attr('content') || 
                      'Unknown Author';
        description = article.excerpt || 
                     $('meta[name="description"]').attr('content') || 
                     $('meta[property="og:description"]').attr('content') || '';
      } else {
        // Fallback: Extract text from body with cheerio
        console.warn("Readability failed, using fallback extraction");
        $('script, style, noscript, iframe').remove();
        text = $('body').text().replace(/\s+/g, ' ').trim();
        title = $('title').text() || 
               $('meta[property="og:title"]').attr('content') || 
               'Untitled';
        author = $('meta[name="author"]').attr('content') || 
                $('meta[property="article:author"]').attr('content') || 
                'Unknown Author';
        description = $('meta[name="description"]').attr('content') || 
                     $('meta[property="og:description"]').attr('content') || '';
      }
      
      const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                         $('meta[name="publish_date"]').attr('content') ||
                         $('time[datetime]').attr('datetime');
      
      return {
        text: text.trim(),
        metadata: {
          url,
          title,
          author,
          publishDate,
          description,
          siteName: $('meta[property="og:site_name"]').attr('content'),
          extractedAt: new Date().toISOString(),
          method: 'readability_cheerio'
        }
      };
    } catch (error) {
      console.error("URL extraction failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract web content: ${errorMessage}`);
    }
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
    // Match various YouTube URL formats: watch, youtu.be, embed, shorts, live
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,           // youtube.com/watch?v=VIDEO_ID
      /(?:youtu\.be\/)([^&\n?#]+)/,                       // youtu.be/VIDEO_ID
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,             // youtube.com/embed/VIDEO_ID
      /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,            // youtube.com/shorts/VIDEO_ID
      /(?:youtube\.com\/live\/)([^&\n?#]+)/,              // youtube.com/live/VIDEO_ID
      /(?:youtube\.com\/v\/)([^&\n?#]+)/,                 // youtube.com/v/VIDEO_ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return '';
  }

  private async validateUrlForSSRF(url: string): Promise<void> {
    // Parse URL
    const parsed = new URL(url);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Invalid protocol: ${parsed.protocol}. Only http and https are allowed.`);
    }
    
    // Block .onion and local/private URLs
    const hostname = parsed.hostname.toLowerCase();
    
    // Block .onion (Tor)
    if (hostname.endsWith('.onion')) {
      throw new Error('Onion addresses are not allowed');
    }
    
    // Block localhost variations
    if (hostname === 'localhost' || hostname.startsWith('localhost.')) {
      throw new Error('Localhost addresses are not allowed');
    }
    
    // Resolve DNS to check for private/loopback IPs
    try {
      const dns = await import('dns/promises');
      const addresses = await dns.resolve(hostname);
      
      for (const address of addresses) {
        // Block loopback (127.0.0.0/8, ::1)
        if (address.startsWith('127.') || address === '::1') {
          throw new Error(`Loopback IP addresses are not allowed: ${address}`);
        }
        
        // Block private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
        if (address.startsWith('10.') || 
            address.startsWith('192.168.') ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(address)) {
          throw new Error(`Private IP addresses are not allowed: ${address}`);
        }
        
        // Block link-local (169.254.0.0/16, fe80::/10)
        if (address.startsWith('169.254.') || address.toLowerCase().startsWith('fe80:')) {
          throw new Error(`Link-local IP addresses are not allowed: ${address}`);
        }
      }
    } catch (error) {
      // If DNS resolution fails, allow the request (fetch will fail anyway if unreachable)
      if (error instanceof Error && error.message.includes('not allowed')) {
        throw error; // Re-throw validation errors
      }
      console.warn('DNS resolution failed for', hostname, error);
    }
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
