import { openaiService } from '../services/openai.js';

export type IntentType = 'conceptual' | 'application' | 'administrative' | 'confusion' | 'answer_attempt';

export interface IntentClassification {
  intent: IntentType;
  confidence: number;
  reasoning: string;
}

export class IntentClassifier {
  async classifyIntent(
    userQuery: string,
    sessionContext?: {
      subject: string;
      topic: string;
      gradeLevel: string;
      recentMessages?: string[];
    }
  ): Promise<IntentClassification> {
    const contextInfo = sessionContext 
      ? `Session: ${sessionContext.gradeLevel} ${sessionContext.subject}, Topic: ${sessionContext.topic}
Recent conversation: ${sessionContext.recentMessages?.slice(-3).join(' | ') || 'None'}`
      : '';

    const prompt = `Classify the student's query into ONE of these intent types:

1. ANSWER_ATTEMPT - Student is providing an answer, solution, or response to a previous question
   Examples: "It's 42", "The answer is photosynthesis", "I think it's...", "V = IR", "x = 5"
   IMPORTANT: If recent conversation shows tutor asked a question, student is likely answering it

2. CONCEPTUAL - Student wants to understand an idea, theory, or concept
   Examples: "What is photosynthesis?", "Explain Newton's laws", "How does this work?"

3. APPLICATION - Student wants to solve a problem or apply knowledge
   Examples: "Can you help me solve this equation?", "How do I calculate this?", "What steps should I follow?"

4. CONFUSION - Student is confused, stuck, or didn't understand previous explanation
   Examples: "I don't get it", "This is confusing", "Can you explain again?", "I'm stuck"

5. ADMINISTRATIVE - Student asks about syllabus, exam, deadlines, course info
   Examples: "When is the test?", "What topics are covered?", "Is this in the exam?"

${contextInfo}

Student Query: "${userQuery}"

CRITICAL: Check if recent conversation shows tutor asking a question. If yes, student is likely providing ANSWER_ATTEMPT.

Respond ONLY with JSON:
{
  "intent": "answer_attempt|conceptual|application|confusion|administrative",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation why you chose this intent"
}`;

    try {
      const response = await openaiService.chatCompletion(
        [
          {
            role: "system",
            content: "You are an expert educational intent classifier. Classify student queries accurately."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        {
          responseFormat: { type: "json_object" },
          maxTokens: 2000, // Increased for complete responses
          temperature: 0.3,
        }
      );

      const parsed = JSON.parse(response.content);
      
      return {
        intent: parsed.intent as IntentType,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning
      };
    } catch (error) {
      console.error("Intent classification failed:", error);
      // Default to conceptual on error
      return {
        intent: 'conceptual',
        confidence: 0.5,
        reasoning: 'Classification failed, defaulting to conceptual'
      };
    }
  }
}

export const intentClassifier = new IntentClassifier();
