import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GeminiService } from "./services/gemini";
import { AnthropicService } from "./services/anthropic";
import { RAGService } from "./services/rag";
import { z } from "zod";
import { insertChatSessionSchema, insertMessageSchema, insertDocumentSchema, insertQuizSchema, insertQuizAttemptSchema, insertStudyPlanSchema, insertNoteSchema } from "@shared/schema";
import multer from 'multer';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  const geminiService = new GeminiService();
  const anthropicService = new AnthropicService();
  const ragService = new RAGService();

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ==== CHAT ROUTES ====
  
  // Get all chat sessions for user
  app.get("/api/chats", async (req, res) => {
    try {
      const userId = 'default-user'; // In production, get from session
      const mode = req.query.mode as string | undefined;
      let chats = await storage.getChatSessionsByUser(userId);
      
      // Filter by mode if specified
      if (mode) {
        chats = chats.filter(chat => chat.mode === mode);
      }
      
      res.json(chats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  // Create chat session
  app.post("/api/chats", async (req, res) => {
    try {
      const validatedData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(validatedData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: "Invalid chat session data" });
    }
  });

  // Get chat session
  app.get("/api/chats/:id", async (req, res) => {
    try {
      const session = await storage.getChatSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat session" });
    }
  });

  // Get chat messages
  app.get("/api/chats/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getMessagesByChatSession(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send message with SSE streaming
  app.post("/api/chats/:id/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        chatSessionId: req.params.id
      });

      // Save user message
      const userMessage = await storage.createMessage(validatedData);

      // Get chat session for context
      const session = await storage.getChatSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }

      // Get previous messages for context
      const previousMessages = await storage.getMessagesByChatSession(req.params.id);
      const messageHistory = previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      let assistantContent = '';

      try {
        if (session.mode === 'tutor') {
          // AI Tutor streaming
          const config = {
            subject: session.subject || 'General',
            level: session.level || 'Class 12',
            topic: session.topic || 'Current Topic',
            language: session.language || 'en',
            board: (session.metadata as any)?.board || 'CBSE'
          };

          const stream = geminiService.streamTutorResponse(messageHistory, config);
          
          for await (const chunk of stream) {
            assistantContent += chunk;
            res.write(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`);
          }

        } else if (session.mode === 'docchat') {
          // DocChat with RAG
          const documentIds = (session.metadata as any)?.documentIds as string[] || [];
          const searchResults = await ragService.hybridSearch(validatedData.content, documentIds, 8);
          const { context, citations } = ragService.generateContextForLLM(searchResults);

          // Use DocChat prompt with context
          const docChatMessages = [
            {
              role: 'system',
              content: `Answer ONLY from CONTEXT. If insufficient, say what else is needed.
Return crisp bullets with inline citations like [Doc {title}, p.{page} §{heading}].
Language: ${session.language || 'en'}.
CONTEXT:
${context}`
            },
            ...messageHistory
          ];

          const stream = geminiService.streamTutorResponse(docChatMessages, {
            subject: 'Document Analysis',
            level: session.level || 'Advanced',
            topic: 'Document Q&A',
            language: session.language || 'en',
            board: 'General'
          });

          for await (const chunk of stream) {
            assistantContent += chunk;
            res.write(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`);
          }

          // Send citations
          res.write(`data: ${JSON.stringify({ type: 'citations', data: citations })}\n\n`);
        }

        // Save assistant message
        await storage.createMessage({
          chatSessionId: req.params.id,
          role: 'assistant',
          content: assistantContent,
          metadata: session.mode === 'docchat' ? { citations: [] } : undefined
        });

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();

      } catch (streamError) {
        console.error('Streaming error:', streamError);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response' })}\n\n`);
        res.end();
      }

    } catch (error) {
      console.error('Message processing error:', error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // ==== DOCUMENT ROUTES ====
  
  // Get all documents for user
  app.get("/api/documents", async (req, res) => {
    try {
      const userId = 'default-user'; // In production, get from session
      const documents = await storage.getDocumentsByUser(userId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Upload document
  app.post("/api/documents/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { title, type } = req.body;
      const document = await storage.createDocument({
        userId: req.body.userId || 'default-user',
        title: title || req.file.originalname,
        type: type || 'pdf',
        sourceUrl: null,
        status: 'processing'
      });

      // Process document asynchronously
      processDocumentAsync(document.id, req.file.buffer, ragService);

      res.json({ documentId: document.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // Add document by URL
  app.post("/api/documents/by-url", async (req, res) => {
    try {
      const { url, title, type } = req.body;
      const document = await storage.createDocument({
        userId: req.body.userId || 'default-user',
        title: title || url,
        type: type || 'url',
        sourceUrl: url,
        status: 'processing'
      });

      // Process URL asynchronously
      processURLAsync(document.id, url, ragService);

      res.json({ documentId: document.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to add document" });
    }
  });

  // Get document status
  app.get("/api/documents/:id/status", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const ragStatus = ragService.getDocumentStatus(req.params.id);
      
      res.json({
        status: document.status,
        pages: document.pages,
        tokens: document.tokens,
        chunkCount: ragStatus.chunkCount
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get document status" });
    }
  });

  // ==== QUIZ ROUTES ====
  
  // Create quiz
  app.post("/api/quizzes", async (req, res) => {
    try {
      const { source, subject, topic, count = 5, difficulty = 'medium', language = 'en' } = req.body;
      
      let questions = [];
      
      if (source === 'topic') {
        // Generate from topic
        questions = await geminiService.generateQuiz({
          subject,
          topic,
          difficulty,
          count,
          language,
          exam: req.body.exam
        });
      } else if (source === 'document') {
        // Generate from document context
        const documentIds = req.body.documentIds || [];
        const searchResults = await ragService.hybridSearch(topic, documentIds, 10);
        const { context } = ragService.generateContextForLLM(searchResults);
        
        questions = await geminiService.generateQuiz({
          subject,
          topic,
          difficulty,
          count,
          language,
          context
        });
      }

      const quiz = await storage.createQuiz({
        userId: req.body.userId || 'default-user',
        title: `${subject} - ${topic}`,
        subject,
        topic,
        difficulty,
        type: 'auto',
        questions: questions,
        metadata: { source, exam: req.body.exam }
      });

      res.json(quiz);
    } catch (error) {
      console.error('Quiz creation error:', error);
      res.status(500).json({ error: "Failed to create quiz" });
    }
  });

  // Get all quizzes for user
  app.get("/api/quizzes", async (req, res) => {
    try {
      const userId = 'default-user'; // In production, get from session
      const quizzes = await storage.getQuizzesByUser(userId);
      res.json(quizzes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quizzes" });
    }
  });

  // Get quiz
  app.get("/api/quizzes/:id", async (req, res) => {
    try {
      const quiz = await storage.getQuiz(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }
      res.json(quiz);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quiz" });
    }
  });

  // Grade quiz
  app.post("/api/quizzes/:id/grade", async (req, res) => {
    try {
      const quiz = await storage.getQuiz(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      const { answers } = req.body;
      const questions = quiz.questions as any[];
      
      let correctCount = 0;
      const results = questions.map((question, index) => {
        const userAnswer = answers[index];
        const correctAnswer = question.answer[0]; // First correct answer
        const isCorrect = userAnswer === correctAnswer;
        
        if (isCorrect) correctCount++;
        
        return {
          questionIndex: index,
          question: question.stem,
          userAnswer,
          correctAnswer,
          isCorrect,
          rationale: question.rationale
        };
      });

      const score = Math.round((correctCount / questions.length) * 100);

      // Save attempt
      const attempt = await storage.createQuizAttempt({
        quizId: req.params.id,
        userId: req.body.userId || 'default-user',
        answers,
        score,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        timeSpent: req.body.timeSpent || 0,
        completed: true
      });

      res.json({
        score,
        correctCount,
        totalQuestions: questions.length,
        results,
        attemptId: attempt.id
      });
    } catch (error) {
      console.error('Quiz grading error:', error);
      res.status(500).json({ error: "Failed to grade quiz" });
    }
  });

  // ==== STUDY PLAN ROUTES ====
  
  // Get all study plans for user
  app.get("/api/study-plans", async (req, res) => {
    try {
      const userId = 'default-user'; // In production, get from session
      const plans = await storage.getStudyPlansByUser(userId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch study plans" });
    }
  });

  // Create study plan
  app.post("/api/study-plans", async (req, res) => {
    try {
      const { exam, subjects, topics, intensity, examDate, sessionDuration } = req.body;
      
      const schedule = await geminiService.generateStudyPlan({
        subjects,
        topics,
        exam,
        grade: req.body.grade || 'Class 12',
        intensity,
        examDate,
        sessionDuration
      });

      const plan = await storage.createStudyPlan({
        userId: req.body.userId || 'default-user',
        title: `${exam} Study Plan`,
        exam,
        subjects,
        schedule,
        preferences: {
          intensity,
          sessionDuration,
          examDate
        },
        status: 'active'
      });

      res.json(plan);
    } catch (error) {
      console.error('Study plan creation error:', error);
      res.status(500).json({ error: "Failed to create study plan" });
    }
  });

  // Get study plan
  app.get("/api/study-plans/:id", async (req, res) => {
    try {
      const plan = await storage.getStudyPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: "Study plan not found" });
      }
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch study plan" });
    }
  });

  // ==== NOTES ROUTES ====
  
  // Get all notes for user
  app.get("/api/notes", async (req, res) => {
    try {
      const userId = 'default-user'; // In production, get from session
      const notes = await storage.getNotesByUser(userId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  // Create note
  app.post("/api/notes", async (req, res) => {
    try {
      const note = await storage.createNote({
        userId: req.body.userId || 'default-user',
        title: req.body.title || 'Untitled Note',
        content: req.body.content || { cues: '', notes: '', summary: '' },
        sources: req.body.sources || [],
        flashcards: req.body.flashcards || [],
        tags: req.body.tags || []
      });
      res.json(note);
    } catch (error) {
      console.error('Note creation error:', error);
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  // Summarize content for notes
  app.post("/api/notes/summarize", async (req, res) => {
    try {
      const { content, urls, language = 'en' } = req.body;
      
      let textContent = content || '';
      
      // If URLs provided, fetch and extract content (simplified)
      if (urls && urls.length > 0) {
        // In production, would implement proper URL content extraction
        textContent += '\n[URL content extraction not implemented in demo]';
      }

      const cornellNotes = await geminiService.generateCornellNotes(textContent, language);
      
      const note = await storage.createNote({
        userId: req.body.userId || 'default-user',
        title: req.body.title || 'Generated Notes',
        content: cornellNotes,
        sources: urls || [],
        flashcards: cornellNotes.flashcards || [],
        tags: req.body.tags || []
      });

      res.json({ noteId: note.id, content: cornellNotes });
    } catch (error) {
      console.error('Notes summarization error:', error);
      res.status(500).json({ error: "Failed to generate notes" });
    }
  });

  // Get note
  app.get("/api/notes/:id", async (req, res) => {
    try {
      const note = await storage.getNote(req.params.id);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch note" });
    }
  });

  // Update note
  app.patch("/api/notes/:id", async (req, res) => {
    try {
      const updatedNote = await storage.updateNote(req.params.id, req.body);
      if (!updatedNote) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json(updatedNote);
    } catch (error) {
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  // ==== QUICK TOOLS ROUTES ====
  
  // Explain concept
  app.post("/api/tools/explain", async (req, res) => {
    try {
      const { concept, depth = 'standard', context } = req.body;
      const explanation = await geminiService.explainConcept(concept, depth, context);
      res.json({ explanation });
    } catch (error) {
      res.status(500).json({ error: "Failed to explain concept" });
    }
  });

  // Generate hint
  app.post("/api/tools/hint", async (req, res) => {
    try {
      const { question, context } = req.body;
      const hint = await geminiService.generateHint(question, context);
      res.json({ hint });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate hint" });
    }
  });

  // Show example
  app.post("/api/tools/example", async (req, res) => {
    try {
      const { topic, difficulty = 'standard' } = req.body;
      const example = await geminiService.generateExample(topic, difficulty);
      res.json({ example });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate example" });
    }
  });

  // Generate summary
  app.post("/api/tools/summary", async (req, res) => {
    try {
      const { messages, context } = req.body;
      const summary = await geminiService.generateSummary(messages, context);
      res.json({ summary });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions for async processing
async function processDocumentAsync(documentId: string, buffer: Buffer, ragService: RAGService) {
  try {
    // In production, would use proper PDF parsing library
    const text = buffer.toString('utf-8');
    
    await ragService.ingestDocument(documentId, text, {
      title: `Document ${documentId}`,
      type: 'pdf',
      source: documentId
    });

    await storage.updateDocument(documentId, {
      status: 'ready',
      pages: Math.ceil(text.length / 2000), // Rough page estimate
      tokens: Math.ceil(text.length / 4) // Rough token estimate
    });

    console.log(`Document ${documentId} processed successfully`);
  } catch (error) {
    console.error(`Failed to process document ${documentId}:`, error);
    await storage.updateDocument(documentId, { status: 'error' });
  }
}

async function processURLAsync(documentId: string, url: string, ragService: RAGService) {
  try {
    // In production, would implement proper URL content extraction
    const text = `[URL content from ${url} - extraction not implemented in demo]`;
    
    await ragService.ingestDocument(documentId, text, {
      title: url,
      type: 'url',
      source: documentId
    });

    await storage.updateDocument(documentId, {
      status: 'ready',
      pages: 1,
      tokens: Math.ceil(text.length / 4)
    });

    console.log(`URL ${url} processed successfully`);
  } catch (error) {
    console.error(`Failed to process URL ${url}:`, error);
    await storage.updateDocument(documentId, { status: 'error' });
  }
}
