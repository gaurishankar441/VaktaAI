import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// <important_do_not_delete>
const DEFAULT_MODEL_STR = "gemini-2.5-flash";
const REASONING_MODEL_STR = "gemini-2.5-pro";
// </important_do_not_delete>

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || ""
});

export interface TutorSessionConfig {
  subject: string;
  level: string;
  topic: string;
  language: string;
  board: string;
}

export interface QuizGenerationConfig {
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
  language: string;
  exam?: string;
  context?: string;
}

export interface StudyPlanConfig {
  subjects: string[];
  topics: string[];
  exam: string;
  grade: string;
  intensity: 'light' | 'regular' | 'intense';
  examDate?: string;
  sessionDuration: number;
}

export class GeminiService {
  
  // AI Tutor - Streaming chat with system prompt
  async* streamTutorResponse(
    messages: Array<{ role: string; content: string }>,
    config: TutorSessionConfig
  ) {
    const systemPrompt = this.buildTutorSystemPrompt(config);
    
    const response = await ai.models.generateContentStream({
      model: DEFAULT_MODEL_STR,
      config: {
        systemInstruction: systemPrompt,
      },
      contents: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))
    });

    for await (const chunk of response) {
      if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
        yield chunk.candidates[0].content.parts[0].text;
      }
    }
  }

  private buildTutorSystemPrompt(config: TutorSessionConfig): string {
    return `You are VaktaAI, a patient, rigorous conversational tutor for Indian students.
Exam context: ${config.board}. Class/Grade: ${config.level}. Subject: ${config.subject}. Topic: ${config.topic}.
Language: ${config.language}. Use Indian examples and units (₹, km, °C).

Teaching loop each turn:
1) TEACH one micro-concept (≤120 words) with a tiny example.
2) ASK one check question (MCQ, 4 options) aligned to ${config.board}.
3) If incorrect, EXPLAIN misconception, RE-TEACH simply.

Every 3 turns: a 3-bullet RECAP.
Use LaTeX for formulas ($...$). If using documents, cite them inline [Doc p.{page} §{heading}].
Tone: warm, encouraging. Keep pace adaptive.

Available tools: explain_concept, give_hint, show_example, practice_questions, get_summary`;
  }

  // Quiz Generation
  async generateQuiz(config: QuizGenerationConfig): Promise<any[]> {
    const systemPrompt = `Create ${config.count} exam-style questions for ${config.exam || 'general'} on ${config.topic}.
Language: ${config.language}. Difficulty: ${config.difficulty}. Types: mcq_single.

For each, return JSON:
{
  "type": "mcq_single",
  "stem": "...",
  "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
  "answer": ["A"], 
  "rationale": "Why correct & others aren't",
  "source_ref": "Standard textbook reference"
}

Constraints: single unambiguous key, plausible distractors, mix Bloom levels, match JEE/NEET pattern where applicable.
${config.context ? `\nContext: ${config.context}` : ''}`;

    const response = await ai.models.generateContent({
      model: REASONING_MODEL_STR,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  stem: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  answer: { type: "array", items: { type: "string" } },
                  rationale: { type: "string" },
                  source_ref: { type: "string" }
                },
                required: ["type", "stem", "options", "answer", "rationale"]
              }
            }
          },
          required: ["questions"]
        }
      },
      contents: [{
        role: "user",
        parts: [{ text: `Generate ${config.count} questions on ${config.topic}` }]
      }]
    });

    const result = JSON.parse(response.candidates?.[0]?.content?.parts?.[0]?.text || '{"questions":[]}');
    return result.questions || [];
  }

  // Study Plan Generation
  async generateStudyPlan(config: StudyPlanConfig): Promise<any[]> {
    const systemPrompt = `Build a ${config.examDate ? '2-8' : '4-6'}-week plan for ${config.exam}:${config.grade} Subject(s): ${config.subjects.join(', ')}.
Topics: ${config.topics.join(', ')}. Exam date: ${config.examDate || 'none'}. Intensity: ${config.intensity}.
Each session ${config.sessionDuration} min. Mix tasks:
- Read/DocChat specific sections (with pages)
- Tutor checkpoint (15-20 min)
- Quiz (10-20 Qs)
- Flashcards (SRS: 1d, 3d, 7d, 16d)

Return JSON array of {date, type, duration, title, description, refs}.
Keep realistic loads for Indian school schedules.`;

    const response = await ai.models.generateContent({
      model: REASONING_MODEL_STR,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  type: { type: "string" },
                  duration: { type: "number" },
                  title: { type: "string" },
                  description: { type: "string" },
                  refs: { type: "string" }
                }
              }
            }
          }
        }
      },
      contents: [{
        role: "user",
        parts: [{ text: `Generate study plan for ${config.subjects.join(', ')}` }]
      }]
    });

    const result = JSON.parse(response.candidates?.[0]?.content?.parts?.[0]?.text || '{"schedule":[]}');
    return result.schedule || [];
  }

  // Notes Summarization - Cornell style
  async generateCornellNotes(content: string, language: string = 'en'): Promise<any> {
    const systemPrompt = `Produce Cornell-style notes in ${language} for JEE/NEET level.
Sections:
1) Big Idea (3-5 lines)
2) Key Terms (10-15, term: definition)
3) Summary (≤180 words)
4) Section bullets per heading with examples & formulas ($...$)
5) 8-12 flashcard pairs + 6-10 quizable facts

Include source breadcrumbs if applicable.`;

    const response = await ai.models.generateContent({
      model: REASONING_MODEL_STR,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            bigIdea: { type: "string" },
            keyTerms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: { type: "string" },
                  definition: { type: "string" }
                }
              }
            },
            summary: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  content: { type: "string" }
                }
              }
            },
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  front: { type: "string" },
                  back: { type: "string" }
                }
              }
            }
          }
        }
      },
      contents: [{
        role: "user",
        parts: [{ text: content }]
      }]
    });

    const result = JSON.parse(response.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    return result;
  }

  // Quick Tools
  async explainConcept(concept: string, depth: 'quick' | 'standard' | 'deep', context?: string): Promise<string> {
    const systemPrompt = `Explain "${concept}" at ${depth} level for Indian students (JEE/NEET context).
${depth === 'quick' ? 'Brief explanation (50-80 words)' : 
  depth === 'standard' ? 'Detailed explanation with examples (150-200 words)' : 
  'Comprehensive explanation with derivations and applications (300+ words)'}
Use LaTeX for formulas ($...$). Include Indian examples where relevant.
${context ? `\nContext: ${context}` : ''}`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL_STR,
      config: {
        systemInstruction: systemPrompt,
      },
      contents: [{
        role: "user",
        parts: [{ text: `Explain: ${concept}` }]
      }]
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateHint(question: string, context?: string): Promise<string> {
    const systemPrompt = `Generate a Socratic hint for this question. Don't give away the answer directly.
Guide the student towards the solution with a leading question or clue.
Keep it brief (1-2 sentences).`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL_STR,
      config: {
        systemInstruction: systemPrompt,
      },
      contents: [{
        role: "user",
        parts: [{ text: `Question: ${question}\n${context ? `Context: ${context}` : ''}` }]
      }]
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateExample(topic: string, difficulty: 'jee' | 'neet' | 'standard' = 'standard'): Promise<string> {
    const systemPrompt = `Provide a worked example problem for "${topic}" at ${difficulty} level.
Include:
1. Problem statement
2. Step-by-step solution
3. Key concepts used
4. Final answer with units

Use LaTeX for formulas ($...$). Make it relevant to Indian exams.`;

    const response = await ai.models.generateContent({
      model: REASONING_MODEL_STR,
      config: {
        systemInstruction: systemPrompt,
      },
      contents: [{
        role: "user",
        parts: [{ text: `Generate example for: ${topic}` }]
      }]
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateSummary(messages: string[], context?: string): Promise<string> {
    const systemPrompt = `Generate a concise summary (5-7 bullet points) of the conversation.
Focus on key concepts learned, problems solved, and important insights.
${context ? `Context: ${context}` : ''}`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL_STR,
      config: {
        systemInstruction: systemPrompt,
      },
      contents: [{
        role: "user",
        parts: [{ text: messages.join('\n\n') }]
      }]
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
