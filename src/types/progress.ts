// Firestore document shapes. These mirror the collections in the PRD data model.

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
  updatedAt: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  /** ISO date string (YYYY-MM-DD) of the last day with activity. */
  lastActivityDate: string | null;
  milestoneIds: string[];
}
