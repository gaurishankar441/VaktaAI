# VaktaAI Codebase Audit - Agentic RAG Upgrade

**Date:** September 30, 2025  
**Scope:** Full codebase audit for Doc Chat and AI Tutor code paths  
**Goal:** Prepare for Agentic RAG + Socratic Tutor transformation

---

## Executive Summary

**Current State:** VaktaAI is a functional RAG-based learning platform with document chat, AI tutoring, quizzes, flashcards, and notes. However, both Doc Chat and AI Tutor lack agentic capabilities, web verification, and pedagogical sophistication.

**Key Findings:**
- ✅ **Solid Foundation:** Vector RAG with Cohere reranking, SSE streaming, multi-format document processing
- ✅ **Token Issues Fixed:** Both Doc Chat (4600+ tokens) and AI Tutor (4800 tokens) properly allocated
- ❌ **No Web Integration:** No web search, no claim verification, no external source citations
- ❌ **No Agentic Loop:** No ReAct planning, no self-critique, no iterative refinement
- ❌ **Basic Tutoring Only:** No Socratic method, no lesson planning, no adaptive difficulty, no mastery tracking

---

## Part A: Detailed Audit Findings

### 1. Document Chat (RAG) - Current Architecture

**Path:** `server/services/rag.ts` → `server/routes.ts` → `client/src/pages/Chat.tsx`

#### ✅ What Works:
1. **Vector Retrieval Pipeline:**
   - Pinecone vector store with namespaces per document
   - Cohere reranking (top-k*2 → top-k)
   - Semantic search with relevance scoring
   - Document-level relevance aggregation

2. **Streaming:**
   - Server-side SSE properly configured (`text/event-stream`)
   - OpenAI streaming with token buffering
   - Proper headers (Cache-Control, Connection: keep-alive)

3. **Token Management:**
   - Dynamic token allocation based on query complexity
   - Context size estimation (char/4 approximation)
   - 15% estimation buffer for tokenizer variance
   - Recent fix: 4600+ tokens for JSON responses

4. **Citations:**
   - Page numbers for PDFs
   - Timestamps for audio/video
   - Document titles and sources tracked
   - Chunk-level citation metadata

#### ❌ Critical Gaps:

1. **No Web Search/Verification:**
   - Answer only from uploaded documents
   - No fact-checking against external sources
   - No contradiction detection
   - No uncertainty flagging

2. **No Agentic Loop:**
   - No planning phase (ReAct)
   - No self-critique (Self-RAG)
   - No claim extraction
   - No verification workflow (CoVe)

3. **Client-Side Streaming Not Used:**
   - `grep` shows no `EventSource` usage in client
   - Streaming endpoint exists but client uses regular fetch
   - Missing real-time token rendering

4. **Limited Error Handling:**
   - Document processing failures show generic errors
   - No retry mechanism for transient failures
   - Truncation still possible (though improved)

5. **Vector Isolation:**
   - Pinecone: Namespaces per document ✅
   - Qdrant: Single collection (no isolation) ⚠️
   - No workspace/user-level isolation

---

### 2. AI Tutor - Current Architecture

**Path:** `server/services/aiTutor.ts` → `server/routes.ts` → `client/src/pages/Tutor.tsx`

#### ✅ What Works:
1. **Session Management:**
   - User-specific tutor sessions
   - Subject, grade level, topic tracking
   - Conversation history persistence

2. **Prompt Engineering:**
   - Pedagogical system prompts
   - Conversation context included
   - Message type classification

3. **Token Allocation:**
   - Recent fix: 4800 tokens (base 3000 + boost 1000 + buffer 800)
   - JSON response format support

#### ❌ Critical Gaps:

1. **No Lesson Planning:**
   - No learning objectives
   - No prerequisite checks
   - No checkpoint creation
   - No progress milestones

2. **No Socratic Method:**
   - Directly answers questions
   - No guided inquiry
   - No scaffolding/segmentation
   - No deliberate cognitive load management

3. **No Adaptive Difficulty:**
   - No Bloom's taxonomy targeting
   - No mastery tracking
   - No difficulty adjustment based on performance
   - Static tutoring regardless of learner level

4. **No Feedback Engine:**
   - Generic responses
   - No Hattie's feedback levels (task/process/self-regulation)
   - No actionable next steps
   - No specific hints or micro-exercises

5. **No Citations:**
   - Tutor explains concepts without source attribution
   - No verification of factual claims
   - No worked example sources

6. **Schema Limitations:**
   - No `lesson_plans` table
   - No `mastery_state` tracking
   - No `bloom_level_progress`
   - No `attempt_history` for adaptation

---

### 3. Document Processing Pipeline

**Path:** `server/services/documentProcessor.ts`

#### ✅ What Works:
1. **Multi-Format Support:**
   - PDF: `pdf-parse` extraction
   - PPTX/DOCX: `mammoth`/`cheerio` extraction
   - Audio/Video: Transcription via OpenAI Whisper
   - YouTube: `youtube-transcript` + `youtubei.js`
   - URL: `@mozilla/readability` + `cheerio`

2. **Chunking Strategy:**
   - Configurable chunk size (default 1000 chars)
   - Overlap (200 chars) for context continuity
   - Metadata preservation (pages, timestamps)

3. **Status Tracking:**
   - `uploading` → `processing` → `indexed` → `failed`
   - Error messages stored in `processingError` field

#### ❌ Gaps:

1. **No Retry Logic:**
   - Transient failures (network, API rate limits) cause permanent failure
   - No exponential backoff
   - No partial success handling

2. **Error Messages Too Generic:**
   - "Failed to process document" doesn't help users debug
   - No specific guidance (e.g., "PDF is password-protected")

3. **No Progress Updates:**
   - Large documents show no intermediate progress
   - Users can't see chunking/embedding progress

---

### 4. Streaming Implementation

**Server-Side (✅ Working):**
- `server/services/openai.ts`: `createStreamingResponse()`
- Proper SSE headers: `Content-Type: text/event-stream`
- Token buffering with `data:` events
- End signal: `data: [DONE]`

**Client-Side (❌ Not Used):**
- No `EventSource` found in `client/src/**`
- Chat interface likely uses regular fetch
- Streaming endpoint defined but unused

---

### 5. Database Schema Review

**Path:** `shared/schema.ts`

#### ✅ Current Tables (Well-Designed):
- `users`, `sessions`, `settings` (Auth)
- `folders`, `files` (Organization)
- `documents`, `chunks` (RAG)
- `chat_threads`, `chat_messages` (Doc Chat)
- `tutor_sessions`, `tutor_messages` (Tutor)
- `quizzes`, `quiz_questions`, `quiz_attempts` (Assessment)
- `flashcard_decks`, `flashcards`, `flashcard_reviews` (SRS)
- `notes` (Note-taking)

#### ❌ Missing Tables for Agentic Features:

**For Agentic RAG:**
1. `web_search_cache` - Cache web search results
2. `verification_history` - Track claim verifications
3. `agentic_plans` - Store ReAct plans
4. `tool_executions` - Audit trail for tool calls

**For Socratic Tutor:**
1. `lesson_plans` - Store generated lesson plans
2. `mastery_tracking` - Track learner mastery per topic
3. `bloom_progress` - Bloom level progression
4. `tutor_feedback_history` - Feedback given per attempt

---

## Part B: Issues Fixed During Audit

### Issue 1: Token Truncation (RESOLVED ✅)

**Problem:**
- Doc Chat: Responses truncated mid-JSON (finish_reason: "length")
- AI Tutor: Same issue (finish_reason: "length", content_length: 0)

**Root Cause:**
- Insufficient max_tokens for JSON responses
- Character-to-token estimation error (10-20% variance)
- No buffer for JSON structure overhead

**Fix Applied:**
- **Doc Chat:** 4600+ tokens (base + context boost + 15% buffer)
- **AI Tutor:** 4800 tokens (base 3000 + boost 1000 + 20% buffer)
- Logs now show: `[RAG] Token allocation: desired=X, available=Y, final=Z`

**Evidence:**
```
# Before Fix:
[OpenAI] Max tokens: 1500
[OpenAI] Finish reason: length (TRUNCATED!)
[OpenAI] Content length: 0

# After Fix:
[RAG] Token allocation: desired=4600, available=120000, final=4600
[OpenAI] Finish reason: stop ✅
[OpenAI] Content length: 3200+ characters
```

---

## Part C: Security Considerations

### Current State:
- ✅ Replit Auth (OIDC) with session management
- ✅ ACL for object storage (user-level permissions)
- ✅ SQL injection protection via Drizzle ORM
- ✅ Environment variable secrets (OpenAI, Cohere, Pinecone)

### Required for Web Fetch (SSRF Prevention):
- ❌ No protocol allow-list (HTTP/HTTPS only)
- ❌ No private IP blocking (127.0.0.1, 192.168.x.x, 10.x.x.x)
- ❌ No size limits on fetched content
- ❌ No timeout enforcement
- ❌ No redirect limit (prevent infinite loops)

---

## Part D: Performance & Scalability

### Current Bottlenecks:
1. **Cohere Reranking:** Synchronous, adds 200-500ms latency
2. **Embedding Generation:** Batch size could be optimized
3. **No Caching:** Web search results should be cached (10-30 min)
4. **No Rate Limiting:** Vulnerable to API abuse

### Recommendations:
1. Implement Redis cache for web search (query+host key)
2. Add rate limiting middleware (per-user, per-endpoint)
3. Consider async reranking for large result sets
4. Add request queuing for document processing

---

## Part E: Acceptance Test Readiness

### Doc Chat Agentic RAG:
| Criterion | Status | Notes |
|-----------|--------|-------|
| Plans → retrieves → researches | ❌ | No web search implemented |
| Verification summary | ❌ | No claim extraction/verification |
| Per-claim citations | ❌ | Only doc citations exist |
| Streams via SSE | ⚠️ | Server ready, client not using |
| Flags contradictions | ❌ | No contradiction detection |
| Upload reliability | ⚠️ | No retry mechanism |

### AI Tutor Socratic:
| Criterion | Status | Notes |
|-----------|--------|-------|
| Socratic questioning | ❌ | Direct answers only |
| Lesson plan creation | ❌ | No planning system |
| Adapts difficulty (Bloom) | ❌ | Static difficulty |
| Specific feedback | ❌ | Generic responses |
| Cites sources | ❌ | No citations |
| Scaffolds tasks | ❌ | No segmentation |

### Dev Quality:
| Criterion | Status | Notes |
|-----------|--------|-------|
| Unit tests | ❌ | No test suite |
| Integration tests | ❌ | No test suite |
| E2E tests | ❌ | No Playwright tests |
| SSRF guards | ❌ | No web fetch implementation |
| Rate limiting | ❌ | Not implemented |
| CI green | ❌ | No CI setup |

---

## Part F: Implementation Roadmap

### Phase 1: Infrastructure (Tasks 2-4, 11, 14-15)
1. Web search tool with SSRF guards
2. Web fetch tool with security policies
3. Database schema updates (new tables)
4. Environment variables
5. Rate limiting and caching

### Phase 2: Agentic RAG (Tasks 5-6)
1. Agent orchestrator (ReAct loop)
2. Claim verification system
3. Verification summary UI

### Phase 3: Socratic Tutor (Tasks 7-10, 13)
1. Lesson planner
2. Socratic probing engine
3. Feedback engine (Hattie's levels)
4. Updated prompts and UI

### Phase 4: Testing (Tasks 16-18)
1. Unit tests (claim verification, SSRF, lesson planning)
2. Integration tests (full flows)
3. E2E Playwright tests

### Phase 5: Documentation (Tasks 19-21)
1. PROMPTS.md (all agent prompts)
2. SECURITY.md (SSRF policy)
3. DEMO_SCRIPTS.md (scripted demos)

---

## Part G: Risk Assessment

### High Risk:
1. **Web Fetch SSRF:** Critical security vulnerability if not properly guarded
2. **API Cost:** Web search + verification increases OpenAI/Cohere usage significantly
3. **Latency:** Agentic loop adds 2-5 seconds per query

### Medium Risk:
1. **Complexity:** Agentic systems harder to debug and maintain
2. **False Positives:** Verification may incorrectly flag contradictions
3. **Breaking Changes:** Schema updates may require data migration

### Low Risk:
1. **Backward Compatibility:** Existing features continue to work
2. **Progressive Enhancement:** Can roll out features incrementally

---

## Conclusion

**Verdict:** The codebase is well-architected and ready for the agentic upgrade. Token truncation issues are resolved. The primary work ahead is:

1. **Add web search + verification** (new capability)
2. **Implement agent orchestrator** (new architecture)
3. **Add Socratic tutoring** (new pedagogy)
4. **Comprehensive testing** (quality assurance)

**Estimated Effort:** 
- Infrastructure: 4-6 hours
- Agentic RAG: 6-8 hours
- Socratic Tutor: 6-8 hours
- Testing: 4-6 hours
- Documentation: 2-3 hours
- **Total: 22-31 hours**

**Next Steps:** Proceed with Phase 1 (Infrastructure) starting with web search tool implementation.
