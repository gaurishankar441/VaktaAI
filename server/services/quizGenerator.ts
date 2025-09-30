import { openaiService } from './openai.js';
import { storage } from '../storage.js';
import { ragService } from './rag.js';
import type { 
  Quiz, 
  QuizQuestion, 
  QuizAttempt,
  InsertQuiz, 
  InsertQuizQuestion, 
  InsertQuizAttempt,
  Chunk 
} from '@shared/schema';

export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correct: string;
  rationale: string;
  bloom_level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  difficulty: 'easy' | 'medium' | 'hard';
  citations: Array<{
    source: string;
    page?: number;
    time?: number;
  }>;
}

export interface QuizGenerationOptions {
  documentIds: string[];
  numberOfQuestions: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  bloomLevels?: string[];
  title?: string;
}

export interface QuizAttemptResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: Record<string, {
    selected: string;
    correct: string;
    isCorrect: boolean;
    rationale: string;
  }>;
}

export class QuizGeneratorService {
  async generateQuiz(
    userId: string,
    options: QuizGenerationOptions
  ): Promise<Quiz> {
    try {
      const { documentIds, numberOfQuestions, title } = options;

      // Get context from documents
      const context = await this.getQuizContext(documentIds);
      
      // Generate quiz questions
      const generatedQuestions = await this.generateQuizQuestions(
        context,
        numberOfQuestions,
        options
      );

      // Create quiz in database
      const quizData: InsertQuiz = {
        userId,
        documentId: documentIds[0], // Primary document
        title: title || `Quiz from ${documentIds.length} document(s)`,
        description: `Generated quiz with ${numberOfQuestions} questions`,
        totalQuestions: generatedQuestions.length,
      };

      const quiz = await storage.createQuiz(quizData);

      // Create quiz questions
      for (let i = 0; i < generatedQuestions.length; i++) {
        const question = generatedQuestions[i];
        
        const questionData: InsertQuizQuestion = {
          quizId: quiz.id,
          question: question.question,
          options: question.options,
          correctAnswer: question.correct,
          rationale: question.rationale,
          difficulty: question.difficulty,
          bloomLevel: question.bloom_level,
          citations: question.citations,
          orderIndex: i + 1,
        };

        await storage.createQuizQuestion(questionData);
      }

      return quiz;
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      throw error;
    }
  }

  async getQuiz(quizId: string): Promise<{
    quiz: Quiz;
    questions: QuizQuestion[];
  } | null> {
    try {
      const quiz = await storage.getQuiz(quizId);
      if (!quiz) return null;

      const questions = await storage.getQuizQuestions(quizId);
      
      return { quiz, questions };
    } catch (error) {
      console.error("Failed to get quiz:", error);
      throw error;
    }
  }

  async getUserQuizzes(userId: string): Promise<Quiz[]> {
    try {
      return await storage.getUserQuizzes(userId);
    } catch (error) {
      console.error("Failed to get user quizzes:", error);
      throw error;
    }
  }

  async submitQuizAttempt(
    userId: string,
    quizId: string,
    answers: Record<string, string>,
    timeSpent?: number
  ): Promise<QuizAttemptResult> {
    try {
      const quizData = await this.getQuiz(quizId);
      if (!quizData) {
        throw new Error("Quiz not found");
      }

      const { quiz, questions } = quizData;
      
      // Calculate score and prepare detailed results
      let correctCount = 0;
      const detailedAnswers: Record<string, {
        selected: string;
        correct: string;
        isCorrect: boolean;
        rationale: string;
      }> = {};

      for (const question of questions) {
        const selectedAnswer = answers[question.id];
        const isCorrect = selectedAnswer === question.correctAnswer;
        
        if (isCorrect) {
          correctCount++;
        }

        detailedAnswers[question.id] = {
          selected: selectedAnswer || '',
          correct: question.correctAnswer,
          isCorrect,
          rationale: question.rationale,
        };
      }

      const score = correctCount;
      const totalQuestions = questions.length;
      const percentage = Math.round((score / totalQuestions) * 100);

      // Save quiz attempt
      const attemptData: InsertQuizAttempt = {
        userId,
        quizId,
        score,
        totalQuestions,
        answers: detailedAnswers,
        timeSpent,
      };

      await storage.createQuizAttempt(attemptData);

      return {
        score,
        totalQuestions,
        percentage,
        answers: detailedAnswers,
      };
    } catch (error) {
      console.error("Failed to submit quiz attempt:", error);
      throw error;
    }
  }

  async getUserQuizAttempts(userId: string, quizId?: string): Promise<QuizAttempt[]> {
    try {
      return await storage.getUserQuizAttempts(userId, quizId);
    } catch (error) {
      console.error("Failed to get user quiz attempts:", error);
      throw error;
    }
  }

  private async getQuizContext(documentIds: string[]): Promise<Chunk[]> {
    const allChunks: Chunk[] = [];
    
    for (const documentId of documentIds) {
      const chunks = await storage.getDocumentChunks(documentId);
      // Sample chunks for quiz generation (every 3rd chunk for good coverage)
      const sampleChunks = chunks.filter((_, index) => index % 3 === 0);
      allChunks.push(...sampleChunks);
    }

    return allChunks;
  }

  private async generateQuizQuestions(
    context: Chunk[],
    numberOfQuestions: number,
    options: QuizGenerationOptions
  ): Promise<GeneratedQuizQuestion[]> {
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

    const prompt = `Role: QuizFlashGen
Mode: quiz
Context: ${contextText}

Produce ${numberOfQuestions} MCQs. Each:
- question
- options[4]
- correct (must be one of the options)
- rationale (why correct, why others not)
- bloom_level (remember/understand/apply/analyze/evaluate/create)
- difficulty (easy/medium/hard)
- citations [{"source": "Document ID", "page": number}]

Return strict JSON array format:
[{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correct": "A",
  "rationale": "...",
  "bloom_level": "understand",
  "difficulty": "medium",
  "citations": [{"source": "Document ID", "page": 1}]
}]`;

    try {
      const response = await openaiService.chatCompletion(
        [
          {
            role: "system",
            content: "You are QuizFlashGen, an expert at creating educational quiz questions from document content. Always return valid JSON arrays."
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

      // Parse the response - handle both direct array and wrapped object
      let questions: GeneratedQuizQuestion[];
      const parsed = JSON.parse(response.content);
      
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      } else {
        throw new Error("Invalid response format from quiz generator");
      }

      // Validate and clean up questions
      return questions.slice(0, numberOfQuestions).map(q => ({
        question: q.question || "Generated question",
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : ["A", "B", "C", "D"],
        correct: q.correct || "A",
        rationale: q.rationale || "Explanation not provided",
        bloom_level: this.validateBloomLevel(q.bloom_level),
        difficulty: this.validateDifficulty(q.difficulty),
        citations: Array.isArray(q.citations) ? q.citations : [],
      }));
    } catch (error) {
      console.error("Failed to generate quiz questions:", error);
      throw new Error("Failed to generate quiz questions: " + error.message);
    }
  }

  private validateBloomLevel(level: string): 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create' {
    const validLevels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
    return validLevels.includes(level) ? level as any : 'understand';
  }

  private validateDifficulty(difficulty: string): 'easy' | 'medium' | 'hard' {
    const validDifficulties = ['easy', 'medium', 'hard'];
    return validDifficulties.includes(difficulty) ? difficulty as any : 'medium';
  }

  async deleteQuiz(quizId: string): Promise<void> {
    try {
      await storage.deleteQuiz(quizId);
    } catch (error) {
      console.error("Failed to delete quiz:", error);
      throw error;
    }
  }
}

export const quizGeneratorService = new QuizGeneratorService();
