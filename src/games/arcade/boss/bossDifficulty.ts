// ---------------------------------------------------------------------------
// Index-based difficulty curve (PRD section 8) for the brawler. Pure functions
// of the boss index `n` (1..10 for mini-bosses, 11/12/13 for the finale's three
// phases) so "slightly harder each time" is a tuned, testable curve. The
// registry feeds these numbers into each BossConfig/BossPhase: a rising HP pool,
// a mildly rising damage multiplier, and a BossAIProfile that grows meaner —
// more aggressive, sharper reactions, more blocking and jump-ins, longer combo
// strings, and tighter spacing — all monotonic in `n` and clamped to fair caps.
// ---------------------------------------------------------------------------

import type { BossAIProfile } from "./bossTypes";

export interface DifficultyParams {
  /** Boss phase HP. */
  hp: number;
  /** Multiplier applied to the boss's outgoing damage. */
  bossDamageMult: number;
  /** How the boss fights at this index. */
  ai: BossAIProfile;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Fairness / threat caps. Tuned MEANER than the original PRD starting point:
// even Boss 1 presses attacks and blocks reads regularly, and the curve ends
// clearly threatening — fast reactions, frequent guards, long strings — while
// staying reaction-feasible (a hard floor on reaction time + bounded combos).
const AGGRESSION_CAP = 0.95;
const REACTION_FLOOR_MS = 130;
const BLOCK_CAP = 0.85;
const JUMP_CAP = 0.55;
const COMBO_CAP = 6;
const RANGE_FLOOR_PX = 64;

/**
 * The default difficulty curve for boss index `n`. Everything moves
 * monotonically toward "harder" as `n` grows (HP and damage up; reactions
 * faster; blocking, jumping, aggression, combo length, and walk speed up;
 * spacing tighter) while respecting the caps so even the finale stays
 * reaction-feasible. The HP / damage anchors match the PRD curve.
 */
export function difficultyFor(index: number): DifficultyParams {
  const n = Math.max(1, Math.floor(index));
  const k = n - 1;
  const ai: BossAIProfile = {
    // Boss 1 already attacks well over half the time it is in range.
    aggression: clamp(0.58 + 0.045 * k, 0, AGGRESSION_CAP),
    // Sharper than before across the board (Boss 1: 430ms, Boss 10: ~160ms).
    reactionMs: Math.max(REACTION_FLOOR_MS, 430 - 30 * k),
    // Blocks reads a third of the time at the start, up to most of the time.
    blockChance: clamp(0.35 + 0.05 * k, 0, BLOCK_CAP),
    jumpChance: clamp(0.08 + 0.04 * k, 0, JUMP_CAP),
    preferredRangePx: Math.max(RANGE_FLOOR_PX, 124 - 5 * k),
    // Chains start at 2 and grow to long strings by the finale.
    comboLength: clamp(2 + Math.floor(k / 2), 2, COMBO_CAP),
    moveSpeedMult: 1 + 0.035 * k,
  };
  return {
    hp: 100 + 22 * k,
    bossDamageMult: 1 + 0.05 * k,
    ai,
  };
}
