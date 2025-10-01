import {
  users,
  settings,
  studentProfiles,
  masteryScores,
  lessonPlans,
  folders,
  files,
  documents,
  chunks,
  chatThreads,
  chatMessages,
  tutorSessions,
  tutorMessages,
  tutorAttempts,
  quizzes,
  quizQuestions,
  quizAttempts,
  flashcardDecks,
  flashcards,
  flashcardReviews,
  notes,
  type User,
  type InsertUser,
  type Settings,
  type InsertSettings,
  type StudentProfile,
  type InsertStudentProfile,
  type MasteryScore,
  type InsertMasteryScore,
  type LessonPlan,
  type InsertLessonPlan,
  type Folder,
  type InsertFolder,
  type File,
  type InsertFile,
  type Document,
  type InsertDocument,
  type Chunk,
  type InsertChunk,
  type ChatThread,
  type InsertChatThread,
  type ChatMessage,
  type InsertChatMessage,
  type TutorSession,
  type InsertTutorSession,
  type TutorMessage,
  type InsertTutorMessage,
  type TutorAttempt,
  type InsertTutorAttempt,
  type Quiz,
  type InsertQuiz,
  type QuizQuestion,
  type InsertQuizQuestion,
  type QuizAttempt,
  type InsertQuizAttempt,
  type FlashcardDeck,
  type InsertFlashcardDeck,
  type Flashcard,
  type InsertFlashcard,
  type FlashcardReview,
  type InsertFlashcardReview,
  type Note,
  type InsertNote,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, like, or, sql, asc, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (SMS OTP authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phoneE164: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Settings operations
  getUserSettings(userId: string): Promise<Settings | undefined>;
  upsertUserSettings(settings: InsertSettings): Promise<Settings>;
  
  // Student profile operations
  getStudentProfile(userId: string): Promise<StudentProfile | undefined>;
  createStudentProfile(profile: InsertStudentProfile): Promise<StudentProfile>;
  updateStudentProfile(userId: string, updates: Partial<InsertStudentProfile>): Promise<StudentProfile | undefined>;
  
  // Mastery score operations
  getMasteryScore(userId: string, subject: string, topic: string, bloomLevel: string): Promise<MasteryScore | undefined>;
  getMasteryScoresByTopic(userId: string, subject: string, topic: string): Promise<MasteryScore[]>;
  createMasteryScore(score: InsertMasteryScore): Promise<MasteryScore>;
  updateMasteryScore(id: string, updates: Partial<InsertMasteryScore>): Promise<MasteryScore | undefined>;
  
  // Lesson plan operations
  getLessonPlan(sessionId: string): Promise<LessonPlan | undefined>;
  createLessonPlan(plan: InsertLessonPlan): Promise<LessonPlan>;
  updateLessonPlan(id: string, updates: Partial<InsertLessonPlan>): Promise<LessonPlan | undefined>;
  
  // Folder operations
  getUserFolders(userId: string, parentId?: string): Promise<Folder[]>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  updateFolder(id: string, updates: Partial<InsertFolder>): Promise<Folder | undefined>;
  deleteFolder(id: string): Promise<void>;
  
  // File operations
  getUserFiles(userId: string, folderId?: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  getFile(id: string): Promise<File | undefined>;
  updateFile(id: string, updates: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: string): Promise<void>;
  
  // Document operations
  getUserDocuments(userId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<void>;
  
  // Chunk operations
  createChunk(chunk: InsertChunk): Promise<Chunk>;
  updateChunk(id: string, updates: Partial<InsertChunk>): Promise<Chunk | undefined>;
  getDocumentChunks(documentId: string): Promise<Chunk[]>;
  getChunk(id: string): Promise<Chunk | undefined>;
  getChunksByIds(ids: string[]): Promise<Chunk[]>;
  deleteDocumentChunks(documentId: string): Promise<void>;
  
  // Chat operations
  getUserChatThreads(userId: string): Promise<ChatThread[]>;
  createChatThread(thread: InsertChatThread): Promise<ChatThread>;
  getChatThread(id: string): Promise<ChatThread | undefined>;
  updateChatThread(id: string, updates: Partial<InsertChatThread>): Promise<ChatThread | undefined>;
  deleteChatThread(id: string): Promise<void>;
  
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(threadId: string): Promise<ChatMessage[]>;
  
  // Tutor operations
  getUserTutorSessions(userId: string): Promise<TutorSession[]>;
  createTutorSession(session: InsertTutorSession): Promise<TutorSession>;
  getTutorSession(id: string): Promise<TutorSession | undefined>;
  updateTutorSession(id: string, updates: Partial<InsertTutorSession>): Promise<TutorSession | undefined>;
  deleteTutorSession(id: string): Promise<void>;
  
  createTutorMessage(message: InsertTutorMessage): Promise<TutorMessage>;
  getTutorMessages(sessionId: string): Promise<TutorMessage[]>;
  
  // Tutor attempt operations
  createTutorAttempt(attempt: InsertTutorAttempt): Promise<TutorAttempt>;
  getSessionAttempts(sessionId: string): Promise<TutorAttempt[]>;
  
  // Quiz operations
  getUserQuizzes(userId: string): Promise<Quiz[]>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  getQuiz(id: string): Promise<Quiz | undefined>;
  updateQuiz(id: string, updates: Partial<InsertQuiz>): Promise<Quiz | undefined>;
  deleteQuiz(id: string): Promise<void>;
  
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  getQuizQuestions(quizId: string): Promise<QuizQuestion[]>;
  updateQuizQuestion(id: string, updates: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined>;
  
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getUserQuizAttempts(userId: string, quizId?: string): Promise<QuizAttempt[]>;
  
  // Flashcard operations
  getUserFlashcardDecks(userId: string): Promise<FlashcardDeck[]>;
  createFlashcardDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck>;
  getFlashcardDeck(id: string): Promise<FlashcardDeck | undefined>;
  updateFlashcardDeck(id: string, updates: Partial<InsertFlashcardDeck>): Promise<FlashcardDeck | undefined>;
  deleteFlashcardDeck(id: string): Promise<void>;
  
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  getDeckFlashcards(deckId: string): Promise<Flashcard[]>;
  updateFlashcard(id: string, updates: Partial<InsertFlashcard>): Promise<Flashcard | undefined>;
  getDueFlashcards(userId: string, deckId?: string): Promise<Flashcard[]>;
  
  createFlashcardReview(review: InsertFlashcardReview): Promise<FlashcardReview>;
  
  // Note operations
  getUserNotes(userId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  getNote(id: string): Promise<Note | undefined>;
  updateNote(id: string, updates: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: string): Promise<void>;
  searchNotes(userId: string, query: string): Promise<Note[]>;
  
  // Stats operations
  getUserStats(userId: string): Promise<{
    documentsCount: number;
    chatSessionsCount: number;
    notesCount: number;
    quizzesCount: number;
  }>;
  
  // Data export
  exportUserData(userId: string): Promise<any>;
  deleteUserData(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByPhone(phoneE164: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneE164, phoneE164));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Settings operations
  async getUserSettings(userId: string): Promise<Settings | undefined> {
    const [userSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId));
    return userSettings;
  }

  async upsertUserSettings(settingsData: InsertSettings): Promise<Settings> {
    const [userSettings] = await db
      .insert(settings)
      .values(settingsData)
      .onConflictDoUpdate({
        target: settings.userId,
        set: {
          ...settingsData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return userSettings;
  }

  // Folder operations
  async getUserFolders(userId: string, parentId?: string): Promise<Folder[]> {
    return await db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.userId, userId),
          parentId ? eq(folders.parentId, parentId) : sql`${folders.parentId} IS NULL`
        )
      )
      .orderBy(asc(folders.name));
  }

  async createFolder(folder: InsertFolder): Promise<Folder> {
    const [newFolder] = await db.insert(folders).values(folder).returning();
    return newFolder;
  }

  async updateFolder(id: string, updates: Partial<InsertFolder>): Promise<Folder | undefined> {
    const [updated] = await db
      .update(folders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(folders.id, id))
      .returning();
    return updated;
  }

  async deleteFolder(id: string): Promise<void> {
    await db.delete(folders).where(eq(folders.id, id));
  }

  // File operations
  async getUserFiles(userId: string, folderId?: string): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.userId, userId),
          folderId ? eq(files.folderId, folderId) : sql`${files.folderId} IS NULL`
        )
      )
      .orderBy(desc(files.createdAt));
  }

  async createFile(file: InsertFile): Promise<File> {
    const [newFile] = await db.insert(files).values(file).returning();
    return newFile;
  }

  async getFile(id: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async updateFile(id: string, updates: Partial<InsertFile>): Promise<File | undefined> {
    const [updated] = await db
      .update(files)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    return updated;
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  // Document operations
  async getUserDocuments(userId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(document).returning();
    return newDoc;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updated] = await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Chunk operations
  async createChunk(chunk: InsertChunk): Promise<Chunk> {
    const [newChunk] = await db.insert(chunks).values(chunk).returning();
    return newChunk;
  }

  async updateChunk(id: string, updates: Partial<InsertChunk>): Promise<Chunk | undefined> {
    const [updatedChunk] = await db
      .update(chunks)
      .set(updates)
      .where(eq(chunks.id, id))
      .returning();
    return updatedChunk;
  }

  async getDocumentChunks(documentId: string): Promise<Chunk[]> {
    return await db
      .select()
      .from(chunks)
      .where(eq(chunks.documentId, documentId))
      .orderBy(asc(chunks.startPage), asc(chunks.startTime));
  }

  async getChunk(id: string): Promise<Chunk | undefined> {
    const result = await db
      .select()
      .from(chunks)
      .where(eq(chunks.id, id))
      .limit(1);
    return result[0];
  }

  async getChunksByIds(ids: string[]): Promise<Chunk[]> {
    if (ids.length === 0) return [];
    return await db
      .select()
      .from(chunks)
      .where(inArray(chunks.id, ids));
  }

  async deleteDocumentChunks(documentId: string): Promise<void> {
    await db.delete(chunks).where(eq(chunks.documentId, documentId));
  }

  // Chat operations
  async getUserChatThreads(userId: string): Promise<ChatThread[]> {
    return await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.userId, userId))
      .orderBy(desc(chatThreads.updatedAt));
  }

  async createChatThread(thread: InsertChatThread): Promise<ChatThread> {
    const [newThread] = await db.insert(chatThreads).values(thread).returning();
    return newThread;
  }

  async getChatThread(id: string): Promise<ChatThread | undefined> {
    const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.id, id));
    return thread;
  }

  async updateChatThread(id: string, updates: Partial<InsertChatThread>): Promise<ChatThread | undefined> {
    const [updated] = await db
      .update(chatThreads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatThreads.id, id))
      .returning();
    return updated;
  }

  async deleteChatThread(id: string): Promise<void> {
    await db.delete(chatThreads).where(eq(chatThreads.id, id));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async getChatMessages(threadId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(asc(chatMessages.createdAt));
  }

  // Tutor operations
  async getUserTutorSessions(userId: string): Promise<TutorSession[]> {
    return await db
      .select()
      .from(tutorSessions)
      .where(eq(tutorSessions.userId, userId))
      .orderBy(desc(tutorSessions.updatedAt));
  }

  async createTutorSession(session: InsertTutorSession): Promise<TutorSession> {
    const [newSession] = await db.insert(tutorSessions).values(session).returning();
    return newSession;
  }

  async getTutorSession(id: string): Promise<TutorSession | undefined> {
    const [session] = await db.select().from(tutorSessions).where(eq(tutorSessions.id, id));
    return session;
  }

  async updateTutorSession(id: string, updates: Partial<InsertTutorSession>): Promise<TutorSession | undefined> {
    const [updated] = await db
      .update(tutorSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tutorSessions.id, id))
      .returning();
    return updated;
  }

  async deleteTutorSession(id: string): Promise<void> {
    await db.delete(tutorSessions).where(eq(tutorSessions.id, id));
  }

  async createTutorMessage(message: InsertTutorMessage): Promise<TutorMessage> {
    const [newMessage] = await db.insert(tutorMessages).values(message).returning();
    return newMessage;
  }

  async getTutorMessages(sessionId: string): Promise<TutorMessage[]> {
    return await db
      .select()
      .from(tutorMessages)
      .where(eq(tutorMessages.sessionId, sessionId))
      .orderBy(asc(tutorMessages.createdAt));
  }

  // Student profile operations
  async getStudentProfile(userId: string): Promise<StudentProfile | undefined> {
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId));
    return profile;
  }

  async createStudentProfile(profile: InsertStudentProfile): Promise<StudentProfile> {
    const [newProfile] = await db.insert(studentProfiles).values(profile).returning();
    return newProfile;
  }

  async updateStudentProfile(userId: string, updates: Partial<InsertStudentProfile>): Promise<StudentProfile | undefined> {
    const [updated] = await db
      .update(studentProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(studentProfiles.userId, userId))
      .returning();
    return updated;
  }

  // Mastery score operations
  async getMasteryScore(userId: string, subject: string, topic: string, bloomLevel: string): Promise<MasteryScore | undefined> {
    const [score] = await db
      .select()
      .from(masteryScores)
      .where(
        and(
          eq(masteryScores.userId, userId),
          eq(masteryScores.subject, subject),
          eq(masteryScores.topic, topic),
          eq(masteryScores.bloomLevel, bloomLevel)
        )
      );
    return score;
  }

  async getMasteryScoresByTopic(userId: string, subject: string, topic: string): Promise<MasteryScore[]> {
    return await db
      .select()
      .from(masteryScores)
      .where(
        and(
          eq(masteryScores.userId, userId),
          eq(masteryScores.subject, subject),
          eq(masteryScores.topic, topic)
        )
      )
      .orderBy(desc(masteryScores.lastPracticed));
  }

  async createMasteryScore(score: InsertMasteryScore): Promise<MasteryScore> {
    const [newScore] = await db.insert(masteryScores).values(score).returning();
    return newScore;
  }

  async updateMasteryScore(id: string, updates: Partial<InsertMasteryScore>): Promise<MasteryScore | undefined> {
    const [updated] = await db
      .update(masteryScores)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(masteryScores.id, id))
      .returning();
    return updated;
  }

  // Lesson plan operations
  async getLessonPlan(sessionId: string): Promise<LessonPlan | undefined> {
    const [plan] = await db
      .select()
      .from(lessonPlans)
      .where(eq(lessonPlans.sessionId, sessionId));
    return plan;
  }

  async createLessonPlan(plan: InsertLessonPlan): Promise<LessonPlan> {
    const [newPlan] = await db.insert(lessonPlans).values(plan).returning();
    return newPlan;
  }

  async updateLessonPlan(id: string, updates: Partial<InsertLessonPlan>): Promise<LessonPlan | undefined> {
    const [updated] = await db
      .update(lessonPlans)
      .set(updates)
      .where(eq(lessonPlans.id, id))
      .returning();
    return updated;
  }

  // Tutor attempt operations
  async createTutorAttempt(attempt: InsertTutorAttempt): Promise<TutorAttempt> {
    const [newAttempt] = await db.insert(tutorAttempts).values(attempt).returning();
    return newAttempt;
  }

  async getSessionAttempts(sessionId: string): Promise<TutorAttempt[]> {
    return await db
      .select()
      .from(tutorAttempts)
      .where(eq(tutorAttempts.sessionId, sessionId))
      .orderBy(asc(tutorAttempts.createdAt));
  }

  // Quiz operations
  async getUserQuizzes(userId: string): Promise<Quiz[]> {
    return await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.userId, userId))
      .orderBy(desc(quizzes.createdAt));
  }

  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const [newQuiz] = await db.insert(quizzes).values(quiz).returning();
    return newQuiz;
  }

  async getQuiz(id: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async updateQuiz(id: string, updates: Partial<InsertQuiz>): Promise<Quiz | undefined> {
    const [updated] = await db
      .update(quizzes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(quizzes.id, id))
      .returning();
    return updated;
  }

  async deleteQuiz(id: string): Promise<void> {
    await db.delete(quizzes).where(eq(quizzes.id, id));
  }

  async createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const [newQuestion] = await db.insert(quizQuestions).values(question).returning();
    return newQuestion;
  }

  async getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
    return await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.orderIndex));
  }

  async updateQuizQuestion(id: string, updates: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined> {
    const [updated] = await db
      .update(quizQuestions)
      .set(updates)
      .where(eq(quizQuestions.id, id))
      .returning();
    return updated;
  }

  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [newAttempt] = await db.insert(quizAttempts).values(attempt).returning();
    return newAttempt;
  }

  async getUserQuizAttempts(userId: string, quizId?: string): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, userId),
          quizId ? eq(quizAttempts.quizId, quizId) : undefined
        )
      )
      .orderBy(desc(quizAttempts.completedAt));
  }

  // Flashcard operations
  async getUserFlashcardDecks(userId: string): Promise<FlashcardDeck[]> {
    return await db
      .select()
      .from(flashcardDecks)
      .where(eq(flashcardDecks.userId, userId))
      .orderBy(desc(flashcardDecks.updatedAt));
  }

  async createFlashcardDeck(deck: InsertFlashcardDeck): Promise<FlashcardDeck> {
    const [newDeck] = await db.insert(flashcardDecks).values(deck).returning();
    return newDeck;
  }

  async getFlashcardDeck(id: string): Promise<FlashcardDeck | undefined> {
    const [deck] = await db.select().from(flashcardDecks).where(eq(flashcardDecks.id, id));
    return deck;
  }

  async updateFlashcardDeck(id: string, updates: Partial<InsertFlashcardDeck>): Promise<FlashcardDeck | undefined> {
    const [updated] = await db
      .update(flashcardDecks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(flashcardDecks.id, id))
      .returning();
    return updated;
  }

  async deleteFlashcardDeck(id: string): Promise<void> {
    await db.delete(flashcardDecks).where(eq(flashcardDecks.id, id));
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const [newCard] = await db.insert(flashcards).values(flashcard).returning();
    return newCard;
  }

  async getDeckFlashcards(deckId: string): Promise<Flashcard[]> {
    return await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, deckId))
      .orderBy(asc(flashcards.orderIndex));
  }

  async updateFlashcard(id: string, updates: Partial<InsertFlashcard>): Promise<Flashcard | undefined> {
    const [updated] = await db
      .update(flashcards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(flashcards.id, id))
      .returning();
    return updated;
  }

  async getDueFlashcards(userId: string, deckId?: string): Promise<Flashcard[]> {
    const now = new Date();
    
    return await db
      .select({
        id: flashcards.id,
        deckId: flashcards.deckId,
        front: flashcards.front,
        back: flashcards.back,
        clozeText: flashcards.clozeText,
        citations: flashcards.citations,
        intervalDays: flashcards.intervalDays,
        ease: flashcards.ease,
        dueAt: flashcards.dueAt,
        reviews: flashcards.reviews,
        lapses: flashcards.lapses,
        orderIndex: flashcards.orderIndex,
        createdAt: flashcards.createdAt,
        updatedAt: flashcards.updatedAt,
      })
      .from(flashcards)
      .innerJoin(flashcardDecks, eq(flashcards.deckId, flashcardDecks.id))
      .where(
        and(
          eq(flashcardDecks.userId, userId),
          lte(flashcards.dueAt, now),
          deckId ? eq(flashcards.deckId, deckId) : undefined
        )
      )
      .orderBy(asc(flashcards.dueAt));
  }

  async createFlashcardReview(review: InsertFlashcardReview): Promise<FlashcardReview> {
    const [newReview] = await db.insert(flashcardReviews).values(review).returning();
    return newReview;
  }

  // Note operations
  async getUserNotes(userId: string): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.updatedAt));
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(notes).values(note).returning();
    return newNote;
  }

  async getNote(id: string): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note;
  }

  async updateNote(id: string, updates: Partial<InsertNote>): Promise<Note | undefined> {
    const [updated] = await db
      .update(notes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();
    return updated;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  async searchNotes(userId: string, query: string): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.userId, userId),
          or(
            like(notes.title, `%${query}%`),
            like(notes.content, `%${query}%`)
          )
        )
      )
      .orderBy(desc(notes.updatedAt));
  }

  // Stats operations
  async getUserStats(userId: string): Promise<{
    documentsCount: number;
    chatSessionsCount: number;
    notesCount: number;
    quizzesCount: number;
  }> {
    const [documentsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(eq(documents.userId, userId));
    
    const [chatSessionsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatThreads)
      .where(eq(chatThreads.userId, userId));
    
    const [notesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notes)
      .where(eq(notes.userId, userId));
    
    const [quizzesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId));

    return {
      documentsCount: documentsResult.count || 0,
      chatSessionsCount: chatSessionsResult.count || 0,
      notesCount: notesResult.count || 0,
      quizzesCount: quizzesResult.count || 0,
    };
  }

  // Data export
  async exportUserData(userId: string): Promise<any> {
    const userData = await this.getUser(userId);
    const userSettings = await this.getUserSettings(userId);
    const userDocuments = await this.getUserDocuments(userId);
    const userNotes = await this.getUserNotes(userId);
    const userQuizzes = await this.getUserQuizzes(userId);
    const userFlashcardDecks = await this.getUserFlashcardDecks(userId);
    const userChatThreads = await this.getUserChatThreads(userId);
    const userTutorSessions = await this.getUserTutorSessions(userId);

    return {
      user: userData,
      settings: userSettings,
      documents: userDocuments,
      notes: userNotes,
      quizzes: userQuizzes,
      flashcardDecks: userFlashcardDecks,
      chatThreads: userChatThreads,
      tutorSessions: userTutorSessions,
      exportedAt: new Date().toISOString(),
    };
  }

  async deleteUserData(userId: string): Promise<void> {
    // Delete in proper order to handle foreign key constraints
    await db.delete(flashcardReviews).where(eq(flashcardReviews.userId, userId));
    await db.delete(quizAttempts).where(eq(quizAttempts.userId, userId));
    await db.delete(tutorMessages).where(
      sql`${tutorMessages.sessionId} IN (SELECT id FROM ${tutorSessions} WHERE user_id = ${userId})`
    );
    await db.delete(tutorSessions).where(eq(tutorSessions.userId, userId));
    await db.delete(chatMessages).where(
      sql`${chatMessages.threadId} IN (SELECT id FROM ${chatThreads} WHERE user_id = ${userId})`
    );
    await db.delete(chatThreads).where(eq(chatThreads.userId, userId));
    await db.delete(chunks).where(
      sql`${chunks.documentId} IN (SELECT id FROM ${documents} WHERE user_id = ${userId})`
    );
    await db.delete(quizQuestions).where(
      sql`${quizQuestions.quizId} IN (SELECT id FROM ${quizzes} WHERE user_id = ${userId})`
    );
    await db.delete(flashcards).where(
      sql`${flashcards.deckId} IN (SELECT id FROM ${flashcardDecks} WHERE user_id = ${userId})`
    );
    await db.delete(flashcardDecks).where(eq(flashcardDecks.userId, userId));
    await db.delete(quizzes).where(eq(quizzes.userId, userId));
    await db.delete(notes).where(eq(notes.userId, userId));
    await db.delete(documents).where(eq(documents.userId, userId));
    await db.delete(files).where(eq(files.userId, userId));
    await db.delete(folders).where(eq(folders.userId, userId));
    await db.delete(settings).where(eq(settings.userId, userId));
    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
