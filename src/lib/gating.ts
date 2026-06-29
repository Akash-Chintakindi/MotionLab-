import type { CourseProgress } from "../types/progress";
import type { WeaponTier } from "../games/arcade/boss/bossTypes";

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

// ---- Boss Fight Mode gating ------------------------------------------------

type QuizSource = Pick<CourseProgress, "quizScores"> | null | undefined;
type BossSource = Pick<CourseProgress, "bossDefeats"> | null | undefined;

/** Maps a best quiz score to a weapon tier, or null if the quiz isn't passed. */
export function weaponTierFor(scorePct: number): WeaponTier | null {
  if (scorePct >= 100) return 5;
  if (scorePct >= 90) return 4;
  if (scorePct >= 85) return 3;
  if (scorePct >= 80) return 2;
  if (scorePct >= QUIZ_PASS_PERCENT) return 1; // 70-79
  return null;
}

/** A mini-boss is unlocked once its lesson's quiz is passed (>=70%). */
export function bossUnlocked(cp: QuizSource, lessonId: string): boolean {
  return quizPassed(cp?.quizScores?.[lessonId] ?? 0);
}

/** True once every mini-boss lesson has a defeated entry. */
export function allMiniBossesDefeated(
  cp: BossSource,
  miniBossLessonIds: string[],
): boolean {
  if (miniBossLessonIds.length === 0) return false;
  return miniBossLessonIds.every(
    (lessonId) => cp?.bossDefeats?.[lessonId]?.defeated === true,
  );
}

/** The finale unlocks when all mini-bosses are defeated. */
export function finaleUnlocked(
  cp: BossSource,
  miniBossLessonIds: string[],
): boolean {
  return allMiniBossesDefeated(cp, miniBossLessonIds);
}
