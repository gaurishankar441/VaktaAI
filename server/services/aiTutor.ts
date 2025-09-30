import { openaiService } from './openai.js';
import { storage } from '../storage.js';
import { sessionOrchestrator, type OrchestrationResult } from '../tutor/sessionOrchestrator.js';
import type { TutorSession, TutorMessage, InsertTutorSession, InsertTutorMessage } from '@shared/schema';

export interface TutorResponse {
  explanation: string;
  worked_example: string;
  practice_prompt: string;
  messageType: 'explanation' | 'worked_example' | 'practice' | 'feedback' | 'lesson_plan' | 'socratic_probe' | 'administrative';
  orchestrationData?: OrchestrationResult;
}

export interface TutorSessionData {
  session: TutorSession;
  messages: TutorMessage[];
}

export class AITutorService {
  async createTutorSession(
    userId: string,
    subject: string,
    gradeLevel: string,
    topic: string
  ): Promise<TutorSession> {
    try {
      const title = `${subject}: ${topic}`;
      
      const sessionData: InsertTutorSession = {
        userId,
        subject,
        gradeLevel,
        topic,
        title,
      };

      return await storage.createTutorSession(sessionData);
    } catch (error) {
      console.error("Failed to create tutor session:", error);
      throw error;
    }
  }

  async getTutorSession(sessionId: string): Promise<TutorSessionData | null> {
    try {
      const session = await storage.getTutorSession(sessionId);
      if (!session) return null;

      const messages = await storage.getTutorMessages(sessionId);
      
      return { session, messages };
    } catch (error) {
      console.error("Failed to get tutor session:", error);
      throw error;
    }
  }

  async getUserTutorSessions(userId: string): Promise<TutorSession[]> {
    try {
      return await storage.getUserTutorSessions(userId);
    } catch (error) {
      console.error("Failed to get user tutor sessions:", error);
      throw error;
    }
  }

  async sendTutorMessage(
    sessionId: string,
    content: string,
    role: 'user' | 'tutor' = 'user',
    messageType?: string
  ): Promise<TutorMessage> {
    try {
      const messageData: InsertTutorMessage = {
        sessionId,
        role,
        content,
        messageType: role === 'user' ? undefined : (messageType || 'explanation'),
      };

      return await storage.createTutorMessage(messageData);
    } catch (error) {
      console.error("Failed to send tutor message:", error);
      throw error;
    }
  }

  async generateTutorResponse(
    sessionId: string,
    userQuestion: string,
    options: {
      streaming?: boolean;
      res?: any;
      userId: string;
    }
  ): Promise<TutorResponse> {
    try {
      const session = await storage.getTutorSession(sessionId);
      if (!session) {
        throw new Error("Tutor session not found");
      }

      // Save user message
      await this.sendTutorMessage(sessionId, userQuestion, 'user');

      // Use SessionOrchestrator for agentic response
      const orchestrationResult = await sessionOrchestrator.orchestrate(
        options.userId,
        sessionId,
        userQuestion,
        session.subject,
        session.topic,
        session.gradeLevel
      );

      // Save tutor response with correct messageType
      await this.sendTutorMessage(
        sessionId, 
        orchestrationResult.response, 
        'tutor', 
        orchestrationResult.messageType
      );

      // Map orchestration result to TutorResponse format
      return {
        explanation: orchestrationResult.response,
        worked_example: orchestrationResult.lessonPlan ? 
          `Lesson Plan created with ${orchestrationResult.lessonPlan.steps.length} steps` : '',
        practice_prompt: orchestrationResult.probe ? 
          orchestrationResult.probe.probe.hint || '' : '',
        messageType: orchestrationResult.messageType,
        orchestrationData: orchestrationResult
      };
    } catch (error) {
      console.error("Failed to generate tutor response:", error);
      throw error;
    }
  }

  /**
   * Process student answer and provide feedback
   */
  async processTutorAnswer(
    sessionId: string,
    studentAnswer: string,
    userId: string
  ): Promise<TutorResponse> {
    try {
      const session = await storage.getTutorSession(sessionId);
      if (!session) {
        throw new Error("Tutor session not found");
      }

      // Save student answer
      await this.sendTutorMessage(sessionId, studentAnswer, 'user');

      // Process answer with feedback
      const feedbackResult = await sessionOrchestrator.processAnswer(
        userId,
        sessionId,
        studentAnswer,
        session.subject,
        session.topic
      );

      // Save feedback with correct messageType
      await this.sendTutorMessage(
        sessionId, 
        feedbackResult.response, 
        'tutor', 
        feedbackResult.messageType
      );

      return {
        explanation: feedbackResult.response,
        worked_example: feedbackResult.feedback?.taskFeedback || '',
        practice_prompt: feedbackResult.feedback?.nextMicroStep || '',
        messageType: feedbackResult.messageType,
        orchestrationData: feedbackResult
      };
    } catch (error) {
      console.error("Failed to process tutor answer:", error);
      throw error;
    }
  }

  async generateStreamingTutorResponse(prompt: string, res: any): Promise<void> {
    const messages = [
      {
        role: "system",
        content: "You are AIPedagogyTutor, an expert educator. Provide clear explanations, worked examples, and practice problems in a structured format."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    await openaiService.createStreamingResponse(messages, res);
  }

  async provideFeedback(
    sessionId: string,
    studentAnswer: string,
    correctAnswer?: string
  ): Promise<string> {
    try {
      const session = await storage.getTutorSession(sessionId);
      if (!session) {
        throw new Error("Tutor session not found");
      }

      const messages = await storage.getTutorMessages(sessionId);
      const recentMessages = messages.slice(-5); // Get last 5 messages for context

      const feedbackPrompt = `You are AIPedagogyTutor providing feedback for ${session.gradeLevel} ${session.subject} on ${session.topic}.

Recent conversation context:
${recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Student's answer: "${studentAnswer}"
${correctAnswer ? `Correct answer: "${correctAnswer}"` : ''}

Provide constructive feedback:
1. Acknowledge what the student got right
2. Gently correct any mistakes
3. Explain the reasoning
4. Encourage further learning
5. Ask a follow-up question to check understanding

Keep the tone supportive and encouraging.`;

      const response = await openaiService.chatCompletion(
        [
          {
            role: "system",
            content: "You are a supportive tutor providing constructive feedback to help students learn."
          },
          {
            role: "user",
            content: feedbackPrompt
          }
        ],
        {
          maxTokens: 800,
        }
      );

      // Save the feedback message
      await this.sendTutorMessage(sessionId, response.content, 'tutor');

      return response.content;
    } catch (error) {
      console.error("Failed to provide feedback:", error);
      throw error;
    }
  }

  private buildTutorPrompt(
    gradeLevel: string,
    subject: string,
    topic: string,
    question: string,
    conversationHistory: string
  ): string {
    return `You are **AIPedagogyTutor** for grade ${gradeLevel}, subject ${subject}, topic ${topic}.

${conversationHistory ? `Previous conversation:\n${conversationHistory}\n` : ''}

Question: "${question}"

Do:
1) Explain concept simply (2–4 short paragraphs).
2) Provide a worked example step-by-step.
3) Give a similar practice problem for the learner.
4) If the learner later responds, evaluate and give feedback.

Output JSON:
{ "explanation": "...", "worked_example": "...", "practice_prompt": "..." }`;
  }

  private buildConversationHistory(messages: TutorMessage[]): string {
    // Get the last 10 messages to provide context
    const recentMessages = messages.slice(-10);
    
    return recentMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  async deleteTutorSession(sessionId: string): Promise<void> {
    try {
      await storage.deleteTutorSession(sessionId);
    } catch (error) {
      console.error("Failed to delete tutor session:", error);
      throw error;
    }
  }
}

export const aiTutorService = new AITutorService();
