import { intentClassifier } from './intentClassifier.js';
import { lessonPlanner, type BloomLevel, type LessonPlanData } from './lessonPlanner.js';
import { probeEngine, type ProbeResponse } from './probeEngine.js';
import { feedbackEngine, type StructuredFeedback } from './feedbackEngine.js';
import { studentModel } from './studentModel.js';
import { adaptationEngine, type AdaptationDecision } from './adaptationEngine.js';
import { storage } from '../storage.js';

export interface OrchestrationResult {
  response: string;
  messageType: 'lesson_plan' | 'socratic_probe' | 'feedback' | 'explanation' | 'administrative';
  lessonPlan?: LessonPlanData;
  feedback?: StructuredFeedback;
  probe?: ProbeResponse;
  adaptation?: AdaptationDecision;
  masteryUpdate?: boolean;
}

export class SessionOrchestrator {
  /**
   * Main orchestration method for agentic tutor
   */
  async orchestrate(
    userId: string,
    sessionId: string,
    userMessage: string,
    subject: string,
    topic: string,
    gradeLevel: string
  ): Promise<OrchestrationResult> {
    // Step 1: Get recent conversation context
    const messages = await storage.getTutorMessages(sessionId);
    const recentMessages = messages.slice(-5).map(m => m.content);

    // Step 2: Classify user intent
    const intent = await intentClassifier.classifyIntent(userMessage, {
      subject,
      topic,
      gradeLevel,
      recentMessages
    });
    console.log('[Orchestrator] Intent classified:', intent);

    // Step 3: Get or create student profile
    await studentModel.getOrCreateProfile(userId);

    // Step 4: Get current knowledge state
    const knowledgeState = await studentModel.getKnowledgeState(userId, subject, topic);
    const currentBloomLevel = knowledgeState.recommendedBloomLevel;
    console.log('[Orchestrator] Knowledge state:', knowledgeState);

    // Step 5: Handle based on intent type
    switch (intent.intent) {
      case 'answer_attempt': {
        // Student is providing an answer - process it with feedback
        return await this.processAnswer(userId, sessionId, userMessage, subject, topic);
      }

      case 'conceptual': {
        // Student wants to understand a concept - provide lesson plan
        
        // Check if lesson plan already exists for this session
        let existingPlan = await storage.getLessonPlan(sessionId);
        
        if (existingPlan) {
          // Return existing lesson plan
          const lessonPlanData = {
            targetBloomLevel: existingPlan.targetBloomLevel,
            steps: existingPlan.steps as any,
            learningGoals: existingPlan.learningGoals || [],
            priorKnowledgeCheck: existingPlan.priorKnowledgeCheck,
            resources: existingPlan.resources as any,
            estimatedDuration: existingPlan.estimatedDuration
          };
          
          return {
            response: this.formatLessonPlan(lessonPlanData),
            messageType: 'lesson_plan',
            lessonPlan: lessonPlanData
          };
        }
        
        // Create new lesson plan
        const lessonPlan = await lessonPlanner.createLessonPlan(
          topic,
          subject,
          gradeLevel,
          undefined, // No prior knowledge signal yet
          currentBloomLevel
        );

        // Store lesson plan in database
        await storage.createLessonPlan({
          sessionId,
          targetBloomLevel: lessonPlan.targetBloomLevel,
          steps: lessonPlan.steps as any, // JSON type
          learningGoals: lessonPlan.learningGoals,
          priorKnowledgeCheck: lessonPlan.priorKnowledgeCheck,
          resources: lessonPlan.resources as any, // JSON type
          estimatedDuration: lessonPlan.estimatedDuration
        });

        return {
          response: this.formatLessonPlan(lessonPlan),
          messageType: 'lesson_plan',
          lessonPlan
        };
      }

      case 'application':
      case 'confusion': {
        // Student wants to apply knowledge or is confused - use Socratic probing
        const lastTutorMessage = messages
          .filter(m => m.role === 'tutor')
          .pop();

        const probeResponse = await probeEngine.generateProbe(
          topic,
          currentBloomLevel,
          userMessage,
          lastTutorMessage?.content
        );

        // Ensure response is not empty
        const probeQuestion = probeResponse.probe.question || `Let's think about ${topic}. Can you tell me what you understand so far?`;

        return {
          response: probeQuestion,
          messageType: 'socratic_probe',
          probe: probeResponse
        };
      }

      case 'administrative': {
        // Administrative queries - provide course info
        return {
          response: `This is a tutoring session for ${subject}, focusing on ${topic} at ${gradeLevel} level. What specific aspect would you like to explore?`,
          messageType: 'administrative'
        };
      }

      default: {
        // Fallback for unknown intents - provide Socratic probe instead of generic message
        const lastTutorMessage = messages
          .filter(m => m.role === 'tutor')
          .pop();

        try {
          const probeResponse = await probeEngine.generateProbe(
            topic,
            currentBloomLevel,
            userMessage,
            lastTutorMessage?.content
          );

          // Ensure response is not empty
          const probeQuestion = probeResponse.probe.question || `I'm here to help you learn ${topic}. What would you like to explore?`;

          return {
            response: probeQuestion,
            messageType: 'socratic_probe',
            probe: probeResponse
          };
        } catch (error) {
          console.error('[Orchestrator] Probe generation failed in fallback:', error);
          // Return safe fallback
          return {
            response: `I'm here to help you learn ${topic}. What would you like to explore?`,
            messageType: 'explanation'
          };
        }
      }
    }
  }

  /**
   * Process student answer and provide feedback
   */
  async processAnswer(
    userId: string,
    sessionId: string,
    studentAnswer: string,
    subject: string,
    topic: string
  ): Promise<OrchestrationResult> {
    // Get recent messages to find the question
    const messages = await storage.getTutorMessages(sessionId);
    const lastTutorMessage = messages
      .filter(m => m.role === 'tutor')
      .pop();

    if (!lastTutorMessage) {
      return {
        response: "I don't see a previous question. Let's start fresh - what would you like to learn?",
        messageType: 'explanation'
      };
    }

    // Get knowledge state
    const knowledgeState = await studentModel.getKnowledgeState(userId, subject, topic);
    const currentBloomLevel = knowledgeState.recommendedBloomLevel;

    // For now, we'll use a simple correctness check
    // In production, this should involve more sophisticated evaluation
    const isCorrect = studentAnswer.trim().length > 10; // Basic heuristic

    // Generate feedback
    const feedback = await feedbackEngine.generateFeedback(
      lastTutorMessage.content,
      studentAnswer,
      '', // Expected answer - to be enhanced later
      isCorrect,
      currentBloomLevel,
      { topic, attemptNumber: 1, hintsUsed: 0 }
    );

    // Update mastery score
    await studentModel.updateMastery(
      userId,
      subject,
      topic,
      currentBloomLevel,
      isCorrect,
      0.7 // Default confidence
    );

    // Store attempt record
    await storage.createTutorAttempt({
      userId,
      sessionId,
      bloomLevel: currentBloomLevel,
      questionText: lastTutorMessage.content,
      studentAnswer,
      isCorrect,
      confidence: '0.70', // 0-1 confidence score (70%)
      feedbackGiven: feedback.processFeedback || feedback.taskFeedback || 'Feedback provided',
      timeSpent: 0 // Will be tracked by frontend
    });

    // Adapt difficulty based on performance
    const adaptation = await adaptationEngine.adaptDifficulty(
      userId,
      subject,
      topic,
      currentBloomLevel as BloomLevel
    );

    return {
      response: feedback.processFeedback || feedback.taskFeedback || 'Good effort! Let me help you understand this better.',
      messageType: 'feedback',
      feedback,
      adaptation,
      masteryUpdate: true
    };
  }

  /**
   * Format lesson plan for display
   */
  private formatLessonPlan(lessonPlan: LessonPlanData): string {
    let response = `# Learning Plan: ${lessonPlan.learningGoals[0] || 'Topic Overview'}\n\n`;
    
    response += `**Learning Goals:**\n`;
    lessonPlan.learningGoals.forEach((goal: string) => {
      response += `• ${goal}\n`;
    });
    
    response += `\n**Prior Knowledge Check:**\n${lessonPlan.priorKnowledgeCheck}\n`;
    
    response += `\n**Learning Path:**\n`;
    lessonPlan.steps.forEach((step: any, idx: number) => {
      response += `\n${idx + 1}. **${step.type.toUpperCase()}** (${step.bloomLevel})\n`;
      response += `   ${step.content}\n`;
      if (step.checkpoints && step.checkpoints.length > 0) {
        response += `   ✓ Checkpoints: ${step.checkpoints.join(', ')}\n`;
      }
    });
    
    response += `\n*Estimated time: ${lessonPlan.estimatedDuration} minutes*`;
    response += `\n\nReady to begin? Let's start with the first step!`;
    
    return response;
  }

  /**
   * Update session metrics after interaction
   */
  async updateSessionMetrics(
    userId: string,
    timeSpent: number
  ): Promise<void> {
    await studentModel.updateSessionStats(userId, timeSpent);
  }
}

export const sessionOrchestrator = new SessionOrchestrator();
