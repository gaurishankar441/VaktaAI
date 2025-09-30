# VaktaAI - Developer Setup Guide

## 📖 Overview

VaktaAI is an AI-powered educational platform that transforms static educational content into interactive, AI-enhanced learning experiences. The platform leverages RAG (Retrieval-Augmented Generation) technology to provide personalized learning through multiple modalities.

### Core Features
- 📄 **Document Chat (RAG)** - Chat with PDFs, DOCX, presentations, videos
- 🎓 **AI Tutor** - Personalized tutoring with pedagogical scaffolding
- 📝 **Smart Notes** - Structured note-taking with templates
- 📊 **Quiz Generator** - Auto-generated quizzes with Bloom's taxonomy
- 🎴 **Flashcards** - Spaced repetition system (SRS)
- 📁 **Resource Manager** - Hierarchical file organization
- ⚙️ **Settings & Privacy** - User preferences, data export

---

## 🏗️ Tech Stack

**Frontend:**
- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui components
- TanStack Query (v5) for state management
- Wouter for routing

**Backend:**
- Node.js + Express + TypeScript
- Drizzle ORM with Neon PostgreSQL
- Session-based auth (Replit Auth / OpenID Connect)

**AI & Vector Search:**
- OpenAI (GPT-5, text-embedding-3-small)
- Pinecone (vector database)
- Cohere (semantic reranking)

**Storage:**
- Google Cloud Storage (via Replit Object Storage)
- PostgreSQL session store

---

## 📂 Project Structure

```
vaktaai/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities
│   │   └── App.tsx        # Root component
│   └── index.html
│
├── server/                 # Express backend
│   ├── services/          # Business logic
│   │   ├── rag.ts        # RAG pipeline
│   │   ├── openai.ts     # OpenAI wrapper
│   │   ├── pinecone.ts   # Vector DB
│   │   ├── cohere.ts     # Reranking
│   │   ├── documentProcessor.ts
│   │   ├── aiTutor.ts
│   │   ├── quizGenerator.ts
│   │   └── flashcardGenerator.ts
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database interface
│   ├── replitAuth.ts      # Replit Auth (OIDC)
│   ├── objectStorage.ts   # GCS integration
│   ├── objectAcl.ts       # Access control lists
│   ├── index.ts           # Entry point
│   └── vite.ts            # Vite dev server
│
├── shared/                 # Shared code
│   └── schema.ts          # Database schema + types
│
├── test/                   # Test files
│
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
├── tailwind.config.ts      # Tailwind config
├── drizzle.config.ts       # Drizzle ORM config
└── replit.md               # Project documentation

```

---

## 🚀 Prerequisites

### Required Software
- **Node.js** v18+ (v20 recommended)
- **npm** or **pnpm**
- **Git** for version control

### Required API Keys

Create a `.env` file in the project root with these variables:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# OpenAI API
OPENAI_API_KEY=sk-...

# Cohere API (for reranking)
COHERE_API_KEY=...

# Pinecone (Vector Database)
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=vaktaai-embeddings

# Optional: Qdrant (Alternative to Pinecone)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=...
QDRANT_COLLECTION_NAME=vaktaai_embeddings

# Google Cloud Storage (Replit Object Storage)
# These are auto-configured in Replit environment
# For local dev, you may need to configure GCS credentials

# Authentication (Replit Auth)
SESSION_SECRET=your-secret-key-here
REPL_ID=your-repl-id
ISSUER_URL=https://replit.com/oidc
REPLIT_DOMAINS=.replit.dev,.replit.app

# Optional: Qdrant (Alternative to Pinecone)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=...
```

### Getting API Keys

1. **OpenAI**: https://platform.openai.com/api-keys
2. **Cohere**: https://dashboard.cohere.com/api-keys
3. **Pinecone**: https://app.pinecone.io/
4. **Replit Object Storage**: Auto-configured in Replit

---

## 📦 Installation

### 1. Clone the Repository

```bash
# If on Replit, fork the project
# If external, clone from GitHub/download

git clone <repository-url>
cd vaktaai
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Database Setup

The project uses **Neon PostgreSQL** with **Drizzle ORM**.

```bash
# Push schema to database (creates tables)
npm run db:push

# If you get data-loss warnings, force push
npm run db:push -- --force
```

**Note:** No manual migrations needed! Drizzle handles schema sync automatically.

### 4. Start Development Server

```bash
npm run dev
```

This starts:
- **Backend** (Express) on port 5000
- **Frontend** (Vite) on port 5000 (same port, proxied)

Open browser: `http://localhost:5000`

---

## 🛠️ Development Workflow

### Running the Application

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check
```

### Database Management

```bash
# Push schema changes to database
npm run db:push

# Force push (if data loss warning)
npm run db:push -- --force

# View database in Drizzle Studio
npx drizzle-kit studio
```

### File Upload Setup

VaktaAI uses **Replit Object Storage** (Google Cloud Storage) for file uploads.

**In Replit:**
- Object storage is auto-configured
- Files are stored in the default bucket
- Pre-signed URLs provide secure access

**For Local Development:**
- You may need to configure GCS credentials manually
- Or use local file storage for testing

---

## 🧪 Testing

### Manual Testing Checklist

1. **Authentication**
   - ✅ Login with Replit Auth
   - ✅ Session persistence
   - ✅ Protected routes redirect

2. **Document Upload**
   - ✅ Upload PDF, DOCX files
   - ✅ Processing status updates
   - ✅ Document indexed successfully

3. **Document Chat**
   - ✅ Create chat thread with documents
   - ✅ Ask questions, get AI responses
   - ✅ Citations show source chunks
   - ✅ Streaming responses work

4. **AI Tutor**
   - ✅ Start tutor session
   - ✅ Pedagogical scaffolding works
   - ✅ Session history persists

5. **Quizzes & Flashcards**
   - ✅ Generate quizzes from documents
   - ✅ Take quiz, submit answers
   - ✅ Create flashcard decks
   - ✅ Review with SRS scheduling

6. **Notes**
   - ✅ Create notes with templates
   - ✅ Rich text editing works
   - ✅ Save and retrieve notes

### Browser Testing

Test on:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if available)
- ✅ Mobile responsive design

---

## 📤 Export & Download

### Method 1: Download as ZIP from Replit

1. In Replit, click on **three dots** (⋯) in Files pane
2. Select **"Download as ZIP"**
3. Extract the ZIP file locally

### Method 2: Git Clone (if GitHub connected)

```bash
# If you've connected to GitHub
git clone https://github.com/your-username/vaktaai.git
cd vaktaai
npm install
```

### Method 3: Manual Git Setup

```bash
# Initialize git in your local copy
git init
git add .
git commit -m "Initial commit"

# Connect to GitHub
git remote add origin https://github.com/your-username/vaktaai.git
git branch -M main
git push -u origin main
```

### What's Included in Export

✅ **Full source code** (client, server, shared)  
✅ **Configuration files** (package.json, tsconfig.json, etc.)  
✅ **Documentation** (README.md, replit.md, this file)  
❌ **node_modules/** (excluded - run `npm install`)  
❌ **.env** (excluded - create your own)  
❌ **Database data** (export separately if needed)

---

## 🚢 Deployment

### Deploy on Replit

1. Click **"Deploy"** button in Replit
2. Configure environment variables
3. Publish as web service
4. Get `.replit.app` domain

### Deploy Elsewhere

#### Frontend (Vercel/Netlify)

```bash
npm run build
# Deploy the `dist/` folder
```

#### Backend (Render/Fly.io/Railway)

```bash
# Set environment variables on platform
# Deploy with start command: npm start
```

#### Docker (Optional)

```dockerfile
# Example Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Environment Variables for Production

Ensure all API keys and secrets are set in your deployment platform:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `COHERE_API_KEY`
- `PINECONE_API_KEY`
- `SESSION_SECRET`
- `REPL_ID` (if using Replit Auth)

---

## 🔧 Troubleshooting

### Common Issues

**1. Database Connection Error**
```
Error: connect ECONNREFUSED
```
**Fix:** Check `DATABASE_URL` is set correctly in `.env`

**2. PDF Upload Fails**
```
pdfParse is not defined
```
**Fix:** Already fixed! `pdf-parse` module is properly imported with TypeScript types.

**3. Token Allocation / Truncated Responses**
```
Responses cutting off mid-sentence
```
**Fix:** Already fixed! Optimized token allocation with 4600+ tokens + 15% buffer.

**4. Pinecone Connection Error**
```
Failed to initialize Pinecone
```
**Fix:** Verify `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` are correct.

**5. Port Already in Use**
```
Error: listen EADDRINUSE :::5000
```
**Fix:** Stop other processes on port 5000 or change port in `server/index.ts`

---

## 🤝 Contributing

### Branching Strategy

- `main` - Stable production branch
- `feat/*` - New features
- `fix/*` - Bug fixes
- `chore/*` - Maintenance tasks

### Commit Message Format

```
feat: Add quiz difficulty selection
fix: Resolve PDF parsing error
chore: Update dependencies
docs: Improve setup instructions
```

### Pull Request Process

1. Create feature branch: `git checkout -b feat/my-feature`
2. Make changes and test thoroughly
3. Commit: `git commit -m "feat: description"`
4. Push: `git push origin feat/my-feature`
5. Open PR with description of changes
6. Wait for code review and approval

---

## 📝 Architecture Documentation

For detailed architecture information, see:
- **replit.md** - Complete system architecture
- **shared/schema.ts** - Database schema definitions
- **server/services/** - Service layer documentation

---

## 🔐 Security Notes

- ✅ Never commit `.env` files
- ✅ Never expose API keys in client code
- ✅ Use environment variables for all secrets
- ✅ Session cookies are `httpOnly` and `secure`
- ✅ PostgreSQL session storage for auth
- ✅ Pre-signed URLs for file access

---

## 📊 System Status

After setup, verify:

```bash
✅ Server running on port 5000
✅ Database connected (Neon PostgreSQL)
✅ Pinecone index exists
✅ Object storage configured
✅ Frontend loads in browser
✅ Authentication works
✅ File upload functional
✅ Chat responses complete (no truncation)
```

---

## 🆘 Support

For issues or questions:
- Check **Troubleshooting** section above
- Review **replit.md** for architecture details
- Inspect server logs for error messages
- Test with browser console open (F12)

---

## 📜 License

MIT License - See LICENSE file for details

---

## 🎉 Happy Coding!

VaktaAI is production-ready with:
- ✅ Robust document processing (PDF, DOCX, web, YouTube)
- ✅ Optimized token allocation (no truncation)
- ✅ Complete RAG pipeline with reranking
- ✅ Full authentication & authorization
- ✅ Comprehensive error handling

**Start building amazing AI-powered learning experiences!** 🚀
