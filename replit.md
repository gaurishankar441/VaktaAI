# VaktaAI - AI-Powered Learning Platform

## Overview

VaktaAI is a comprehensive educational platform that leverages AI and RAG (Retrieval-Augmented Generation) technology to provide personalized learning experiences. The platform enables students to interact with their study materials through multiple learning modalities including document chat, AI tutoring, quiz generation, flashcard creation, and structured note-taking.

**Core Purpose:** Transform static educational content (PDFs, presentations, documents, videos) into interactive, AI-enhanced learning experiences with semantic search, personalized tutoring, and adaptive study tools.

**Tech Stack:**
- Frontend: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Express.js (Node.js) with TypeScript
- Database: PostgreSQL via Neon with Drizzle ORM
- Authentication: Replit Auth with OpenID Connect
- File Storage: Google Cloud Storage (Replit Object Storage)
- Vector Database: Pinecone for embeddings
- AI Services: OpenAI (GPT-5, text-embedding-3-small) + Cohere (reranking)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Component Structure:**
- Uses shadcn/ui component library with Radix UI primitives for accessible, composable UI components
- Tailwind CSS for styling with CSS variables for theming (light/dark mode support)
- React Router (wouter) for client-side routing
- TanStack Query for server state management and caching

**Key Design Patterns:**
- Protected routes with authentication guards that redirect unauthenticated users
- Layout composition using MainLayout wrapper with AppSidebar
- Custom hooks for auth (`useAuth`) and toast notifications
- Separation of concerns: pages, components, hooks, and lib utilities

**Main Application Features:**
1. **Dashboard:** File upload, document management, quick stats
2. **Doc Chat:** RAG-powered chat interface with multi-document support and citations
3. **AI Tutor:** Personalized tutoring sessions with pedagogical scaffolding
4. **Notes:** Structured note-taking with templates (lecture, research, review, summary)
5. **Quizzes:** Auto-generated quizzes with Bloom's taxonomy classification
6. **Flashcards:** Spaced repetition system (SRS) with due card scheduling
7. **Resources:** File/folder management with hierarchical organization
8. **Settings:** User preferences for AI model, temperature, theme, privacy

**Rationale:** React + Vite provides fast development and hot module replacement. shadcn/ui components are customizable and accessible. TanStack Query handles caching and reduces unnecessary API calls.

### Backend Architecture

**API Design:**
- RESTful Express.js server with TypeScript
- Middleware: JSON parsing, logging, error handling
- Session-based authentication using Replit Auth (OpenID Connect)
- PostgreSQL session store for persistent sessions

**Service Layer Pattern:**
The backend uses a clean service-oriented architecture separating concerns:

1. **Storage Service (`server/storage.ts`):** Data access layer abstracting database operations
2. **RAG Service (`server/services/rag.ts`):** Retrieval-augmented generation with vector search and reranking
3. **OpenAI Service (`server/services/openai.ts`):** Wrapper for OpenAI API (embeddings, chat, streaming)
4. **Pinecone Service (`server/services/pinecone.ts`):** Vector database operations (upsert, query)
5. **Cohere Service (`server/services/cohere.ts`):** Semantic reranking for improved retrieval
6. **Document Processor (`server/services/documentProcessor.ts`):** Document ingestion, chunking, embedding
7. **AI Tutor Service (`server/services/aiTutor.ts`):** Tutoring logic with pedagogical methods
8. **Quiz Generator (`server/services/quizGenerator.ts`):** Quiz creation from document content
9. **Flashcard Generator (`server/services/flashcardGenerator.ts`):** Flashcard generation with SRS scheduling

**Object Storage Service:**
- Google Cloud Storage integration via Replit sidecar
- ACL (Access Control List) system for object-level permissions
- Supports user-based and group-based access policies
- Pre-signed URLs for secure file access

**Rationale:** Service layer separation allows for easier testing, maintenance, and potential migration. The ACL system provides fine-grained access control. Express is chosen for its simplicity and extensive middleware ecosystem.

### Database Architecture

**ORM Choice:** Drizzle ORM with Neon PostgreSQL (serverless)

**Schema Design (see `shared/schema.ts`):**

**Core Tables:**
- `users`: User profiles with plan tier, created via Replit Auth
- `sessions`: Session storage for authentication (required by connect-pg-simple)
- `settings`: User preferences (model, temperature, theme, privacy)

**Content Management:**
- `folders`: Hierarchical folder structure with parent-child relationships
- `files`: File metadata (filename, URL, type, size, MIME type)
- `documents`: Processed documents with status tracking and metadata
- `chunks`: Text chunks with embeddings stored in Pinecone (page/time references)

**Learning Features:**
- `chat_threads`: Multi-document chat conversations
- `chat_messages`: Messages with citations to source chunks
- `tutor_sessions`: AI tutor sessions with subject/grade/topic
- `tutor_messages`: Tutor conversation history
- `notes`: Structured notes with templates and word count
- `quizzes` + `quiz_questions` + `quiz_attempts`: Quiz system with Bloom's taxonomy
- `flashcard_decks` + `flashcards` + `flashcard_reviews`: SRS flashcard system

**Design Decisions:**
- Soft deletes via `deletedAt` timestamps
- JSON metadata fields for flexible schema evolution
- Enum types for controlled vocabularies (file types, difficulty levels, etc.)
- Foreign key cascades for data integrity
- Indexes on expire times and frequently queried fields

**Rationale:** Drizzle provides type-safe queries with minimal overhead. Neon serverless PostgreSQL scales automatically and works well with edge deployments. The schema supports all planned features while maintaining normalization.

### RAG (Retrieval-Augmented Generation) Pipeline

**Architecture:**
1. **Document Ingestion:** Upload → Process (extract text) → Chunk (with overlap)
2. **Embedding:** OpenAI text-embedding-3-small (1536 dimensions)
3. **Storage:** Vectors stored in Pinecone with namespace per document
4. **Retrieval:** Query → Embed → Vector similarity search → Cohere reranking
5. **Generation:** Top-K chunks → Context injection → GPT-5 streaming response
6. **Citations:** Track chunk IDs with page numbers or timestamps

**Chunking Strategy:**
- Configurable chunk size with overlap to maintain context
- Metadata preservation (page numbers for PDFs, timestamps for videos)
- Deduplication penalty to avoid redundant chunks

**Reranking:**
- Uses Cohere Rerank v3 to improve semantic relevance
- Reduces retrieval candidates (topK * 2) down to final topK
- Combines vector similarity with cross-encoder reranking

**Rationale:** This pipeline balances retrieval quality with performance. Pinecone provides fast vector search at scale. Cohere reranking significantly improves relevance over pure vector similarity. GPT-5 streaming provides responsive UX.

### Agentic RAG with Claim Verification

**Last Updated:** September 30, 2025

VaktaAI now includes an advanced **Agentic RAG system** that automatically verifies factual claims in AI responses using web sources. This transforms the platform from simple document chat into an intelligent system that validates its own outputs.

**Architecture:**

The agentic system implements a **stateful ReAct loop** (Reason-Act-Observe-Reflect):
1. **Extract Claims**: Parse AI response for factual claims requiring verification
2. **Think**: Plan verification strategy based on claim + history + available sources
3. **Act**: Execute action (web search, fetch URL, or conclude)
4. **Observe**: Analyze results and store in history
5. **Reflect**: Make final assessment with all gathered evidence

**Components:**

1. **Agent Orchestrator** (`server/agent/orchestrator.ts`)
   - Stateful ReAct loop with cumulative history
   - Manages tool execution and observation storage
   - Coordinates Think→Act→Observe→Reflect cycle
   - IP pinning per iteration to prevent DNS rebinding

2. **Web Search Tool** (`server/agent/tools/webSearch.ts`)
   - Multi-provider support: Tavily (recommended), Bing, SerpAPI
   - Rate limiting: 30 requests/minute per user
   - In-memory caching: 20-minute TTL
   - Returns URLs with titles, snippets, and relevance scores

3. **Web Fetch Tool** (`server/agent/tools/webFetch.ts`)
   - Production-ready SSRF protection (see Security section)
   - HTTPS-only, port allowlist (443 default)
   - DNS resolution with IP pinning via undici custom Agent
   - Per-hop validation for redirects (max 2)
   - Size limits (10MB) and timeouts (10s total, 5s connect)
   - Content-Type validation (text/html, text/plain, application/json)

4. **Verification UI** (`client/src/components/chat/VerificationSummary.tsx`)
   - Claim status badges (Supported/Contradicted/Uncertain)
   - Confidence scores with color coding
   - Expandable accordion with reasoning and sources
   - External links to web sources with snippets

**API Endpoint:**

```
POST /api/chat/verify-claims
Body: { responseText: string }
Response: {
  claims: Claim[],
  verifications: VerificationResult[],
  summary: string
}
```

**Security Features:**

**DNS Rebinding TOCTOU Prevention:**
- Pre-request DNS resolution validates ALL resolved IPs
- Custom undici Agent with controlled DNS lookup returns ONLY validated IPs
- Per-hop validation: Each redirect triggers fresh DNS resolution and IP re-pinning
- No trust in external DNS between validation and connection

**Private IP Blocking:**
- Comprehensive IPv4/IPv6 blocklist (RFC 1918, link-local, loopback, etc.)
- IPv6-mapped IPv4 normalization (e.g., `::ffff:127.0.0.1` → `127.0.0.1`)
- Explicit `localhost` blocking

**Resource Protection:**
- Size limits with streaming enforcement
- Total and connect timeouts
- Rate limiting per user
- Manual redirect following with validation

**Rationale:** Agentic RAG enables VaktaAI to self-verify claims against current web sources, reducing hallucinations and increasing trustworthiness. The stateful ReAct loop allows proper decision-making based on previous observations. SSRF protections ensure the agent can't be exploited to access internal services.

### Authentication & Authorization

**Strategy:** Replit Auth (OpenID Connect) with session-based authentication

**Flow:**
1. User visits protected route → Redirect to `/api/login`
2. Replit OIDC provider authenticates user
3. Session created and stored in PostgreSQL
4. Session cookie (httpOnly, secure) returned to client
5. Subsequent requests validated via `isAuthenticated` middleware

**Session Management:**
- 7-day session TTL with automatic cleanup
- `connect-pg-simple` for PostgreSQL session store
- CSRF protection on state-changing endpoints (implicit via session)

**User Model:**
- Minimal user data stored (email, name, profile image)
- First-class support for plan tiers (free, premium, etc.)
- Soft deletes for GDPR compliance

**Rationale:** Replit Auth simplifies authentication in the Replit environment. Session-based auth is simpler than JWT for server-rendered apps. PostgreSQL session storage ensures persistence across restarts.

## External Dependencies

### Third-Party Services

**Google Cloud Storage (Replit Object Storage):**
- Purpose: File storage for uploaded documents (PDFs, PPTX, DOCX, MP3, MP4)
- Integration: Via Replit sidecar with external_account credentials
- ACL: Custom object-level permissions system
- Usage: Pre-signed URLs for secure file access

**Pinecone:**
- Purpose: Vector database for document embeddings
- Model: OpenAI text-embedding-3-small (1536 dimensions)
- Organization: Namespace per document for isolation
- Fallback: Qdrant self-hosted option if Pinecone unavailable
- Configuration: `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`

**OpenAI:**
- Purpose: Embeddings (text-embedding-3-small) and text generation (GPT-5)
- Features: Streaming responses via Server-Sent Events (SSE)
- Configuration: `OPENAI_API_KEY`
- Note: GPT-5 is the latest model as of August 2025

**Cohere:**
- Purpose: Semantic reranking (Rerank v3/3.5)
- Usage: Improves retrieval quality after vector search
- Configuration: `COHERE_API_KEY`
- Model: rerank-english-v3.0 (default)

**Neon Database:**
- Purpose: Serverless PostgreSQL database
- Integration: Via `@neondatabase/serverless` with WebSocket support
- Configuration: `DATABASE_URL`
- Features: Auto-scaling, connection pooling

**Replit Auth:**
- Purpose: User authentication via OpenID Connect
- Configuration: `REPL_ID`, `ISSUER_URL`, `REPLIT_DOMAINS`, `SESSION_SECRET`
- Session Storage: PostgreSQL via `connect-pg-simple`

### Key npm Packages

**UI Components:**
- `@radix-ui/*`: Headless UI primitives (dialogs, dropdowns, accordions, etc.)
- `tailwindcss`: Utility-first CSS framework
- `class-variance-authority`: Component variant management
- `lucide-react`: Icon library

**Data Management:**
- `@tanstack/react-query`: Server state management and caching
- `drizzle-orm`: Type-safe ORM for PostgreSQL
- `zod`: Schema validation with drizzle-zod integration

**File Upload:**
- `@uppy/core`, `@uppy/dashboard`, `@uppy/aws-s3`, `@uppy/react`: File upload UI and S3 integration

**Routing:**
- `wouter`: Lightweight React router

**Development:**
- `vite`: Fast build tool and dev server
- `typescript`: Type safety
- `tsx`: TypeScript execution for dev server
- `esbuild`: Production bundling

**Authentication:**
- `openid-client`: OpenID Connect client
- `passport`: Authentication middleware
- `express-session`: Session management
- `connect-pg-simple`: PostgreSQL session store