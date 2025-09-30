import type { BloomLevel } from './lessonPlanner.js';
import type { StudentKnowledgeState } from './studentModel.js';

export interface AdaptationDecision {
  action: 'raise_difficulty' | 'lower_difficulty' | 'maintain' | 'reteach' | 'advance_topic';
  newBloomLevel: BloomLevel;
  reasoning: string;
  scaffoldingType: 'full_support' | 'partial_support' | 'minimal_support' | 'independent';
}

export class AdaptationEngine {
  /**
   * Decide how to adapt instruction based on student performance
   */
  adaptDifficulty(
    currentBloomLevel: BloomLevel,
    isCorrect: boolean,
    attemptNumber: number,
    confidence?: number,
    knowledgeState?: StudentKnowledgeState
  ): AdaptationDecision {
    const bloomOrder: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
    const currentIndex = bloomOrder.indexOf(currentBloomLevel);
    
    // Decision matrix based on performance
    
    // CASE 1: Consistently correct (high mastery)
    if (isCorrect && attemptNumber <= 2 && (confidence === undefined || confidence >= 0.7)) {
      // Check if already mastered this level via knowledge state
      const masteryLevel = knowledgeState?.masteryLevels.find(m => m.bloomLevel === currentBloomLevel);
      
      if (masteryLevel && masteryLevel.score >= 85 && currentIndex < bloomOrder.length - 1) {
        // Raise difficulty - student has mastered this level
        const newIndex = Math.min(currentIndex + 1, bloomOrder.length - 1);
        return {
          action: 'raise_difficulty',
          newBloomLevel: bloomOrder[newIndex],
          reasoning: `Student demonstrates strong mastery (${masteryLevel.score.toFixed(0)}%) at ${currentBloomLevel} level. Ready for ${bloomOrder[newIndex]} level challenges.`,
          scaffoldingType: 'partial_support'
        };
      }
      
      // Maintain level but reduce scaffolding
      return {
        action: 'maintain',
        newBloomLevel: currentBloomLevel,
        reasoning: 'Correct answer, continuing to build mastery at current level.',
        scaffoldingType: confidence && confidence >= 0.8 ? 'minimal_support' : 'partial_support'
      };
    }
    
    // CASE 2: Correct but uncertain or multiple attempts
    if (isCorrect && (attemptNumber > 2 || (confidence !== undefined && confidence < 0.7))) {
      return {
        action: 'maintain',
        newBloomLevel: currentBloomLevel,
        reasoning: `Correct answer but took ${attemptNumber} attempts or showed uncertainty. Need more practice at ${currentBloomLevel} level.`,
        scaffoldingType: 'full_support'
      };
    }
    
    // CASE 3: Incorrect on first/second attempt
    if (!isCorrect && attemptNumber <= 2) {
      // Check knowledge state for patterns
      const masteryLevel = knowledgeState?.masteryLevels.find(m => m.bloomLevel === currentBloomLevel);
      
      if (masteryLevel && masteryLevel.score < 40) {
        // Struggling at this level - drop down if possible
        if (currentIndex > 0) {
          return {
            action: 'lower_difficulty',
            newBloomLevel: bloomOrder[currentIndex - 1],
            reasoning: `Student struggling at ${currentBloomLevel} level (mastery: ${masteryLevel.score.toFixed(0)}%). Dropping to ${bloomOrder[currentIndex - 1]} to rebuild foundation.`,
            scaffoldingType: 'full_support'
          };
        } else {
          // Already at lowest level - reteach with different approach
          return {
            action: 'reteach',
            newBloomLevel: currentBloomLevel,
            reasoning: 'Struggling at foundational level. Reteaching with different examples and more scaffolding.',
            scaffoldingType: 'full_support'
          };
        }
      }
      
      // First incorrect - maintain level, provide support
      return {
        action: 'maintain',
        newBloomLevel: currentBloomLevel,
        reasoning: 'First incorrect attempt. Providing hints and scaffolding at same level.',
        scaffoldingType: 'full_support'
      };
    }
    
    // CASE 4: Multiple incorrect attempts (struggling)
    if (!isCorrect && attemptNumber > 2) {
      if (currentIndex > 0) {
        // Drop down one bloom level
        return {
          action: 'lower_difficulty',
          newBloomLevel: bloomOrder[currentIndex - 1],
          reasoning: `Multiple incorrect attempts at ${currentBloomLevel} level. Dropping to ${bloomOrder[currentIndex - 1]} to strengthen prerequisites.`,
          scaffoldingType: 'full_support'
        };
      } else {
        // At lowest level, struggling - reteach differently
        return {
          action: 'reteach',
          newBloomLevel: 'remember',
          reasoning: 'Struggling with fundamental concepts after multiple attempts. Reteaching from basics with worked examples.',
          scaffoldingType: 'full_support'
        };
      }
    }
    
    // Default: maintain with partial support
    return {
      action: 'maintain',
      newBloomLevel: currentBloomLevel,
      reasoning: 'Continuing at current difficulty with adjusted support.',
      scaffoldingType: 'partial_support'
    };
  }

  /**
   * Determine scaffolding level based on performance history
   */
  determineScaffolding(
    correctStreak: number,
    totalAttempts: number,
    avgConfidence: number
  ): 'full_support' | 'partial_support' | 'minimal_support' | 'independent' {
    const successRate = correctStreak / Math.max(totalAttempts, 1);
    
    if (successRate >= 0.9 && avgConfidence >= 0.8) {
      return 'independent'; // Student can work independently
    } else if (successRate >= 0.7 && avgConfidence >= 0.6) {
      return 'minimal_support'; // Just gentle guidance
    } else if (successRate >= 0.5) {
      return 'partial_support'; // Moderate scaffolding
    } else {
      return 'full_support'; // Heavy scaffolding needed
    }
  }

  /**
   * Recommend next learning activity based on mastery state
   */
  recommendNextActivity(
    knowledgeState: StudentKnowledgeState
  ): {
    activity: 'practice_current' | 'review_gaps' | 'advance_topic' | 'mixed_review';
    focus: string;
    reasoning: string;
  } {
    // If weak areas exist, focus on those first
    if (knowledgeState.weakAreas.length > 0) {
      return {
        activity: 'review_gaps',
        focus: knowledgeState.weakAreas[0],
        reasoning: `Student has knowledge gaps in: ${knowledgeState.weakAreas.join(', ')}. Prioritizing weakest area first.`
      };
    }
    
    // If overall score is high, advance
    if (knowledgeState.overallScore >= 80) {
      return {
        activity: 'advance_topic',
        focus: knowledgeState.recommendedBloomLevel,
        reasoning: `Strong overall mastery (${knowledgeState.overallScore.toFixed(0)}%). Ready to advance to ${knowledgeState.recommendedBloomLevel} level or new topic.`
      };
    }
    
    // If some mastery but not complete, practice current
    if (knowledgeState.overallScore >= 60) {
      return {
        activity: 'practice_current',
        focus: knowledgeState.recommendedBloomLevel,
        reasoning: `Moderate mastery (${knowledgeState.overallScore.toFixed(0)}%). More practice needed at ${knowledgeState.recommendedBloomLevel} level.`
      };
    }
    
    // Low mastery - mixed review
    return {
      activity: 'mixed_review',
      focus: 'foundational concepts',
      reasoning: `Lower mastery (${knowledgeState.overallScore.toFixed(0)}%). Mixed review of foundational concepts recommended.`
    };
  }
}

export const adaptationEngine = new AdaptationEngine();
