import type { Difficulty } from "./practiceTypes";

/** Consecutive correct/incorrect answers that trigger an adaptive nudge. */
export const ADAPTIVE_STREAK = 3;

export type AdaptiveSuggestion =
  | { kind: "none" }
  | { kind: "levelUp"; to: Difficulty }
  | { kind: "levelDown"; to: Difficulty }
  | { kind: "reviewLesson" };

export function harderDifficulty(d: Difficulty): Difficulty {
  return d === "easy" ? "medium" : "hard";
}

export function easierDifficulty(d: Difficulty): Difficulty {
  return d === "hard" ? "medium" : "easy";
}

/** Length of the trailing run of a given value at the end of the list. */
function trailingRun(results: boolean[], value: boolean): number {
  let n = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i] === value) n += 1;
    else break;
  }
  return n;
}

/**
 * Decides whether to nudge the learner based on their recent answers:
 *  - A run of correct answers suggests leveling up (unless already on hard).
 *  - A run of wrong answers suggests leveling down, or — when already on easy —
 *    going back to the lesson to review.
 */
export function adaptiveSuggestion(
  results: boolean[],
  difficulty: Difficulty,
  streak: number = ADAPTIVE_STREAK,
): AdaptiveSuggestion {
  if (trailingRun(results, true) >= streak && difficulty !== "hard") {
    return { kind: "levelUp", to: harderDifficulty(difficulty) };
  }
  if (trailingRun(results, false) >= streak) {
    return difficulty === "easy"
      ? { kind: "reviewLesson" }
      : { kind: "levelDown", to: easierDifficulty(difficulty) };
  }
  return { kind: "none" };
}
