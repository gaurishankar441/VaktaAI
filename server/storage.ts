import { 
  type User, type InsertUser,
  type ChatSession, type InsertChatSession,
  type Message, type InsertMessage,
  type Document, type InsertDocument,
  type Quiz, type InsertQuiz,
  type QuizAttempt, type InsertQuizAttempt,
  type StudyPlan, type InsertStudyPlan,
  type Note, type InsertNote,
  type Flashcard, type InsertFlashcard
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Chat Sessions
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: string): Promise<ChatSession | undefined>;
  getChatSessionsByUser(userId: string): Promise<ChatSession[]>;
  updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByChatSession(chatSessionId: string): Promise<Message[]>;

  // Documents
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;

  // Quizzes
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  getQuiz(id: string): Promise<Quiz | undefined>;
  getQuizzesByUser(userId: string): Promise<Quiz[]>;

  // Quiz Attempts
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getQuizAttempt(id: string): Promise<QuizAttempt | undefined>;
  getQuizAttemptsByUser(userId: string): Promise<QuizAttempt[]>;
  updateQuizAttempt(id: string, updates: Partial<QuizAttempt>): Promise<QuizAttempt | undefined>;

  // Study Plans
  createStudyPlan(plan: InsertStudyPlan): Promise<StudyPlan>;
  getStudyPlan(id: string): Promise<StudyPlan | undefined>;
  getStudyPlansByUser(userId: string): Promise<StudyPlan[]>;
  updateStudyPlan(id: string, updates: Partial<StudyPlan>): Promise<StudyPlan | undefined>;

  // Notes
  createNote(note: InsertNote): Promise<Note>;
  getNote(id: string): Promise<Note | undefined>;
  getNotesByUser(userId: string): Promise<Note[]>;
  updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined>;

  // Flashcards
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  getFlashcard(id: string): Promise<Flashcard | undefined>;
  getFlashcardsByUser(userId: string): Promise<Flashcard[]>;
  getFlashcardsByNote(noteId: string): Promise<Flashcard[]>;
  updateFlashcard(id: string, updates: Partial<Flashcard>): Promise<Flashcard | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private chatSessions: Map<string, ChatSession> = new Map();
  private messages: Map<string, Message> = new Map();
  private documents: Map<string, Document> = new Map();
  private quizzes: Map<string, Quiz> = new Map();
  private quizAttempts: Map<string, QuizAttempt> = new Map();
  private studyPlans: Map<string, StudyPlan> = new Map();
  private notes: Map<string, Note> = new Map();
  private flashcards: Map<string, Flashcard> = new Map();

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      class: insertUser.class ?? null,
      board: insertUser.board ?? null,
      streak: 0,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Chat Sessions
  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const session: ChatSession = {
      ...insertSession,
      id,
      userId: insertSession.userId ?? null,
      subject: insertSession.subject ?? null,
      level: insertSession.level ?? null,
      topic: insertSession.topic ?? null,
      language: insertSession.language ?? null,
      status: 'active',
      metadata: insertSession.metadata ?? {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async getChatSessionsByUser(userId: string): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values()).filter(session => session.userId === userId);
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const session = this.chatSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates, updatedAt: new Date() };
    this.chatSessions.set(id, updatedSession);
    return updatedSession;
  }

  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      chatSessionId: insertMessage.chatSessionId ?? null,
      metadata: insertMessage.metadata ?? {},
      createdAt: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesByChatSession(chatSessionId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.chatSessionId === chatSessionId)
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
  }

  // Documents
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      id,
      userId: insertDocument.userId ?? null,
      sourceUrl: insertDocument.sourceUrl ?? null,
      pages: insertDocument.pages ?? null,
      tokens: insertDocument.tokens ?? null,
      status: 'processing',
      metadata: insertDocument.metadata ?? {},
      createdAt: new Date()
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.userId === userId);
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument = { ...document, ...updates };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  // Quizzes
  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const id = randomUUID();
    const quiz: Quiz = {
      ...insertQuiz,
      id,
      type: insertQuiz.type ?? null,
      userId: insertQuiz.userId ?? null,
      subject: insertQuiz.subject ?? null,
      topic: insertQuiz.topic ?? null,
      difficulty: insertQuiz.difficulty ?? null,
      metadata: insertQuiz.metadata ?? {},
      createdAt: new Date()
    };
    this.quizzes.set(id, quiz);
    return quiz;
  }

  async getQuiz(id: string): Promise<Quiz | undefined> {
    return this.quizzes.get(id);
  }

  async getQuizzesByUser(userId: string): Promise<Quiz[]> {
    return Array.from(this.quizzes.values()).filter(quiz => quiz.userId === userId);
  }

  // Quiz Attempts
  async createQuizAttempt(insertAttempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const id = randomUUID();
    const attempt: QuizAttempt = {
      ...insertAttempt,
      id,
      userId: insertAttempt.userId ?? null,
      quizId: insertAttempt.quizId ?? null,
      score: insertAttempt.score ?? null,
      totalQuestions: insertAttempt.totalQuestions ?? null,
      correctAnswers: insertAttempt.correctAnswers ?? null,
      timeSpent: insertAttempt.timeSpent ?? null,
      completed: false,
      completedAt: null,
      createdAt: new Date()
    };
    this.quizAttempts.set(id, attempt);
    return attempt;
  }

  async getQuizAttempt(id: string): Promise<QuizAttempt | undefined> {
    return this.quizAttempts.get(id);
  }

  async getQuizAttemptsByUser(userId: string): Promise<QuizAttempt[]> {
    return Array.from(this.quizAttempts.values()).filter(attempt => attempt.userId === userId);
  }

  async updateQuizAttempt(id: string, updates: Partial<QuizAttempt>): Promise<QuizAttempt | undefined> {
    const attempt = this.quizAttempts.get(id);
    if (!attempt) return undefined;
    
    const updatedAttempt = { ...attempt, ...updates };
    if (updates.completed) {
      updatedAttempt.completedAt = new Date();
    }
    this.quizAttempts.set(id, updatedAttempt);
    return updatedAttempt;
  }

  // Study Plans
  async createStudyPlan(insertPlan: InsertStudyPlan): Promise<StudyPlan> {
    const id = randomUUID();
    const plan: StudyPlan = {
      ...insertPlan,
      id,
      userId: insertPlan.userId ?? null,
      exam: insertPlan.exam ?? null,
      preferences: insertPlan.preferences ?? {},
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.studyPlans.set(id, plan);
    return plan;
  }

  async getStudyPlan(id: string): Promise<StudyPlan | undefined> {
    return this.studyPlans.get(id);
  }

  async getStudyPlansByUser(userId: string): Promise<StudyPlan[]> {
    return Array.from(this.studyPlans.values()).filter(plan => plan.userId === userId);
  }

  async updateStudyPlan(id: string, updates: Partial<StudyPlan>): Promise<StudyPlan | undefined> {
    const plan = this.studyPlans.get(id);
    if (!plan) return undefined;
    
    const updatedPlan = { ...plan, ...updates, updatedAt: new Date() };
    this.studyPlans.set(id, updatedPlan);
    return updatedPlan;
  }

  // Notes
  async createNote(insertNote: InsertNote): Promise<Note> {
    const id = randomUUID();
    const note: Note = {
      ...insertNote,
      id,
      userId: insertNote.userId ?? null,
      sources: insertNote.sources ?? {},
      flashcards: insertNote.flashcards ?? {},
      tags: insertNote.tags ?? {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.notes.set(id, note);
    return note;
  }

  async getNote(id: string): Promise<Note | undefined> {
    return this.notes.get(id);
  }

  async getNotesByUser(userId: string): Promise<Note[]> {
    return Array.from(this.notes.values()).filter(note => note.userId === userId);
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note) return undefined;
    
    const updatedNote = { ...note, ...updates, updatedAt: new Date() };
    this.notes.set(id, updatedNote);
    return updatedNote;
  }

  // Flashcards
  async createFlashcard(insertFlashcard: InsertFlashcard): Promise<Flashcard> {
    const id = randomUUID();
    const flashcard: Flashcard = {
      ...insertFlashcard,
      id,
      userId: insertFlashcard.userId ?? null,
      noteId: insertFlashcard.noteId ?? null,
      lastReviewed: insertFlashcard.lastReviewed ?? null,
      nextReview: insertFlashcard.nextReview ?? null,
      difficulty: 2.5, // SM-2 default ease factor
      interval: 1,
      createdAt: new Date()
    };
    this.flashcards.set(id, flashcard);
    return flashcard;
  }

  async getFlashcard(id: string): Promise<Flashcard | undefined> {
    return this.flashcards.get(id);
  }

  async getFlashcardsByUser(userId: string): Promise<Flashcard[]> {
    return Array.from(this.flashcards.values()).filter(card => card.userId === userId);
  }

  async getFlashcardsByNote(noteId: string): Promise<Flashcard[]> {
    return Array.from(this.flashcards.values()).filter(card => card.noteId === noteId);
  }

  async updateFlashcard(id: string, updates: Partial<Flashcard>): Promise<Flashcard | undefined> {
    const flashcard = this.flashcards.get(id);
    if (!flashcard) return undefined;
    
    const updatedFlashcard = { ...flashcard, ...updates };
    this.flashcards.set(id, updatedFlashcard);
    return updatedFlashcard;
  }
}

export const storage = new MemStorage();
