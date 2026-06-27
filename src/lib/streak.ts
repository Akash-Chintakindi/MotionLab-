import type { StreakData } from "../types/progress";
import { streakMilestonesFor } from "./milestones";

/** Local calendar date as YYYY-MM-DD, used for streak day comparisons. */
export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetweenISO(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export const EMPTY_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  milestoneIds: [],
  freezes: 0,
  dailyCount: 0,
  dailyCountDate: null,
  dailyQuestionDate: null,
  dailyQuestionStreak: 0,
  dailyQuestionCorrect: false,
};

/** Problems solved per day to "hit your goal" and earn a streak freeze. */
export const DAILY_GOAL = 4;
/** Most streak freezes a learner can bank at once. */
export const MAX_FREEZES = 3;

/** Pure streak transition used by both the service and unit tests. */
export function computeStreak(
  current: StreakData,
  today: string,
): StreakData {
  if (current.lastActivityDate === today) {
    return current; // already counted today
  }

  let freezes = current.freezes ?? 0;
  let currentStreak: number;
  if (current.lastActivityDate === null) {
    currentStreak = 1;
  } else {
    const gap = daysBetweenISO(current.lastActivityDate, today);
    if (gap === 1) {
      currentStreak = current.currentStreak + 1;
    } else if (gap === 2 && freezes > 0) {
      // Spend a freeze to bridge a single missed day; the streak lives on.
      freezes -= 1;
      currentStreak = current.currentStreak + 1;
    } else {
      currentStreak = 1;
    }
  }

  const milestoneIds = Array.from(
    new Set([...current.milestoneIds, ...streakMilestonesFor(currentStreak)]),
  );

  return {
    ...current,
    currentStreak,
    longestStreak: Math.max(current.longestStreak, currentStreak),
    lastActivityDate: today,
    milestoneIds,
    freezes,
  };
}

/** Today's problem count, ignoring a stale count carried over from a past day. */
export function dailyCountFor(streak: StreakData, today = todayISO()): number {
  return streak.dailyCountDate === today ? streak.dailyCount ?? 0 : 0;
}

/**
 * Folds one solved problem into the streak doc: advances the day streak (once
 * per day, with freeze bridging), increments today's problem count, and banks a
 * freeze the first time the daily goal is reached. Pure; used by the service and
 * unit tests.
 */
export function recordProblem(current: StreakData, today: string): StreakData {
  const afterStreak = computeStreak(current, today);

  const prevCount = current.dailyCountDate === today ? current.dailyCount ?? 0 : 0;
  const dailyCount = prevCount + 1;

  const justMetGoal = prevCount < DAILY_GOAL && dailyCount >= DAILY_GOAL;
  const freezes = Math.min(
    (afterStreak.freezes ?? 0) + (justMetGoal ? 1 : 0),
    MAX_FREEZES,
  );

  return {
    ...afterStreak,
    dailyCount,
    dailyCountDate: today,
    freezes,
  };
}

/** True if the shared Question of the Day has already been answered today. */
export function dailyQuestionAnswered(
  streak: StreakData,
  today = todayISO(),
): boolean {
  return streak.dailyQuestionDate === today;
}

/**
 * Folds today's Question-of-the-Day answer into the streak doc: advances the
 * daily-question streak (consecutive calendar days answered; resets after a
 * missed day) and stores today's correctness. Idempotent per day. Pure.
 */
export function recordDailyQuestion(
  current: StreakData,
  today: string,
  correct: boolean,
): StreakData {
  if (current.dailyQuestionDate === today) {
    return current; // already answered today
  }

  let dailyQuestionStreak: number;
  if (!current.dailyQuestionDate) {
    dailyQuestionStreak = 1;
  } else {
    const gap = daysBetweenISO(current.dailyQuestionDate, today);
    dailyQuestionStreak = gap === 1 ? (current.dailyQuestionStreak ?? 0) + 1 : 1;
  }

  return {
    ...current,
    dailyQuestionDate: today,
    dailyQuestionStreak,
    dailyQuestionCorrect: correct,
  };
}
