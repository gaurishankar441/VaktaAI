# VaktaAI - AI-Powered Learning Platform

## Overview

VaktaAI is a comprehensive AI-powered educational platform designed to transform static educational content (documents, videos) into interactive learning experiences. It leverages AI and RAG (Retrieval-Augmented Generation) to offer personalized features such as document chat, AI tutoring, quiz generation, flashcard creation, and structured note-taking. The platform aims to enhance learning through semantic search, adaptive study tools, and an innovative agentic RAG system for claim verification.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React, Vite, TypeScript, Tailwind CSS, and shadcn/ui, providing a fast, accessible, and customizable user interface. Key features include a dashboard, multi-document chat, AI tutor, structured notes, auto-generated quizzes, spaced repetition flashcards, and resource management. Routing is handled by wouter, and server state management by TanStack Query.

### Backend Architecture

The backend is an Express.js server with TypeScript, implementing a RESTful API. It uses a service-oriented architecture for clear separation of concerns, including dedicated services for storage, RAG, OpenAI, Pinecone, Cohere, document processing, AI tutoring, quiz generation, and flashcard generation. Google Cloud Storage (via Replit Object Storage) handles file storage with an ACL system. Authentication is passwordless, using SMS OTP via Twilio Verify.

### Database Architecture

The system utilizes a serverless PostgreSQL database (Neon) with Drizzle ORM for type-safe queries. The schema supports core user management, content organization (folders, files, documents, chunks), and all learning features including chat threads, tutor sessions, notes, quizzes, and flashcards. Design decisions include soft deletes, JSON metadata fields, enum types, and foreign key constraints for data integrity.

### RAG (Retrieval-Augmented Generation) Pipeline

VaktaAI's RAG pipeline involves document ingestion, chunking, and embedding using OpenAI's `text-embedding-3-small` model. Vectors are stored in Pinecone, and retrieval is enhanced with Cohere's reranking. GPT-3.5-turbo streams responses, and citations link generated content back to source chunks.

### Agentic RAG with Claim Verification

An advanced Agentic RAG system verifies factual claims in AI responses using web sources. It employs a stateful ReAct loop (Reason-Act-Observe-Reflect) with an Orchestrator, Web Search Tool (Tavily, Bing, SerpAPI), and Web Fetch Tool. Robust security features are implemented for the Web Fetch Tool, including DNS rebinding prevention, private IP blocking, and resource protection, to ensure secure and reliable external data retrieval.

### Authentication & Authorization

**Last Updated:** October 1, 2025

**Strategy:** SMS OTP (Twilio Verify) with passwordless authentication

**Flow:**
1. User visits login page (`/login`)
2. User enters phone number → POST `/api/auth/otp/start`
3. Backend normalizes phone to E.164, sends 6-digit OTP via Twilio Verify SMS
4. User enters OTP code → POST `/api/auth/otp/verify`
5. Backend verifies with Twilio, finds/creates user by phone_e164
6. Session regenerated (prevents fixation), userId stored in session
7. Session cookie (httpOnly, secure in prod, sameSite=lax) returned to client
8. Subsequent requests validated via `requireAuth` middleware

**Phone Number Handling:**
- Normalization: India-focused (10-digit → +91, 12-digit starting with 91 → +)
- Validation: E.164 format `/^\+[1-9]\d{1,14}$/`
- Storage: `phone_e164` column (varchar, unique, not null)

**Rate Limiting:**
- 5 OTP requests per 10 minutes per normalized phone number
- In-memory Map-based rate limiter with automatic cleanup
- Prevents SMS abuse and brute-force attacks

**Session Management:**
- Express-session with connect-pg-simple (PostgreSQL session store)
- Sessions table stores persistent session data
- 7-day session lifetime
- Session regeneration on login (prevents session fixation)
- HttpOnly, secure (prod), sameSite=lax cookies
- Sessions persist across server restarts

**User Model:**
- Phone-based authentication: `phone_e164` as unique identifier
- Plan tiers supported (free, premium, etc.)
- Soft deletes for GDPR compliance

**Environment Variables:**
- `TWILIO_ACCOUNT_SID`: Twilio account identifier
- `TWILIO_AUTH_TOKEN`: Twilio authentication token  
- `TWILIO_VERIFY_SID`: Twilio Verify service SID
- `SESSION_SECRET`: Express session secret (defaults to dev secret)
- `OTP_CODE_TTL_SECONDS`: OTP expiration time (default: 180)
- `OTP_RESEND_COOLDOWN_SECONDS`: Resend cooldown (default: 45)

**Security Features:**
- No passwords stored or managed
- Session regeneration prevents fixation attacks
- Rate limiting prevents SMS abuse
- E.164 normalization prevents duplicate accounts
- PostgreSQL session store for production persistence

**Note on Twilio Credentials:** 
The Twilio integration is configured but requires valid credentials. If you see "Authenticate" errors, verify:
1. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID are correctly set
2. Twilio account is active and has Verify service created
3. Account has sufficient SMS credits
4. Verify service is configured for SMS channel

## External Dependencies

### Third-Party Services

-   **Google Cloud Storage (Replit Object Storage):** File storage for uploaded documents, integrated via Replit sidecar.
-   **Pinecone:** Vector database for document embeddings, with OpenAI's `text-embedding-3-small` model.
-   **OpenAI:** AI services for embeddings and text generation (GPT-3.5-turbo), with streaming responses.
-   **Cohere:** Semantic reranking (Rerank v3/3.5) for improved retrieval quality.
-   **Neon Database:** Serverless PostgreSQL database for persistent data storage.
-   **Twilio Verify:** SMS OTP service for passwordless authentication.
-   **Tavily, Bing, SerpAPI:** Web search providers used by the Agentic RAG system.

### Key npm Packages

-   **UI Components:** `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
-   **Data Management:** `@tanstack/react-query`, `drizzle-orm`, `zod`.
-   **File Upload:** `@uppy/core`, `@uppy/dashboard`, `@uppy/aws-s3`, `@uppy/react`.
-   **Routing:** `wouter`.
-   **Development:** `vite`, `typescript`, `tsx`, `esbuild`.
-   **Authentication:** `express-session`, `connect-pg-simple`, `twilio`.
