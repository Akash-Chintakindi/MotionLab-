// Pure, dependency-free spaced-repetition + mastery model for per-topic review.
// An SM-2-lite scheduler (ease + interval + due date) is paired with a 0–100
// mastery signal (a difficulty-weighted EWMA of recent correctness). Kept free
// of React/Firebase so it is trivially unit-testable; persistence and UI live
// elsewhere (progressService, useMastery, the dashboard).

import type { Difficulty } from "../ai/practiceTypes";

/** Per-topic spaced-repetition + mastery state, persisted in courseProgress. */
export interface TopicMasteryEntry {
  attempts: number;
  correct: number;
  /** 0..100 difficulty-weighted EWMA of recent correctness. */
  mastery: number;
  /** SM-2 ease factor, clamped to [MIN_EASE, MAX_EASE]. */
  ease: number;
  /** Current review interval in days. */
  intervalDays: number;
  /** ms timestamp when this topic is next due for review. */
  dueAt: number;
  /** ms timestamp of the last answer for this topic (0 when never seen). */
  lastSeenAt: number;
  /** Result of the most recent answer (null when never seen). */
  lastResult: boolean | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const MIN_EASE = 1.3;
export const MAX_EASE = 2.7;
const DEFAULT_EASE = 2.5;

// EWMA smoothing for the mastery signal (higher = more reactive to recent
// answers). Scaled by difficulty, then clamped so one answer can't swing wildly.
const MASTERY_ALPHA = 0.3;
const MAX_ALPHA = 0.6;

// First two successful intervals (days) before ease-based growth takes over.
const FIRST_INTERVAL = 1;
const SECOND_INTERVAL = 3;

/** Per-answer weight: harder questions move mastery + ease more than easy ones. */
const DIFFICULTY_WEIGHT: Record<Difficulty, number> = {
  easy: 0.8,
  medium: 1.0,
  hard: 1.25,
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** A fresh entry for a topic the learner has never practiced (due immediately). */
export function initialMastery(now: number): TopicMasteryEntry {
  return {
    attempts: 0,
    correct: 0,
    mastery: 0,
    ease: DEFAULT_EASE,
    intervalDays: 0,
    dueAt: now,
    lastSeenAt: 0,
    lastResult: null,
  };
}

/**
 * Fold one graded answer into a topic's mastery + schedule. Pure: returns a new
 * entry and never mutates the input.
 *  - correct → grow the interval (SM-2-ish), nudge ease up, raise mastery.
 *  - wrong   → reset the interval to ~1 day, drop ease, lower mastery.
 * Harder questions move both mastery and ease more than easy ones.
 */
export function reviewMastery(
  entry: TopicMasteryEntry,
  correct: boolean,
  difficulty: Difficulty,
  now: number,
): TopicMasteryEntry {
  const w = DIFFICULTY_WEIGHT[difficulty] ?? 1;

  const target = correct ? 100 : 0;
  const alpha = clamp(MASTERY_ALPHA * w, 0, MAX_ALPHA);
  const mastery = clamp(
    Math.round(entry.mastery + (target - entry.mastery) * alpha),
    0,
    100,
  );

  let ease = entry.ease;
  let intervalDays = entry.intervalDays;

  if (correct) {
    ease = clamp(entry.ease + 0.05 * w, MIN_EASE, MAX_EASE);
    if (entry.intervalDays <= 0) intervalDays = FIRST_INTERVAL;
    else if (entry.intervalDays < SECOND_INTERVAL) intervalDays = SECOND_INTERVAL;
    else intervalDays = Math.round(entry.intervalDays * ease);
  } else {
    ease = clamp(entry.ease - 0.2, MIN_EASE, MAX_EASE);
    intervalDays = FIRST_INTERVAL;
  }

  return {
    attempts: entry.attempts + 1,
    correct: entry.correct + (correct ? 1 : 0),
    mastery,
    ease,
    intervalDays,
    dueAt: now + intervalDays * DAY_MS,
    lastSeenAt: now,
    lastResult: correct,
  };
}

/** Whether a previously-seen topic is due for review now. */
export function isDue(entry: TopicMasteryEntry, now: number): boolean {
  return entry.attempts > 0 && entry.dueAt <= now;
}

/** How overdue (in days) a topic is; negative if not yet due. */
export function overdueDays(entry: TopicMasteryEntry, now: number): number {
  return (now - entry.dueAt) / DAY_MS;
}

/**
 * Topic ids due for review, most in need first: by how overdue, then by lowest
 * mastery. Only includes topics the learner has actually practiced (attempts >
 * 0) — brand-new topics belong to onboarding, not the review queue.
 */
export function dueTopics(
  map: Record<string, TopicMasteryEntry>,
  now: number,
): string[] {
  return Object.entries(map)
    .filter(([, e]) => isDue(e, now))
    .sort((a, b) => {
      const od = overdueDays(b[1], now) - overdueDays(a[1], now);
      if (Math.abs(od) > 1e-9) return od;
      return a[1].mastery - b[1].mastery;
    })
    .map(([id]) => id);
}

export type MasteryTier = "new" | "learning" | "familiar" | "strong" | "mastered";

/** Bucket a topic's mastery into a coarse tier for UI labels/colors. */
export function masteryTier(entry: TopicMasteryEntry | undefined): MasteryTier {
  if (!entry || entry.attempts === 0) return "new";
  const m = entry.mastery;
  if (m < 35) return "learning";
  if (m < 60) return "familiar";
  if (m < 85) return "strong";
  return "mastered";
}

export const MASTERY_TIER_LABEL: Record<MasteryTier, string> = {
  new: "New",
  learning: "Learning",
  familiar: "Familiar",
  strong: "Strong",
  mastered: "Mastered",
};
