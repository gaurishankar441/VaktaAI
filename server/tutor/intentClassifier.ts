import { openaiService } from '../services/openai.js';

export type IntentType = 'conceptual' | 'application' | 'administrative' | 'confusion';

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

1. CONCEPTUAL - Student wants to understand an idea, theory, or concept
   Examples: "What is photosynthesis?", "Explain Newton's laws", "How does this work?"

2. APPLICATION - Student wants to solve a problem or apply knowledge
   Examples: "Can you help me solve this equation?", "How do I calculate this?", "What steps should I follow?"

3. ADMINISTRATIVE - Student asks about syllabus, exam, deadlines, course info
   Examples: "When is the test?", "What topics are covered?", "Is this in the exam?"

4. CONFUSION - Student is confused, stuck, or didn't understand previous explanation
   Examples: "I don't get it", "This is confusing", "Can you explain again?", "I'm stuck"

${contextInfo}

Student Query: "${userQuery}"

Respond ONLY with JSON:
{
  "intent": "conceptual|application|administrative|confusion",
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
          maxTokens: 200,
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
