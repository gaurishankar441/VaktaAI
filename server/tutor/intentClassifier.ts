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

PRIORITY RULE: If query contains explain/samjhao/batao/what/how/why/elaborate → CONCEPTUAL (NOT answer_attempt!)

1. CONCEPTUAL - Student wants explanation or understanding (TOP PRIORITY!)
   Keywords: "explain", "samjhao", "batao", "what is", "how does", "why", "elaborate", "kya hai"
   Examples: "P=VI samjhao", "Explain this", "batao kya relation hai", "What is X?"

2. ANSWER_ATTEMPT - Student giving SHORT answer to tutor's direct question
   Examples: "Yes", "No", "It's 5", "ready", "ok" (only single word/short phrase responses)
   NOT answer_attempt: Any question or request for explanation

3. APPLICATION - Student wants to solve/apply
   Examples: "Help me solve this", "How do I calculate?"

4. CONFUSION - Student confused/stuck
   Examples: "I don't get it", "This is confusing"

5. ADMINISTRATIVE - Course/exam questions
   Examples: "When is the test?"

${contextInfo}

Student Query: "${userQuery}"

REMEMBER: Any request for explanation = CONCEPTUAL (ignore context, focus on keywords!)

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
