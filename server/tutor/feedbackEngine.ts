import { openaiService } from '../services/openai.js';
import type { BloomLevel } from './lessonPlanner.js';

export type FeedbackLevel = 'task' | 'process' | 'self_regulation' | 'self';

export interface StructuredFeedback {
  taskFeedback: string; // What's correct/incorrect
  processFeedback: string; // Which step went wrong, how to fix
  selfRegulationFeedback: string; // Strategy, metacognition, self-monitoring
  nextMicroStep: string; // Actionable next step
  retrievalPrompt: string; // Question to reinforce learning
  encouragement: string; // Motivational message
  bloomLevel: BloomLevel;
}

export class FeedbackEngine {
  /**
   * Generate multi-level feedback based on Hattie's research
   * 
   * Hattie's Feedback Levels (most to least effective):
   * 1. SELF-REGULATION - How to self-monitor and adjust strategies
   * 2. PROCESS - Which steps/processes were correct/incorrect
   * 3. TASK - What is correct/incorrect about the answer
   * 4. SELF - Personal praise (avoid, least effective)
   */
  async generateFeedback(
    questionText: string,
    studentAnswer: string,
    expectedAnswer: string,
    isCorrect: boolean,
    bloomLevel: BloomLevel,
    context?: {
      topic: string;
      attemptNumber: number;
      hintsUsed: number;
    }
  ): Promise<StructuredFeedback> {
    const prompt = `Generate evidence-based feedback using Hattie's framework.

QUESTION: "${questionText}"
STUDENT'S ANSWER: "${studentAnswer}"
EXPECTED ANSWER: "${expectedAnswer}"
CORRECTNESS: ${isCorrect ? 'CORRECT' : 'INCORRECT'}
BLOOM LEVEL: ${bloomLevel}
${context ? `TOPIC: ${context.topic}\nATTEMPT: ${context.attemptNumber}\nHINTS USED: ${context.hintsUsed}` : ''}

HATTIE'S FEEDBACK LEVELS (apply ALL three):

1. TASK FEEDBACK - State what's right/wrong
   - Acknowledge correct parts
   - Point out specific errors (don't just say "wrong")
   - Be precise and objective

2. PROCESS FEEDBACK - Explain HOW to fix it
   - Identify which step/reasoning went wrong
   - Show correct process/strategy
   - "You [action], but you should [better action] because..."

3. SELF-REGULATION FEEDBACK - Teach self-monitoring
   - "Next time, you could check by..."
   - "A good strategy is to..."
   - Help student develop their own error-detection

ADDITIONAL ELEMENTS:
- Next micro-step: ONE specific, doable action
- Retrieval prompt: Question that reinforces the concept
- Encouragement: Brief, genuine (avoid empty praise like "good job")

TONE: Supportive but honest. Growth mindset. Specific not generic.

Respond ONLY with JSON:
{
  "taskFeedback": "what's correct/incorrect about the answer",
  "processFeedback": "which step went wrong and how to fix",
  "selfRegulationFeedback": "how to self-check and improve strategy",
  "nextMicroStep": "one actionable next step",
  "retrievalPrompt": "question to reinforce learning",
  "encouragement": "brief genuine encouragement",
  "bloomLevel": "${bloomLevel}"
}`;

    try {
      const response = await openaiService.chatCompletion(
        [
          {
            role: "system",
            content: "You are an expert educator using Hattie's evidence-based feedback framework. Provide specific, actionable feedback."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        {
          responseFormat: { type: "json_object" },
          maxTokens: 2500, // Increased for complete 3-level feedback
          temperature: 0.7,
        }
      );

      const parsed = JSON.parse(response.content);
      return {
        taskFeedback: parsed.taskFeedback,
        processFeedback: parsed.processFeedback,
        selfRegulationFeedback: parsed.selfRegulationFeedback,
        nextMicroStep: parsed.nextMicroStep,
        retrievalPrompt: parsed.retrievalPrompt,
        encouragement: parsed.encouragement,
        bloomLevel: parsed.bloomLevel as BloomLevel
      };
    } catch (error) {
      console.error("Feedback generation failed:", error);
      throw new Error("Failed to generate structured feedback");
    }
  }

  /**
   * Generate worked example with segmentation (reduces cognitive load)
   */
  async generateWorkedExample(
    topic: string,
    concept: string,
    bloomLevel: BloomLevel,
    gradeLevel: string
  ): Promise<{
    example: string;
    steps: string[];
    keyPoints: string[];
    practicePrompt: string;
  }> {
    const prompt = `Generate a worked example using cognitive load theory principles.

TOPIC: ${topic}
CONCEPT: ${concept}
BLOOM LEVEL: ${bloomLevel}
GRADE LEVEL: ${gradeLevel}

COGNITIVE LOAD PRINCIPLES:
1. SEGMENTATION - Break into small, digestible chunks
2. WORKED EXAMPLES - Show complete solution step-by-step
3. FADING - Start with full example, gradually remove support

Create:
1. Complete worked example (realistic, grade-appropriate)
2. Step-by-step breakdown (3-6 micro-steps)
3. Key points to remember (2-4 items)
4. Practice prompt (similar problem for student to try)

Respond ONLY with JSON:
{
  "example": "complete worked example with solution",
  "steps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "keyPoints": [
    "Key point 1",
    "Key point 2"
  ],
  "practicePrompt": "Now you try: [similar problem]"
}`;

    try {
      const response = await openaiService.chatCompletion(
        [
          {
            role: "system",
            content: "You are an expert at creating effective worked examples using cognitive load theory."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        {
          responseFormat: { type: "json_object" },
          maxTokens: 2000, // Increased for complete worked examples with steps
          temperature: 0.7,
        }
      );

      const parsed = JSON.parse(response.content);
      return parsed;
    } catch (error) {
      console.error("Worked example generation failed:", error);
      throw new Error("Failed to generate worked example");
    }
  }
}

export const feedbackEngine = new FeedbackEngine();
