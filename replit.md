# VaktaAI - Educational Platform

## Overview

VaktaAI is an AI-powered educational platform designed for Indian students preparing for competitive exams (JEE, NEET, CBSE). The platform provides personalized tutoring, document-based learning, adaptive quizzes, study planning, and Cornell-style note-taking. It leverages Google's Gemini AI and Anthropic's Claude for intelligent tutoring and content generation, with hybrid RAG (Retrieval-Augmented Generation) for document understanding.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and caching
- Shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens

**Design System:**
- Color scheme: Indigo primary (#4F46E5), with success, warning, and danger variants
- Typography: Inter for UI, STIX Two Math for mathematical equations
- Accessibility-first approach with keyboard navigation (Cmd/Ctrl-K command palette)
- 8-point spacing system, rounded-xl (12px) borders, motion under 200ms
- Responsive design with mobile breakpoint at 768px

**UI Pattern Philosophy:**
- "3-clicks max" to any core action
- Modal-based flows for multi-step processes (blocking)
- Popover for quick parameter adjustments (anchored, non-blocking)
- Side drawer for quick actions and utilities (non-blocking)
- WAI-ARIA compliance for modals with focus traps and proper labeling

**Application Structure:**
- App shell with left navigation rail, main content canvas, and optional right drawer
- Five main feature modules: AI Tutor, DocChat, Quiz, Study Planner, and Notes
- Shared UI components for consistency (LaTeX rendering, streaming text, etc.)

### Backend Architecture

**Technology Stack:**
- Express.js server with TypeScript
- Drizzle ORM for type-safe database operations
- Neon serverless PostgreSQL database
- Server-Sent Events (SSE) for real-time streaming responses
- Multer for file upload handling (50MB limit)

**API Design:**
- RESTful endpoints under `/api` prefix
- Streaming endpoints for AI responses using EventSource
- File upload endpoints for PDF and document processing
- Session-based data storage with proper relational structures

**Data Models:**
The schema defines seven core entities:

1. **Users**: Profile data including class, board, and learning streak
2. **Chat Sessions**: Conversation contexts for tutor and docchat modes
3. **Messages**: Individual messages within chat sessions with role-based tracking
4. **Documents**: Uploaded PDFs, YouTube videos, or URLs with processing status
5. **Quizzes**: Generated assessments with questions and correct answers
6. **Quiz Attempts**: User responses and scoring data
7. **Study Plans**: Structured learning schedules with tasks and reminders
8. **Notes**: Cornell-style notes with big ideas, key terms, and flashcards
9. **Flashcards**: Spaced repetition learning cards

**AI Service Architecture:**

The system uses a dual-AI approach:

- **Primary AI (Gemini)**: Google's Gemini 2.5 Flash for fast tutoring, quiz generation, and study planning. Gemini 2.5 Pro for complex reasoning tasks
- **Fallback AI (Claude)**: Anthropic's Claude Sonnet 4 for complex numerical reasoning and problem-solving when needed

**RAG Implementation:**
- Hybrid search combining BM25 (keyword) and vector similarity (BGE-M3 embeddings)
- Text chunking with 800-character chunks and 80-character overlap
- In-memory vector store (production would use Qdrant)
- BGE-reranker-v2-m3 for result ranking
- Citation tracking for grounded responses

### Core Features

**1. AI Tutor:**
- Multi-step launcher modal (4-step wizard) for session configuration
- Subject, level, topic, and language selection
- Streaming responses with Server-Sent Events
- Lesson plan panel showing learning objectives and progress
- Quick tools for explanations, hints, examples, and practice

**2. DocChat:**
- PDF, YouTube, and URL ingestion
- Document selection and viewing interface
- PDF.js integration for document rendering (placeholder in current implementation)
- Context-aware chat with citations from documents
- Quick actions for summaries, highlights, quiz generation, and flashcard creation

**3. Quiz System:**
- AI-generated questions based on topics or documents
- Multiple difficulty levels (easy, medium, hard)
- Real-time quiz player with progress tracking
- Question flagging and navigation
- Detailed results with explanations and rationales
- Performance analytics

**4. Study Planner:**
- Wizard-based plan creation
- Exam-specific curriculum alignment (JEE, NEET, CBSE, CUET)
- Intensity levels (light, regular, intense)
- Multi-component integration (AI tutor, quizzes, flashcards, documents)
- Calendar-based task scheduling
- Smart reminders

**5. Cornell Notes:**
- Structured note-taking with big idea, key terms, and summary sections
- Auto-generated flashcards from notes
- Audio, video, and URL-to-note conversion
- Tag-based organization
- Export capabilities

### External Dependencies

**AI Services:**
- Google Generative AI SDK (@google/genai) for Gemini API access
- Anthropic SDK (@anthropic-ai/sdk) for Claude API access
- Environment variables required: `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY`, `ANTHROPIC_API_KEY` or `CLAUDE_API_KEY`

**Database:**
- Neon serverless PostgreSQL (@neondatabase/serverless)
- WebSocket support for serverless connections
- Drizzle Kit for migrations and schema management
- Environment variable required: `DATABASE_URL`

**UI Component Libraries:**
- Radix UI primitives for accessible components (dialogs, dropdowns, tooltips, etc.)
- Shadcn/ui as component wrapper
- Lucide React for icons
- React Hook Form with Zod validation for forms

**Development Tools:**
- Replit-specific plugins for development (vite-plugin-runtime-error-modal, cartographer, dev-banner)
- TSX for TypeScript execution in development
- ESBuild for production builds

**Potential Future Integrations:**
- Qdrant vector database for production RAG
- PDF.js for client-side PDF rendering
- KaTeX for LaTeX mathematical equation rendering
- YouTube Data API for video transcription
- Audio transcription services for voice-to-note features

**Content Alignment:**
- CBSE, ICSE, IB, and State Board curricula
- JEE (Main/Advanced) and NEET UG exam blueprints
- Official NTA and board curriculum mapping