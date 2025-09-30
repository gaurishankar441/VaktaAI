import { storage } from '../storage.js';
import type { BloomLevel } from './lessonPlanner.js';
import type { MasteryScore, InsertMasteryScore, StudentProfile, InsertStudentProfile } from '@shared/schema';

export interface MasteryLevel {
  bloomLevel: BloomLevel;
  score: number; // 0-100
  attempts: number;
  lastPracticed: Date;
}

export interface StudentKnowledgeState {
  subject: string;
  topic: string;
  masteryLevels: MasteryLevel[];
  overallScore: number;
  weakAreas: string[];
  strongAreas: string[];
  recommendedBloomLevel: BloomLevel;
}

export class StudentModel {
  /**
   * Get or create student profile
   */
  async getOrCreateProfile(userId: string): Promise<StudentProfile> {
    let profile = await storage.getStudentProfile(userId);
    
    if (!profile) {
      const profileData: InsertStudentProfile = {
        userId,
        preferredMode: 'friendly_mentor',
        learningStyle: null,
        errorHistory: null,
        preferences: null,
        totalSessions: 0,
        totalTimeSpent: 0
      };
      profile = await storage.createStudentProfile(profileData);
    }
    
    return profile;
  }

  /**
   * Update mastery score after student attempt
   */
  async updateMastery(
    userId: string,
    subject: string,
    topic: string,
    bloomLevel: BloomLevel,
    isCorrect: boolean,
    confidence?: number
  ): Promise<void> {
    // Get existing mastery score or create new one
    let mastery = await storage.getMasteryScore(userId, subject, topic, bloomLevel);
    
    if (mastery) {
      // Update existing score
      const newCorrectCount = (mastery.correctCount || 0) + (isCorrect ? 1 : 0);
      const newIncorrectCount = (mastery.incorrectCount || 0) + (!isCorrect ? 1 : 0);
      const newAttempts = (mastery.attempts || 0) + 1;
      
      // Calculate new score: weighted average of correctness and confidence
      const correctnessScore = (newCorrectCount / newAttempts) * 100;
      const finalScore = confidence 
        ? (correctnessScore * 0.7 + confidence * 100 * 0.3)
        : correctnessScore;
      
      await storage.updateMasteryScore(mastery.id, {
        score: finalScore.toFixed(2),
        attempts: newAttempts,
        correctCount: newCorrectCount,
        incorrectCount: newIncorrectCount,
        lastPracticed: new Date()
      });
    } else {
      // Create new mastery record
      const initialScore = isCorrect ? (confidence ? confidence * 100 : 100) : (confidence ? confidence * 100 : 0);
      
      const masteryData: InsertMasteryScore = {
        userId,
        subject,
        topic,
        bloomLevel,
        score: initialScore.toFixed(2),
        attempts: 1,
        correctCount: isCorrect ? 1 : 0,
        incorrectCount: !isCorrect ? 1 : 0,
        lastPracticed: new Date()
      };
      
      await storage.createMasteryScore(masteryData);
    }
  }

  /**
   * Get student's knowledge state for a topic
   */
  async getKnowledgeState(
    userId: string,
    subject: string,
    topic: string
  ): Promise<StudentKnowledgeState> {
    const masteryScores = await storage.getMasteryScoresByTopic(userId, subject, topic);
    
    const masteryLevels: MasteryLevel[] = masteryScores.map(score => ({
      bloomLevel: score.bloomLevel as BloomLevel,
      score: parseFloat(score.score),
      attempts: score.attempts || 0,
      lastPracticed: score.lastPracticed ? new Date(score.lastPracticed) : new Date()
    }));
    
    // Calculate overall score (weighted average across bloom levels)
    const bloomWeights = {
      'remember': 1,
      'understand': 1.5,
      'apply': 2,
      'analyze': 2.5,
      'evaluate': 3,
      'create': 3.5
    };
    
    const totalWeightedScore = masteryLevels.reduce((sum, level) => {
      const weight = bloomWeights[level.bloomLevel];
      return sum + (level.score * weight);
    }, 0);
    
    const totalWeight = masteryLevels.reduce((sum, level) => {
      return sum + bloomWeights[level.bloomLevel];
    }, 0);
    
    const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    
    // Identify weak and strong areas
    const weakAreas = masteryLevels
      .filter(level => level.score < 60)
      .map(level => `${level.bloomLevel} (${level.score.toFixed(0)}%)`);
    
    const strongAreas = masteryLevels
      .filter(level => level.score >= 80)
      .map(level => `${level.bloomLevel} (${level.score.toFixed(0)}%)`);
    
    // Recommend next Bloom level to target
    const recommendedBloomLevel = this.recommendNextBloomLevel(masteryLevels);
    
    return {
      subject,
      topic,
      masteryLevels,
      overallScore,
      weakAreas,
      strongAreas,
      recommendedBloomLevel
    };
  }

  /**
   * Recommend next Bloom level based on mastery progression
   */
  private recommendNextBloomLevel(masteryLevels: MasteryLevel[]): BloomLevel {
    const bloomOrder: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
    
    // Find highest mastered level (>= 70% score)
    let highestMastered = -1;
    for (let i = 0; i < bloomOrder.length; i++) {
      const level = masteryLevels.find(m => m.bloomLevel === bloomOrder[i]);
      if (level && level.score >= 70) {
        highestMastered = i;
      } else {
        break; // Stop at first non-mastered level
      }
    }
    
    // Recommend next level or current if not mastered
    const recommendedIndex = Math.min(highestMastered + 1, bloomOrder.length - 1);
    return bloomOrder[recommendedIndex];
  }

  /**
   * Track common errors for adaptive instruction
   */
  async trackError(
    userId: string,
    errorType: string,
    context: string
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    
    const errorHistory = (profile.errorHistory as any[]) || [];
    errorHistory.push({
      errorType,
      context,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 errors
    const recentErrors = errorHistory.slice(-50);
    
    await storage.updateStudentProfile(userId, {
      errorHistory: recentErrors
    });
  }

  /**
   * Update session statistics
   */
  async updateSessionStats(
    userId: string,
    timeSpent: number // in seconds
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    
    await storage.updateStudentProfile(userId, {
      totalSessions: (profile.totalSessions || 0) + 1,
      totalTimeSpent: (profile.totalTimeSpent || 0) + timeSpent
    });
  }
}

export const studentModel = new StudentModel();
