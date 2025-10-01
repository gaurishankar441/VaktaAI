import { openaiService } from '../services/openai.js';
import type { LessonPlan, InsertLessonPlan } from '@shared/schema';

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type StepType = 'explain' | 'example' | 'practice' | 'reflection' | 'probe';

export interface LessonStep {
  type: StepType;
  content: string;
  bloomLevel: BloomLevel;
  checkpoints: string[];
  estimatedMinutes: number;
}

export interface LessonPlanData {
  learningGoals: string[];
  targetBloomLevel: BloomLevel;
  priorKnowledgeCheck: string;
  steps: LessonStep[];
  resources: string[];
  estimatedDuration: number;
}

export class LessonPlanner {
  async createLessonPlan(
    topic: string,
    subject: string,
    gradeLevel: string,
    priorKnowledgeSignal?: string,
    targetBloomLevel: BloomLevel = 'understand'
  ): Promise<LessonPlanData> {
    const prompt = `You are an expert lesson planner. Create a structured lesson plan using evidence-based pedagogy.

TOPIC: ${topic}
SUBJECT: ${subject}
GRADE LEVEL: ${gradeLevel}
PRIOR KNOWLEDGE: ${priorKnowledgeSignal || 'Unknown - need to check'}
TARGET BLOOM LEVEL: ${targetBloomLevel}

BLOOM'S TAXONOMY LEVELS (in order):
1. REMEMBER - recall facts, terms, basic concepts
2. UNDERSTAND - explain ideas, summarize, interpret
3. APPLY - use knowledge in new situations, solve problems
4. ANALYZE - draw connections, distinguish between parts
5. EVALUATE - justify decisions, critique, judge
6. CREATE - produce new work, design, construct

PEDAGOGICAL PRINCIPLES:
- Cognitive Load: Segment complex topics, use worked examples
- Scaffolding: Start simple, gradually increase complexity
- Active Learning: Include practice and reflection
- Formative Assessment: Checkpoints to verify understanding

Create a lesson plan with:
1. 2-4 clear learning goals
2. Prior knowledge check question
3. 4-6 micro-steps that progress through Bloom levels
4. Each step includes: type (explain/example/practice/reflection/probe), content, bloom level, checkpoints, time estimate
5. Relevant document/resource references (if applicable)

Respond ONLY with JSON:
{
  "learningGoals": ["goal1", "goal2", "goal3"],
  "targetBloomLevel": "${targetBloomLevel}",
  "priorKnowledgeCheck": "question to check what student already knows",
  "steps": [
    {
      "type": "explain|example|practice|reflection|probe",
      "content": "what to teach/ask at this step",
      "bloomLevel": "remember|understand|apply|analyze|evaluate|create",
      "checkpoints": ["check1", "check2"],
      "estimatedMinutes": 5
    }
  ],
  "resources": ["resource references if any"],
  "estimatedDuration": 30
}`;

    try {
      const response = await openaiService.chatCompletion(
        [
          {
            role: "system",
            content: "You are an expert educational lesson planner using Bloom's Taxonomy and evidence-based pedagogy."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        {
          responseFormat: { type: "json_object" },
          maxTokens: 4000, // Increased for complete lesson plans with all steps
          temperature: 0.7,
        }
      );

      const parsed = JSON.parse(response.content);
      
      return {
        learningGoals: parsed.learningGoals,
        targetBloomLevel: parsed.targetBloomLevel as BloomLevel,
        priorKnowledgeCheck: parsed.priorKnowledgeCheck,
        steps: parsed.steps,
        resources: parsed.resources || [],
        estimatedDuration: parsed.estimatedDuration
      };
    } catch (error) {
      console.error("Lesson planning failed:", error);
      throw new Error("Failed to create lesson plan");
    }
  }

  async assessPriorKnowledge(
    studentResponse: string,
    expectedKnowledge: string
  ): Promise<{
    hasKnowledge: boolean;
    knowledgeLevel: 'none' | 'partial' | 'good';
    gaps: string[];
    recommendation: string;
  }> {
    const prompt = `Assess student's prior knowledge based on their response.

EXPECTED KNOWLEDGE: ${expectedKnowledge}
STUDENT RESPONSE: "${studentResponse}"

Determine:
1. Does student have the required prior knowledge? (yes/no/partial)
2. Knowledge level: none (0-30%), partial (30-70%), good (70-100%)
3. Specific gaps in knowledge
4. Recommendation for next steps

Respond ONLY with JSON:
{
  "hasKnowledge": true/false,
  "knowledgeLevel": "none|partial|good",
  "gaps": ["gap1", "gap2"],
  "recommendation": "what to do next"
}`;

    try {
      const response = await openaiService.chatCompletion(
        [
          {
            role: "system",
            content: "You are an expert at assessing student knowledge levels."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        {
          responseFormat: { type: "json_object" },
          maxTokens: 1500, // Increased for complete assessment with gaps
          temperature: 0.3,
        }
      );

      const parsed = JSON.parse(response.content);
      return parsed;
    } catch (error) {
      console.error("Prior knowledge assessment failed:", error);
      return {
        hasKnowledge: false,
        knowledgeLevel: 'none',
        gaps: ['Unable to assess'],
        recommendation: 'Start from basics'
      };
    }
  }
}

export const lessonPlanner = new LessonPlanner();
