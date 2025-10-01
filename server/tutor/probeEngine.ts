import { openaiService } from '../services/openai.js';
import type { BloomLevel } from './lessonPlanner.js';

export interface ProbeQuestion {
  question: string;
  bloomLevel: BloomLevel;
  hints: string[];
  expectedAnswer: string;
  scaffoldingType: 'leading' | 'clarifying' | 'refocusing' | 'probing';
}

export interface ProbeResponse {
  probe: ProbeQuestion;
  reasoning: string;
}

export class ProbeEngine {
  /**
   * Generate Socratic probing question - guides without revealing answer
   */
  async generateProbe(
    topic: string,
    currentBloomLevel: BloomLevel,
    studentLastResponse?: string,
    learningGoal?: string
  ): Promise<ProbeResponse> {
    const prompt = `You are a Socratic tutor using the Socratic method. Generate a probing question that guides the student toward understanding WITHOUT revealing the answer directly.

SOCRATIC QUESTIONING TYPES:
1. LEADING - Guide toward correct reasoning ("What happens when...?")
2. CLARIFYING - Request elaboration ("Can you explain what you mean by...?")  
3. REFOCUSING - Redirect to key concept ("Let's think about the main principle...")
4. PROBING - Dig deeper ("Why do you think that? What evidence supports this?")

TOPIC: ${topic}
CURRENT BLOOM LEVEL: ${currentBloomLevel}
LEARNING GOAL: ${learningGoal || 'General understanding'}
${studentLastResponse ? `STUDENT'S LAST RESPONSE: "${studentLastResponse}"` : ''}

RULES:
- Ask ONE question at a time
- Don't reveal the final answer
- Provide 2-3 progressive hints (from gentle to more specific)
- Question should match the Bloom level
- Use encouraging, patient tone

Respond ONLY with JSON:
{
  "question": "the Socratic probing question",
  "bloomLevel": "${currentBloomLevel}",
  "hints": [
    "gentle hint - makes student think",
    "medium hint - narrows down",
    "specific hint - almost reveals but student must connect"
  ],
  "expectedAnswer": "what you're hoping student discovers",
  "scaffoldingType": "leading|clarifying|refocusing|probing",
  "reasoning": "why this question helps learning"
}`;

    try {
      const response = await openaiService.chatCompletion(
        [
          {
            role: "system",
            content: "You are a master Socratic tutor. Guide students through questions, never give direct answers."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        {
          responseFormat: { type: "json_object" },
          maxTokens: 1000,
          temperature: 0.7,
        }
      );

      const parsed = JSON.parse(response.content);
      
      // Validate that question is not empty
      const question = parsed.question?.trim() || `Can you explain your understanding of ${topic}?`;
      
      return {
        probe: {
          question,
          bloomLevel: parsed.bloomLevel as BloomLevel || currentBloomLevel,
          hints: parsed.hints || ["Think about the key concepts", "Consider what you already know", "Break it down step by step"],
          expectedAnswer: parsed.expectedAnswer || "Student discovers through guided questioning",
          scaffoldingType: parsed.scaffoldingType || 'probing'
        },
        reasoning: parsed.reasoning || "Guiding student through Socratic questioning"
      };
    } catch (error) {
      console.error("Probe generation failed:", error);
      // Return fallback probe instead of throwing
      return {
        probe: {
          question: `Can you tell me what you understand about ${topic}?`,
          bloomLevel: currentBloomLevel,
          hints: ["Think about what you've learned", "Consider the main concepts", "Try breaking it into smaller parts"],
          expectedAnswer: "Student understanding of topic",
          scaffoldingType: 'clarifying'
        },
        reasoning: "Fallback probe due to generation error"
      };
    }
  }

  /**
   * Evaluate student's answer to a probe and decide next step
   */
  async evaluateProbeResponse(
    probeQuestion: string,
    expectedAnswer: string,
    studentAnswer: string,
    hintsUsed: number
  ): Promise<{
    isCorrect: boolean;
    quality: 'excellent' | 'good' | 'partial' | 'poor';
    shouldGiveHint: boolean;
    hintIndex: number;
    shouldMoveOn: boolean;
    nextAction: 'hint' | 'next_probe' | 'reteach' | 'advance';
    reasoning: string;
  }> {
    const prompt = `Evaluate the student's response to a Socratic probe question.

PROBE QUESTION: "${probeQuestion}"
EXPECTED ANSWER: "${expectedAnswer}"
STUDENT ANSWER: "${studentAnswer}"
HINTS ALREADY USED: ${hintsUsed}

Evaluate:
1. Is the answer correct/close enough? (yes/no)
2. Answer quality: excellent (100%), good (70-99%), partial (40-69%), poor (<40%)
3. Should give hint? (only if incorrect and hints available)
4. Next hint index (0, 1, or 2)
5. Should move on? (if correct or after 2-3 attempts)
6. Next action: hint | next_probe | reteach | advance

DECISION RULES:
- If excellent/good → advance to next concept
- If partial + hints available → give hint
- If partial + no hints left → reteach concept
- If poor after 2+ attempts → reteach from basics

Respond ONLY with JSON:
{
  "isCorrect": true/false,
  "quality": "excellent|good|partial|poor",
  "shouldGiveHint": true/false,
  "hintIndex": 0-2,
  "shouldMoveOn": true/false,
  "nextAction": "hint|next_probe|reteach|advance",
  "reasoning": "brief explanation of decision"
}`;

    try {
      const response = await openaiService.chatCompletion(
        [
          {
            role: "system",
            content: "You are an expert at evaluating student responses and providing adaptive guidance."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        {
          responseFormat: { type: "json_object" },
          maxTokens: 300,
          temperature: 0.3,
        }
      );

      const parsed = JSON.parse(response.content);
      return parsed;
    } catch (error) {
      console.error("Probe evaluation failed:", error);
      return {
        isCorrect: false,
        quality: 'poor',
        shouldGiveHint: true,
        hintIndex: 0,
        shouldMoveOn: false,
        nextAction: 'hint',
        reasoning: 'Evaluation failed, providing hint'
      };
    }
  }
}

export const probeEngine = new ProbeEngine();
