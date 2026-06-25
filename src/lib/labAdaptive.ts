// Pure logic for the Lab survival game: adaptive difficulty control, a
// "weak areas" report, and a single question shape that both AI-generated and
// static-bank questions normalize into. Dependency-free (no React/Firebase) so
// it is straightforward to unit-test.

import { easierDifficulty, harderDifficulty } from "../ai/adaptive";
import {
  DIFFICULTIES,
  type AIPracticeQuestion,
  type Difficulty,
} from "../ai/practiceTypes";
import type { BankQuestion } from "../content/practiceBank/types";
import type { QuizQuestion } from "../types/content";

/** Correct/incorrect answers in a row at the current level that move it. */
export const LEVEL_STREAK = 2;

/**
 * One renderable, gradable question for the Lab. It is a `QuizQuestion`
 * (so it grades through the shared `gradeQuestion`) plus the topic/difficulty
 * context the game needs and the provenance of the question.
 */
export interface LabQuestion extends QuizQuestion {
  /** Lesson/topic id this question belongs to (see src/content/course.ts). */
  topicId: string;
  difficulty: Difficulty;
  /** Where the question came from: the AI model or the static fallback bank. */
  source: "ai" | "bank";
}

/** Adaptive difficulty controller state, tracked across the run. */
export interface AdaptiveState {
  difficulty: Difficulty;
  /** Consecutive correct answers at the current level. */
  correctStreak: number;
  /** Consecutive wrong answers at the current level. */
  wrongStreak: number;
}

export const INITIAL_ADAPTIVE: AdaptiveState = {
  difficulty: "easy",
  correctStreak: 0,
  wrongStreak: 0,
};

export interface AdaptiveResult {
  next: AdaptiveState;
  /**
   * True when the learner just missed `streak` easy questions in a row — the UI
   * should surface a "review this lesson" prompt. The run is not affected.
   */
  reviewLesson: boolean;
}

/**
 * Applies a graded answer to the adaptive state:
 *  - `streak` correct in a row moves the level up (until "hard").
 *  - `streak` wrong in a row moves the level down, or — when already on
 *    "easy" — flags a lesson review and resets the streak.
 */
export function applyAnswer(
  state: AdaptiveState,
  correct: boolean,
  streak: number = LEVEL_STREAK,
): AdaptiveResult {
  if (correct) {
    const correctStreak = state.correctStreak + 1;
    if (correctStreak >= streak && state.difficulty !== "hard") {
      return {
        next: {
          difficulty: harderDifficulty(state.difficulty),
          correctStreak: 0,
          wrongStreak: 0,
        },
        reviewLesson: false,
      };
    }
    return {
      next: { ...state, correctStreak, wrongStreak: 0 },
      reviewLesson: false,
    };
  }

  const wrongStreak = state.wrongStreak + 1;
  if (wrongStreak >= streak) {
    if (state.difficulty === "easy") {
      return {
        next: { ...state, correctStreak: 0, wrongStreak: 0 },
        reviewLesson: true,
      };
    }
    return {
      next: {
        difficulty: easierDifficulty(state.difficulty),
        correctStreak: 0,
        wrongStreak: 0,
      },
      reviewLesson: false,
    };
  }
  return {
    next: { ...state, correctStreak: 0, wrongStreak },
    reviewLesson: false,
  };
}

/** A single graded answer, kept for the end-of-run report. */
export interface AnswerRecord {
  topicId: string;
  difficulty: Difficulty;
  correct: boolean;
}

/** A topic the learner struggled with, with the difficulties they missed. */
export interface WeakArea {
  topicId: string;
  /** Number of missed questions in this topic. */
  missed: number;
  /** Total questions answered in this topic. */
  total: number;
  /** Difficulties (ordered easy→hard) at which questions were missed. */
  difficulties: Difficulty[];
}

/**
 * Summarizes the topics where the learner missed at least one question, most
 * missed first, so the game-over screen can point them back to the right
 * lessons.
 */
export function weakAreas(records: AnswerRecord[]): WeakArea[] {
  const byTopic = new Map<
    string,
    { missed: number; total: number; diffs: Set<Difficulty> }
  >();

  for (const r of records) {
    const entry =
      byTopic.get(r.topicId) ??
      { missed: 0, total: 0, diffs: new Set<Difficulty>() };
    entry.total += 1;
    if (!r.correct) {
      entry.missed += 1;
      entry.diffs.add(r.difficulty);
    }
    byTopic.set(r.topicId, entry);
  }

  const out: WeakArea[] = [];
  for (const [topicId, entry] of byTopic) {
    if (entry.missed === 0) continue;
    out.push({
      topicId,
      missed: entry.missed,
      total: entry.total,
      difficulties: DIFFICULTIES.filter((d) => entry.diffs.has(d)),
    });
  }
  out.sort((a, b) => b.missed - a.missed || b.total - a.total);
  return out;
}

/** Default absolute tolerance for numeric grading when none is supplied. */
export function defaultNumericTolerance(value: number): number {
  return Math.max(0.01, Math.abs(value) * 0.02);
}

/** Adapts a static bank question into the unified Lab shape. */
export function bankToLabQuestion(q: BankQuestion): LabQuestion {
  return { ...q, source: "bank" };
}

/** Adapts an AI-generated question into the unified Lab shape. */
export function aiToLabQuestion(
  q: AIPracticeQuestion,
  topicId: string,
  difficulty: Difficulty,
): LabQuestion {
  const base = {
    id: q.id,
    prompt: q.prompt,
    explanation: q.explanation,
    topicId,
    difficulty,
    source: "ai" as const,
  };

  if (q.type === "multipleChoice") {
    return {
      ...base,
      type: "multipleChoice",
      category: "conceptual",
      options: q.options ?? [],
      correctOptionId: q.correctOptionId,
    };
  }

  const value = q.value ?? 0;
  return {
    ...base,
    type: "numeric",
    category: "calculation",
    value,
    tolerance: q.tolerance ?? defaultNumericTolerance(value),
    unit: q.unit,
  };
}
