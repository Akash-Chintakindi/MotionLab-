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
};

/** Pure streak transition used by both the service and unit tests. */
export function computeStreak(
  current: StreakData,
  today: string,
): StreakData {
  if (current.lastActivityDate === today) {
    return current; // already counted today
  }

  let currentStreak: number;
  if (current.lastActivityDate === null) {
    currentStreak = 1;
  } else {
    const gap = daysBetweenISO(current.lastActivityDate, today);
    currentStreak = gap === 1 ? current.currentStreak + 1 : 1;
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
  };
}
