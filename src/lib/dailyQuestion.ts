import { bankQuestions } from "../content/practiceBank";
import type { BankQuestion } from "../content/practiceBank/types";
import { todayISO } from "./streak";

/**
 * Deterministic FNV-1a hash of a string → unsigned 32-bit int. Used to pick the
 * same daily question for every user on a given calendar day (date is the seed),
 * which is what makes the daily question fair and competitive-ready.
 */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The shared "Question of the Day" for `dateISO` (defaults to today). Pure and
 * stable: the same date always maps to the same bank question, independent of
 * the user or the AI toggle.
 */
export function dailyQuestion(dateISO: string = todayISO()): BankQuestion {
  const all = bankQuestions();
  const idx = hashString(dateISO) % all.length;
  return all[idx];
}
