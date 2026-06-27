// Firestore document shapes. These mirror the collections in the PRD data model.

import type { TopicMasteryEntry } from "../lib/srs";

export type LessonStatus = "not_started" | "in_progress" | "completed";

export interface UserProfile {
  displayName: string;
  email: string;
  createdAt: number;
  lastActiveAt: number;
}

export interface LessonProgress {
  lessonId: string;
  status: LessonStatus;
  currentStepIndex: number;
  completedStepIds: string[];
  attemptsByStep: Record<string, number>;
  correctByStep: Record<string, boolean>;
  lastUpdatedAt: number;
  completedAt: number | null;
}

export interface CourseProgress {
  unlockedLessonIds: string[];
  completedLessonIds: string[];
  currentLessonId: string | null;
  masteryByLesson: Record<string, number>;
  /** Best quiz score (0–100) per lessonId. */
  quizScores?: Record<string, number>;
  /**
   * Spaced-repetition + mastery state per topic (topicId === lessonId), fed by
   * every answer surface (lessons, quizzes, Lab, AI hub, games). Drives the
   * dashboard mastery meters and the review queue. Optional for back-compat with
   * docs created before this feature.
   */
  topicMastery?: Record<string, TopicMasteryEntry>;
  updatedAt: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  /** ISO date string (YYYY-MM-DD) of the last day with activity. */
  lastActivityDate: string | null;
  milestoneIds: string[];
  /**
   * Streak-freeze tokens. One token automatically bridges a single missed day so
   * the streak survives. Earned by hitting the daily goal; capped at MAX_FREEZES.
   * Optional for back-compat with docs created before the engagement loop.
   */
  freezes?: number;
  /** Number of problems solved on `dailyCountDate` (the daily-goal ring). */
  dailyCount?: number;
  /** ISO date the daily count belongs to; a new day resets the count. */
  dailyCountDate?: string | null;
  /** ISO date the user last answered the shared Question of the Day. */
  dailyQuestionDate?: string | null;
  /** Consecutive calendar days the Question of the Day has been answered. */
  dailyQuestionStreak?: number;
  /** Whether the most recent Question of the Day was answered correctly. */
  dailyQuestionCorrect?: boolean;
}
