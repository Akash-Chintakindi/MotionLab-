// Pure helpers for the Squad (class/group) competitive feature. No Firebase here
// so the logic is unit-testable; the I/O lives in services/squadService.ts.

// Unambiguous code alphabet: no O/0, I/1, or L to avoid copy/typing mistakes.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const SQUAD_CODE_LENGTH = 6;

/** A random, human-friendly squad join code (e.g. "K7M2QP"). rng is injectable. */
export function generateSquadCode(rng: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < SQUAD_CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Normalizes user-typed codes (trim, uppercase, strip stray spaces). */
export function normalizeSquadCode(input: string): string {
  return (input ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

/** True if a string looks like a valid squad code (length + allowed chars). */
export function isValidSquadCode(code: string): boolean {
  if (code.length !== SQUAD_CODE_LENGTH) return false;
  for (const ch of code) {
    if (!CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

// Sort key for the daily-question board: higher ranks first. Correct answers
// always beat wrong ones, and among correct answers a faster time scores higher.
const DAILY_SCORE_CAP = 10_000_000;

export function dailyBoardScore(correct: boolean, timeMs: number): number {
  if (!correct) return 0;
  const t = Math.max(0, Math.min(Math.floor(timeMs), DAILY_SCORE_CAP - 1));
  return DAILY_SCORE_CAP - t;
}

/** "12.3s" / "1m 04s" for showing answer times on the board. */
export function formatAnswerTime(timeMs: number): string {
  const totalSec = Math.max(0, timeMs) / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}
