import type { CourseProgress } from "../types/progress";

/**
 * Progression thresholds (see "Learning Science.txt").
 *
 * - A lesson's Learn section must be mastered at >= 80% to unlock that topic's
 *   Quiz.
 * - A quiz must be passed at >= 70% to unlock the next topic.
 */
export const LESSON_MASTERY_THRESHOLD = 0.8; // fraction (0–1)
export const QUIZ_PASS_PERCENT = 70; // percentage (0–100)

type MasterySource = Pick<CourseProgress, "masteryByLesson"> | null | undefined;

/** Best recorded mastery for a lesson as a fraction (0–1); 0 if none yet. */
export function lessonMastery(course: MasterySource, lessonId: string): number {
  return course?.masteryByLesson?.[lessonId] ?? 0;
}

/**
 * Whether a topic's Quiz is unlocked. It opens only once the learner masters
 * the Learn section at >= 80%.
 */
export function modesUnlocked(course: MasterySource, lessonId: string): boolean {
  return lessonMastery(course, lessonId) >= LESSON_MASTERY_THRESHOLD;
}

/** Whether a quiz score (0–100) is high enough to advance to the next topic. */
export function quizPassed(scorePct: number): boolean {
  return scorePct >= QUIZ_PASS_PERCENT;
}
