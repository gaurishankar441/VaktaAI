# EduShepherd - AI-Powered Learning Platform

## Overview

EduShepherd is a comprehensive educational platform that leverages AI and RAG (Retrieval-Augmented Generation) technology to provide personalized learning experiences. The platform enables students to interact with their study materials through multiple learning modalities.

## Features

### Core Functionality
- **📚 Document Management**: Upload and process PDFs, DOCX, PPTX, MP3, MP4 files
- **🌐 Web Content Ingestion**: Extract content from URLs and YouTube videos
- **💬 Document Chat**: RAG-powered Q&A with citations and multi-document support
- **🎓 AI Tutor**: Personalized tutoring with pedagogical scaffolding methods
- **📝 Notes**: Structured note-taking with templates (lecture, research, review, summary)
- **❓ Quizzes**: Auto-generated quizzes with Bloom's taxonomy classification
- **🎯 Flashcards**: Spaced repetition system (SRS) for effective memorization
- **📁 Resources**: File/folder management with hierarchical organization
- **⚙️ Settings**: Customizable AI model, temperature, theme preferences

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React + React Icons

### Backend
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Session Store**: connect-pg-simple
- **Authentication**: Replit Auth (OpenID Connect)

### AI & Data Services
- **LLM**: OpenAI GPT-5
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Vector Database**: Pinecone
- **Reranking**: Cohere Rerank v3
- **File Storage**: Google Cloud Storage (Replit Object Storage)

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Route components
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/          # Utilities and helpers
│   │   └── hooks/        # Custom React hooks
├── server/                # Backend Express server
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database abstraction layer
│   └── services/         # Business logic services
│       ├── rag.ts        # RAG pipeline
│       ├── openai.ts     # OpenAI integration
│       ├── pinecone.ts   # Vector database
│       ├── cohere.ts     # Reranking service
│       └── documentProcessor.ts  # Document ingestion
├── shared/               # Shared types and schemas
│   └── schema.ts        # Drizzle ORM schemas
└── attached_assets/     # Static assets

```

## Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL=your_neon_database_url

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key

# Cohere (Optional)
COHERE_API_KEY=your_cohere_api_key

# Session
SESSION_SECRET=your_session_secret

# Object Storage (Auto-configured in Replit)
PUBLIC_OBJECT_SEARCH_PATHS=configured_by_replit
PRIVATE_OBJECT_DIR=configured_by_replit
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables
4. Run database migrations:
   ```bash
   npm run db:push
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Database Schema

The application uses PostgreSQL with the following main tables:

- **users**: User profiles and authentication
- **documents**: Uploaded document metadata
- **chunks**: Document text chunks with embeddings
- **chat_threads**: Conversation threads
- **chat_messages**: Chat messages with citations
- **tutor_sessions**: AI tutoring sessions
- **notes**: User-created notes
- **quizzes**: Generated quizzes
- **flashcard_decks**: Flashcard collections
- **folders/files**: File management system

## RAG Pipeline Architecture

1. **Document Ingestion**: Files are processed and chunked with configurable overlap
2. **Embedding Generation**: Text chunks are embedded using OpenAI's text-embedding-3-small
3. **Vector Storage**: Embeddings stored in Pinecone with metadata
4. **Retrieval**: Semantic search with vector similarity
5. **Reranking**: Cohere improves relevance of retrieved chunks
6. **Generation**: GPT-5 generates responses with citations

## Security Features

- **XSS Prevention**: HTML content properly escaped before rendering
- **Authentication**: Session-based auth with CSRF protection
- **Input Validation**: Zod schemas validate all API inputs
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **File Upload Security**: Type validation and size limits
- **Thread Validation**: Prevents foreign key violations

## Testing

The application has been thoroughly tested with:
- All 9 feature pages functional
- Document ingestion from files, URLs, and YouTube
- RAG pipeline with citations
- Spaced repetition flashcards
- Quiz generation with difficulty levels
- Note-taking with templates
- File management system
- Settings persistence

## Performance Optimizations

- **Caching**: TanStack Query for API response caching
- **Streaming**: Server-sent events for AI responses
- **Lazy Loading**: Code splitting for route components
- **Database Indexing**: Optimized queries with proper indexes
- **Batch Processing**: Efficient document chunking

## Deployment

The application is designed to run on Replit and can be published using Replit's deployment system for a permanent URL.

## Recent Updates

- Fixed XSS vulnerability in chat messages
- Added thread validation for chat API
- Improved YouTube transcript extraction error handling
- Fixed flashcard import issues
- Enhanced document processing with null metadata filtering
- Added proper HTML escaping in markdown rendering

## License

This project was built as an educational platform demonstration.

## Support

For issues or questions, please refer to the technical documentation in `replit.md`.