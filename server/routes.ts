import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { ragService } from "./services/rag";
import { aiTutorService } from "./services/aiTutor";
import { quizGeneratorService } from "./services/quizGenerator";
import { flashcardGeneratorService } from "./services/flashcardGenerator";
import { documentProcessorService } from "./services/documentProcessor";
import { AgentOrchestrator } from "./agent/orchestrator";
import { z } from "zod";
import { 
  insertSettingsSchema,
  insertFolderSchema,
  insertFileSchema,
  insertNoteSchema,
  insertChatThreadSchema,
  insertTutorSessionSchema,
} from "@shared/schema";

// Validation schema for claim verification
const verifyClaimsSchema = z.object({
  responseText: z.string()
    .min(10, "Response text must be at least 10 characters")
    .max(10000, "Response text must not exceed 10,000 characters"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Object Storage routes
  const objectStorageService = new ObjectStorageService();

  // Serve private objects with ACL check
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for file upload
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Update file after upload
  app.put("/api/files", isAuthenticated, async (req: any, res) => {
    if (!req.body.fileURL || !req.body.filename) {
      return res.status(400).json({ error: "fileURL and filename are required" });
    }

    const userId = req.user?.claims?.sub;

    try {
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.fileURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      // Create file record
      const fileData = insertFileSchema.parse({
        userId,
        folderId: req.body.folderId || null,
        filename: req.body.filename,
        originalName: req.body.originalName || req.body.filename,
        url: objectPath,
        fileType: req.body.fileType || 'unknown',
        size: req.body.size,
        mimeType: req.body.mimeType,
      });

      const file = await storage.createFile(fileData);
      res.json({ file, objectPath });
    } catch (error) {
      console.error("Error creating file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Settings routes
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settingsData = insertSettingsSchema.parse({
        userId,
        ...req.body,
      });
      const settings = await storage.upsertUserSettings(settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Folder routes
  app.get('/api/folders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { parentId } = req.query;
      const folders = await storage.getUserFolders(userId, parentId);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  app.post('/api/folders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const folderData = insertFolderSchema.parse({
        userId,
        ...req.body,
      });
      const folder = await storage.createFolder(folderData);
      res.json(folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  app.delete('/api/folders/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteFolder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  // File routes
  app.get('/api/files', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { folderId } = req.query;
      const files = await storage.getUserFiles(userId, folderId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.delete('/api/files/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteFile(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Document routes
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getUserDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post('/api/documents/process', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { fileId, sourceType, sourceUrl, title } = req.body;

      const result = await documentProcessorService.processDocument(
        userId,
        fileId,
        sourceType,
        sourceUrl,
        title
      );

      res.json(result);
    } catch (error) {
      console.error("Error processing document:", error);
      res.status(500).json({ message: "Failed to process document" });
    }
  });

  app.get('/api/documents/:id/status', isAuthenticated, async (req, res) => {
    try {
      const status = await documentProcessorService.getProcessingStatus(req.params.id);
      res.json(status);
    } catch (error) {
      console.error("Error getting processing status:", error);
      res.status(500).json({ message: "Failed to get processing status" });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      await documentProcessorService.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Chat routes
  app.get('/api/chat/threads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const threads = await storage.getUserChatThreads(userId);
      res.json(threads);
    } catch (error) {
      console.error("Error fetching chat threads:", error);
      res.status(500).json({ message: "Failed to fetch chat threads" });
    }
  });

  app.post('/api/chat/threads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const threadData = insertChatThreadSchema.parse({
        userId,
        ...req.body,
      });
      const thread = await storage.createChatThread(threadData);
      res.json(thread);
    } catch (error) {
      console.error("Error creating chat thread:", error);
      res.status(500).json({ message: "Failed to create chat thread" });
    }
  });

  app.get('/api/chat/threads/:id/messages', isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post('/api/chat/query', isAuthenticated, async (req: any, res) => {
    try {
      const { query, documentIds, threadId, streaming = false } = req.body;

      console.log("[Chat Query] Received query:", { query, documentIds, threadId, streaming });

      // Validate thread exists
      const thread = await storage.getChatThread(threadId);
      if (!thread) {
        console.error("[Chat Query] Thread not found:", threadId);
        return res.status(400).json({ 
          message: "Thread not found. Please create a thread first." 
        });
      }

      // Save user message
      await storage.createChatMessage({
        threadId,
        role: 'user',
        content: query,
      });
      console.log("[Chat Query] User message saved");

      // Get RAG context with more chunks for better answers
      console.log("[Chat Query] Retrieving context...");
      const context = await ragService.retrieveContext(query, documentIds, 12); // Increased from default 8 to 12 chunks
      console.log("[Chat Query] Context retrieved, chunks:", context.chunks.length);

      if (streaming) {
        // Generate streaming response
        console.log("[Chat Query] Generating streaming response...");
        await ragService.generateResponse(
          query,
          context,
          { streaming: true, res }
        );
      } else {
        // Generate regular response
        console.log("[Chat Query] Generating response...");
        const response = await ragService.generateResponse(query, context);
        console.log("[Chat Query] Response generated:", { answerLength: response.answer.length, citations: response.citations.length });

        // Save assistant message
        await storage.createChatMessage({
          threadId,
          role: 'assistant',
          content: response.answer,
          citations: response.citations,
        });
        console.log("[Chat Query] Assistant message saved");

        res.json(response);
      }
    } catch (error) {
      console.error("[Chat Query] Error processing chat query:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ message: "Failed to process query", error: errorMessage });
    }
  });

  app.post('/api/chat/summary', isAuthenticated, async (req: any, res) => {
    try {
      const { documentIds } = req.body;
      const summary = await ragService.generateSummary(documentIds);
      res.json(summary);
    } catch (error) {
      console.error("Error generating summary:", error);
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  app.post('/api/chat/highlights', isAuthenticated, async (req: any, res) => {
    try {
      const { documentIds } = req.body;
      const highlights = await ragService.extractHighlights(documentIds);
      res.json(highlights);
    } catch (error) {
      console.error("Error extracting highlights:", error);
      res.status(500).json({ message: "Failed to extract highlights" });
    }
  });

  // Claim verification endpoint
  app.post('/api/chat/verify-claims', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Validate request body with Zod
      const validation = verifyClaimsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request body",
          errors: validation.error.errors 
        });
      }

      const { responseText } = validation.data;

      console.log(`[Verify Claims] Starting verification for user ${userId}, text length: ${responseText.length}`);

      // Create agent orchestrator for this user
      const agent = new AgentOrchestrator(userId);

      // Add timeout wrapper (30 seconds total) with proper cleanup
      const verificationTask = agent.verifyResponse(responseText);
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Verification timeout after 30 seconds')), 30000);
      });

      try {
        // Race between verification and timeout
        const verification = await Promise.race([
          verificationTask,
          timeoutPromise
        ]);

        // Cap the number of claims returned (max 10)
        if (verification.claims.length > 10) {
          verification.claims = verification.claims.slice(0, 10);
          verification.verifications = verification.verifications.slice(0, 10);
          verification.summary += " (Limited to first 10 claims)";
        }

        console.log(`[Verify Claims] Verification complete: ${verification.summary}`);

        res.json(verification);
      } catch (verificationError) {
        // Suppress late rejections from the task if timeout won
        verificationTask.catch(() => {});
        throw verificationError;
      } finally {
        // Always clear the timeout
        if (timeoutId) clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error("[Verify Claims] Error verifying claims:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ message: "Failed to verify claims", error: errorMessage });
    }
  });

  // Tutor routes
  app.get('/api/tutor/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await aiTutorService.getUserTutorSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching tutor sessions:", error);
      res.status(500).json({ message: "Failed to fetch tutor sessions" });
    }
  });

  app.post('/api/tutor/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subject, gradeLevel, topic } = req.body;
      const session = await aiTutorService.createTutorSession(userId, subject, gradeLevel, topic);
      res.json(session);
    } catch (error) {
      console.error("Error creating tutor session:", error);
      res.status(500).json({ message: "Failed to create tutor session" });
    }
  });

  app.get('/api/tutor/sessions/:id', isAuthenticated, async (req, res) => {
    try {
      const sessionData = await aiTutorService.getTutorSession(req.params.id);
      if (!sessionData) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(sessionData);
    } catch (error) {
      console.error("Error fetching tutor session:", error);
      res.status(500).json({ message: "Failed to fetch tutor session" });
    }
  });

  app.post('/api/tutor/sessions/:id/message', isAuthenticated, async (req: any, res) => {
    try {
      const { content, streaming = false } = req.body;
      const sessionId = req.params.id;

      // Save user message
      await aiTutorService.sendTutorMessage(sessionId, content, 'user');

      if (streaming) {
        // Generate streaming response
        await aiTutorService.generateTutorResponse(
          sessionId,
          content,
          { streaming: true, res }
        );
      } else {
        // Generate regular response
        const response = await aiTutorService.generateTutorResponse(sessionId, content);
        res.json(response);
      }
    } catch (error) {
      console.error("Error processing tutor message:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  app.post('/api/tutor/sessions/:id/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const { studentAnswer, correctAnswer } = req.body;
      const feedback = await aiTutorService.provideFeedback(
        req.params.id,
        studentAnswer,
        correctAnswer
      );
      res.json({ feedback });
    } catch (error) {
      console.error("Error providing feedback:", error);
      res.status(500).json({ message: "Failed to provide feedback" });
    }
  });

  // Quiz routes
  app.get('/api/quizzes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quizzes = await quizGeneratorService.getUserQuizzes(userId);
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ message: "Failed to fetch quizzes" });
    }
  });

  app.post('/api/quizzes/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quiz = await quizGeneratorService.generateQuiz(userId, req.body);
      res.json(quiz);
    } catch (error) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ message: "Failed to generate quiz" });
    }
  });

  app.get('/api/quizzes/:id', isAuthenticated, async (req, res) => {
    try {
      const quizData = await quizGeneratorService.getQuiz(req.params.id);
      if (!quizData) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      res.json(quizData);
    } catch (error) {
      console.error("Error fetching quiz:", error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });

  app.post('/api/quizzes/:id/attempt', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { answers, timeSpent } = req.body;
      const result = await quizGeneratorService.submitQuizAttempt(
        userId,
        req.params.id,
        answers,
        timeSpent
      );
      res.json(result);
    } catch (error) {
      console.error("Error submitting quiz attempt:", error);
      res.status(500).json({ message: "Failed to submit quiz attempt" });
    }
  });

  app.get('/api/quizzes/:id/attempts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const attempts = await quizGeneratorService.getUserQuizAttempts(userId, req.params.id);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching quiz attempts:", error);
      res.status(500).json({ message: "Failed to fetch quiz attempts" });
    }
  });

  // Flashcard routes
  app.get('/api/flashcards/decks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const decks = await flashcardGeneratorService.getUserFlashcardDecks(userId);
      res.json(decks);
    } catch (error) {
      console.error("Error fetching flashcard decks:", error);
      res.status(500).json({ message: "Failed to fetch flashcard decks" });
    }
  });

  app.post('/api/flashcards/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deck = await flashcardGeneratorService.generateFlashcardDeck(userId, req.body);
      res.json(deck);
    } catch (error) {
      console.error("Error generating flashcard deck:", error);
      res.status(500).json({ message: "Failed to generate flashcard deck" });
    }
  });

  app.get('/api/flashcards/decks/:id', isAuthenticated, async (req, res) => {
    try {
      const deckData = await flashcardGeneratorService.getFlashcardDeck(req.params.id);
      if (!deckData) {
        return res.status(404).json({ message: "Deck not found" });
      }
      res.json(deckData);
    } catch (error) {
      console.error("Error fetching flashcard deck:", error);
      res.status(500).json({ message: "Failed to fetch flashcard deck" });
    }
  });

  app.get('/api/flashcards/due', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { deckId } = req.query;
      const dueCards = await flashcardGeneratorService.getDueFlashcards(userId, deckId);
      res.json(dueCards);
    } catch (error) {
      console.error("Error fetching due flashcards:", error);
      res.status(500).json({ message: "Failed to fetch due flashcards" });
    }
  });

  app.post('/api/flashcards/:id/review', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { rating } = req.body;
      const result = await flashcardGeneratorService.reviewFlashcard(
        userId,
        req.params.id,
        rating
      );
      res.json(result);
    } catch (error) {
      console.error("Error reviewing flashcard:", error);
      res.status(500).json({ message: "Failed to review flashcard" });
    }
  });

  app.get('/api/flashcards/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await flashcardGeneratorService.getFlashcardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching flashcard stats:", error);
      res.status(500).json({ message: "Failed to fetch flashcard stats" });
    }
  });

  // Notes routes
  app.get('/api/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { search } = req.query;
      
      let notes;
      if (search) {
        notes = await storage.searchNotes(userId, search);
      } else {
        notes = await storage.getUserNotes(userId);
      }
      
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post('/api/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const noteData = insertNoteSchema.parse({
        userId,
        ...req.body,
      });
      const note = await storage.createNote(noteData);
      res.json(note);
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  app.get('/api/notes/:id', isAuthenticated, async (req, res) => {
    try {
      const note = await storage.getNote(req.params.id);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      console.error("Error fetching note:", error);
      res.status(500).json({ message: "Failed to fetch note" });
    }
  });

  app.put('/api/notes/:id', isAuthenticated, async (req, res) => {
    try {
      const note = await storage.updateNote(req.params.id, req.body);
      res.json(note);
    } catch (error) {
      console.error("Error updating note:", error);
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  app.delete('/api/notes/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteNote(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // Stats routes
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Data export routes
  app.get('/api/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = await storage.exportUserData(userId);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="vaktaai-export.json"');
      res.json(data);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  app.delete('/api/account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteUserData(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
