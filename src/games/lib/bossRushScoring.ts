// Pure helpers for the "Boss Rush" practice game (Lesson 7) so scoring stays
// unit-testable. A run is a short gauntlet of mixed mini-challenges; each stage
// is recorded as a boolean (was it answered correctly?). The final score is the
// correct fraction plus a small combo bonus for back-to-back wins, capped at 100.

export interface ComboOptions {
  /** Bonus points awarded per stage beyond the first in the longest streak. */
  perExtra?: number;
  /** Maximum total combo bonus (so a hot streak can never overpower accuracy). */
  cap?: number;
}

const DEFAULTS: Required<ComboOptions> = { perExtra: 2, cap: 12 };

/** Number of stages cleared. */
export function countCorrect(flags: boolean[]): number {
  return flags.reduce((n, ok) => (ok ? n + 1 : n), 0);
}

/** Length of the longest run of consecutive correct answers. */
export function longestStreak(flags: boolean[]): number {
  let best = 0;
  let run = 0;
  for (const ok of flags) {
    run = ok ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/**
 * Combo bonus for the longest streak. A streak of 1 (or none) earns nothing;
 * every additional consecutive win adds `perExtra` points, up to `cap`.
 */
export function comboBonus(streak: number, opts: ComboOptions = {}): number {
  const { perExtra, cap } = { ...DEFAULTS, ...opts };
  if (streak < 2) return 0;
  return Math.min(cap, (streak - 1) * perExtra);
}

export interface RunSummary {
  correct: number;
  total: number;
  longestStreak: number;
  base: number;
  bonus: number;
  score: number;
}

/** Full breakdown of a run for display on the result screen. */
export function summarizeRun(flags: boolean[], opts: ComboOptions = {}): RunSummary {
  const total = flags.length;
  const correct = countCorrect(flags);
  const streak = longestStreak(flags);
  const base = total === 0 ? 0 : Math.round((correct / total) * 100);
  const bonus = comboBonus(streak, opts);
  const score = Math.max(0, Math.min(100, base + bonus));
  return { correct, total, longestStreak: streak, base, bonus, score };
}

/** Final 0–100 score for a run: accuracy plus a capped combo bonus. */
export function scoreRun(flags: boolean[], opts: ComboOptions = {}): number {
  return summarizeRun(flags, opts).score;
}
