import { openaiService } from './openai.js';
import { storage } from '../storage.js';
import type { 
  FlashcardDeck, 
  Flashcard, 
  FlashcardReview,
  InsertFlashcardDeck, 
  InsertFlashcard, 
  InsertFlashcardReview,
  Chunk 
} from '@shared/schema';

export interface GeneratedFlashcard {
  front: string;
  back: string;
  cloze?: string;
  interval_days?: number;
  ease?: number;
  due_at?: string;
  citations: Array<{
    source: string;
    page?: number;
    time?: number;
  }>;
}

export interface FlashcardGenerationOptions {
  documentIds: string[];
  numberOfCards: number;
  title?: string;
  cardType?: 'standard' | 'cloze';
}

export interface SRSUpdateResult {
  newInterval: number;
  newEase: number;
  newDueDate: Date;
}

export class FlashcardGeneratorService {
  async generateFlashcardDeck(
    userId: string,
    options: FlashcardGenerationOptions
  ): Promise<FlashcardDeck> {
    try {
      const { documentIds, numberOfCards, title, cardType = 'standard' } = options;

      // Get context from documents
      const context = await this.getFlashcardContext(documentIds);
      
      // Generate flashcards
      const generatedCards = await this.generateFlashcards(
        context,
        numberOfCards,
        cardType
      );

      // Create deck in database
      const deckData: InsertFlashcardDeck = {
        userId,
        documentId: documentIds[0], // Primary document
        title: title || `Flashcards from ${documentIds.length} document(s)`,
        description: `Generated flashcard deck with ${generatedCards.length} cards`,
        totalCards: generatedCards.length,
      };

      const deck = await storage.createFlashcardDeck(deckData);

      // Create flashcards
      for (let i = 0; i < generatedCards.length; i++) {
        const card = generatedCards[i];
        
        const cardData: InsertFlashcard = {
          deckId: deck.id,
          front: card.front,
          back: card.back,
          clozeText: card.cloze,
          citations: card.citations,
          intervalDays: card.interval_days || 1,
          ease: card.ease ? parseFloat(card.ease.toString()) : 2.5,
          dueAt: card.due_at ? new Date(card.due_at) : new Date(),
          orderIndex: i + 1,
        };

        await storage.createFlashcard(cardData);
      }

      return deck;
    } catch (error) {
      console.error("Failed to generate flashcard deck:", error);
      throw error;
    }
  }

  async getFlashcardDeck(deckId: string): Promise<{
    deck: FlashcardDeck;
    flashcards: Flashcard[];
  } | null> {
    try {
      const deck = await storage.getFlashcardDeck(deckId);
      if (!deck) return null;

      const flashcards = await storage.getDeckFlashcards(deckId);
      
      return { deck, flashcards };
    } catch (error) {
      console.error("Failed to get flashcard deck:", error);
      throw error;
    }
  }

  async getUserFlashcardDecks(userId: string): Promise<FlashcardDeck[]> {
    try {
      return await storage.getUserFlashcardDecks(userId);
    } catch (error) {
      console.error("Failed to get user flashcard decks:", error);
      throw error;
    }
  }

  async getDueFlashcards(userId: string, deckId?: string): Promise<Flashcard[]> {
    try {
      return await storage.getDueFlashcards(userId, deckId);
    } catch (error) {
      console.error("Failed to get due flashcards:", error);
      throw error;
    }
  }

  async reviewFlashcard(
    userId: string,
    flashcardId: string,
    rating: 'again' | 'hard' | 'good' | 'easy'
  ): Promise<SRSUpdateResult> {
    try {
      const flashcard = await storage.getFlashcard(flashcardId);
      if (!flashcard) {
        throw new Error("Flashcard not found");
      }

      const currentInterval = flashcard.intervalDays || 1;
      const currentEase = parseFloat(flashcard.ease?.toString() || '2.5');
      
      // Calculate new SRS values based on SM-2 algorithm
      const srsResult = this.calculateSRS(currentInterval, currentEase, rating);

      // Update flashcard
      await storage.updateFlashcard(flashcardId, {
        intervalDays: srsResult.newInterval,
        ease: srsResult.newEase,
        dueAt: srsResult.newDueDate,
        reviews: (flashcard.reviews || 0) + 1,
        lapses: rating === 'again' ? (flashcard.lapses || 0) + 1 : flashcard.lapses,
      });

      // Save review record
      const reviewData: InsertFlashcardReview = {
        userId,
        flashcardId,
        rating,
        previousInterval: currentInterval,
        newInterval: srsResult.newInterval,
        previousEase: currentEase,
        newEase: srsResult.newEase,
      };

      await storage.createFlashcardReview(reviewData);

      return srsResult;
    } catch (error) {
      console.error("Failed to review flashcard:", error);
      throw error;
    }
  }

  async getFlashcardStats(userId: string): Promise<{
    total: number;
    due: number;
    learning: number;
    mastered: number;
  }> {
    try {
      const allDecks = await storage.getUserFlashcardDecks(userId);
      const dueCards = await storage.getDueFlashcards(userId);
      
      let total = 0;
      let learning = 0;
      let mastered = 0;

      for (const deck of allDecks) {
        const cards = await storage.getDeckFlashcards(deck.id);
        total += cards.length;
        
        for (const card of cards) {
          const reviews = card.reviews || 0;
          const interval = card.intervalDays || 1;
          
          if (reviews >= 3 && interval >= 21) {
            mastered++;
          } else if (reviews > 0) {
            learning++;
          }
        }
      }

      return {
        total,
        due: dueCards.length,
        learning,
        mastered,
      };
    } catch (error) {
      console.error("Failed to get flashcard stats:", error);
      throw error;
    }
  }

  private async getFlashcardContext(documentIds: string[]): Promise<Chunk[]> {
    const allChunks: Chunk[] = [];
    
    for (const documentId of documentIds) {
      const chunks = await storage.getDocumentChunks(documentId);
      // Sample chunks for flashcard generation (every 4th chunk for focused content)
      const sampleChunks = chunks.filter((_, index) => index % 4 === 0);
      allChunks.push(...sampleChunks);
    }

    return allChunks;
  }

  private async generateFlashcards(
    context: Chunk[],
    numberOfCards: number,
    cardType: 'standard' | 'cloze'
  ): Promise<GeneratedFlashcard[]> {
    const contextText = context.map((chunk, index) => {
      let sourceMeta = "";
      if (chunk.startPage) {
        sourceMeta = `page ${chunk.startPage}`;
      } else if (chunk.startTime) {
        const minutes = Math.floor(parseFloat(chunk.startTime.toString()) / 60);
        const seconds = Math.floor(parseFloat(chunk.startTime.toString()) % 60);
        sourceMeta = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }

      return `Source ${index + 1}: Document ${chunk.documentId}, ${sourceMeta}
Text: ${chunk.text}`;
    }).join('\n\n');

    const prompt = cardType === 'cloze' 
      ? this.buildClozePrompt(contextText, numberOfCards)
      : this.buildStandardPrompt(contextText, numberOfCards);

    try {
      const response = await openaiService.chatCompletion(
        [
          {
            role: "system",
            content: "You are QuizFlashGen, an expert at creating educational flashcards from document content. Always return valid JSON arrays."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        {
          responseFormat: { type: "json_object" },
          maxTokens: 2000,
        }
      );

      // Parse the response
      let flashcards: GeneratedFlashcard[];
      const parsed = JSON.parse(response.content);
      
      if (Array.isArray(parsed)) {
        flashcards = parsed;
      } else if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
        flashcards = parsed.flashcards;
      } else {
        throw new Error("Invalid response format from flashcard generator");
      }

      // Validate and clean up flashcards
      return flashcards.slice(0, numberOfCards).map(card => ({
        front: card.front || "Generated question",
        back: card.back || "Generated answer",
        cloze: card.cloze,
        interval_days: card.interval_days || 1,
        ease: card.ease || 2.5,
        due_at: card.due_at,
        citations: Array.isArray(card.citations) ? card.citations : [],
      }));
    } catch (error) {
      console.error("Failed to generate flashcards:", error);
      throw new Error("Failed to generate flashcards: " + error.message);
    }
  }

  private buildStandardPrompt(contextText: string, numberOfCards: number): string {
    return `Role: QuizFlashGen
Mode: flashcard
Context: ${contextText}

Produce ${numberOfCards} flashcards:
- front (question or concept)
- back (concise explanation)
- optional: srs fields (interval_days, ease, due_at)
- citations [{"source": "Document ID", "page": number}]

Return strict JSON array format:
[{
  "front": "What is...",
  "back": "Detailed explanation...",
  "interval_days": 1,
  "ease": 2.5,
  "citations": [{"source": "Document ID", "page": 1}]
}]`;
  }

  private buildClozePrompt(contextText: string, numberOfCards: number): string {
    return `Role: QuizFlashGen
Mode: flashcard (cloze deletion)
Context: ${contextText}

Produce ${numberOfCards} cloze deletion flashcards:
- front (sentence with [...] for missing word/phrase)
- back (the missing word/phrase with context)
- cloze (the complete sentence)
- citations

Return strict JSON array format:
[{
  "front": "The capital of France is [...]",
  "back": "Paris",
  "cloze": "The capital of France is Paris",
  "citations": [{"source": "Document ID", "page": 1}]
}]`;
  }

  private calculateSRS(
    currentInterval: number,
    currentEase: number,
    rating: 'again' | 'hard' | 'good' | 'easy'
  ): SRSUpdateResult {
    let newInterval = currentInterval;
    let newEase = currentEase;

    // SM-2 algorithm implementation
    switch (rating) {
      case 'again':
        newInterval = 1;
        newEase = Math.max(1.3, currentEase - 0.2);
        break;
      
      case 'hard':
        newInterval = Math.max(1, Math.floor(currentInterval * 1.2));
        newEase = Math.max(1.3, currentEase - 0.15);
        break;
      
      case 'good':
        if (currentInterval === 1) {
          newInterval = 6;
        } else if (currentInterval === 6) {
          newInterval = 16;
        } else {
          newInterval = Math.floor(currentInterval * currentEase);
        }
        break;
      
      case 'easy':
        if (currentInterval === 1) {
          newInterval = 4;
        } else {
          newInterval = Math.floor(currentInterval * currentEase * 1.3);
        }
        newEase = currentEase + 0.15;
        break;
    }

    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + newInterval);

    return {
      newInterval,
      newEase,
      newDueDate,
    };
  }

  async deleteFlashcardDeck(deckId: string): Promise<void> {
    try {
      await storage.deleteFlashcardDeck(deckId);
    } catch (error) {
      console.error("Failed to delete flashcard deck:", error);
      throw error;
    }
  }
}

export const flashcardGeneratorService = new FlashcardGeneratorService();
