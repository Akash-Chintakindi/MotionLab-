// Gating layer that decides where a practice question comes from based on the
// global AI toggle. When AI is OFF (the default) it draws straight from the
// static bank and makes NO network call; when ON it tries the Cloud Function
// and gracefully falls back to the bank on any error.

import { generatePracticeQuestion } from "./practiceService";
import { getRandomQuestion } from "../content/practiceBank";
import type { BankQuestion } from "../content/practiceBank/types";
import { isAiEnabled } from "../lib/aiSettings";
import type { AIPracticeQuestion, GenerateParams } from "./practiceTypes";

/** A question plus where it came from, so callers can adapt it appropriately. */
export type PracticeQuestionResult =
  | { source: "ai"; question: AIPracticeQuestion }
  | { source: "bank"; question: BankQuestion };

export interface GetPracticeParams extends GenerateParams {
  /** Bank ids to avoid repeating when using/falling back to the bank. */
  excludeBankIds?: string[];
  /** Injectable RNG for deterministic bank selection in tests. */
  rng?: () => number;
}

/** Pull a question from the static bank, or throw if the bank is somehow empty. */
function fromBank(params: GetPracticeParams): PracticeQuestionResult {
  const question = getRandomQuestion(
    params.difficulty,
    params.excludeBankIds ?? [],
    params.rng,
  );
  if (!question) throw new Error("No practice questions are available.");
  return { source: "bank", question };
}

/**
 * Resolve a practice question honoring the global AI toggle:
 *  - AI disabled → bank directly, no network call.
 *  - AI enabled  → try the Cloud Function, fall back to the bank on error.
 */
export async function getPracticeQuestion(
  params: GetPracticeParams,
): Promise<PracticeQuestionResult> {
  if (!isAiEnabled()) {
    return fromBank(params);
  }
  try {
    const question = await generatePracticeQuestion({
      topic: params.topic,
      difficulty: params.difficulty,
      avoidPrompts: params.avoidPrompts,
    });
    return { source: "ai", question };
  } catch {
    return fromBank(params);
  }
}

/**
 * Adapt an AI-generated question into the `BankQuestion` shape so the arcade
 * games' existing question modals (which render/grade `BankQuestion`s) can show
 * it without any rendering changes. The AI shape lacks topic/category metadata,
 * so we attach the topic we requested and derive a sensible category label.
 */
export function aiToBankQuestion(
  q: AIPracticeQuestion,
  difficulty: BankQuestion["difficulty"],
  topicId: string,
): BankQuestion {
  return {
    id: q.id,
    type: q.type,
    category: q.type === "numeric" ? "calculation" : "conceptual",
    prompt: q.prompt,
    options: q.options,
    correctOptionId: q.correctOptionId,
    value: q.value,
    tolerance: q.tolerance,
    unit: q.unit,
    explanation: q.explanation,
    topicId,
    difficulty,
  };
}

/**
 * One-call helper for the arcade games: fetch a question honoring the AI toggle
 * and return it as a ready-to-render `BankQuestion`. Picks a random topic to
 * ground the AI prompt, and threads the caller's seen-prompt / seen-id lists so
 * AI and bank questions both avoid repeats. Returns null if nothing is available.
 */
export async function getGameQuestion(params: {
  difficulty: BankQuestion["difficulty"];
  topics: { id: string; title: string; blurb: string }[];
  avoidPrompts?: string[];
  excludeBankIds?: string[];
  rng?: () => number;
}): Promise<{ question: BankQuestion; source: "ai" | "bank" } | null> {
  const { difficulty, topics } = params;
  const pickRandom = params.rng ?? Math.random;
  const topic = topics[Math.floor(pickRandom() * topics.length)] ?? topics[0];
  if (!topic) return null;
  try {
    const res = await getPracticeQuestion({
      topic,
      difficulty,
      avoidPrompts: params.avoidPrompts,
      excludeBankIds: params.excludeBankIds,
      rng: params.rng,
    });
    if (res.source === "ai") {
      return {
        question: aiToBankQuestion(res.question, difficulty, topic.id),
        source: "ai",
      };
    }
    return { question: res.question, source: "bank" };
  } catch {
    return null;
  }
}

/** Adapt a static bank question into the AI question shape used by the hub. */
export function bankQuestionToAi(q: BankQuestion): AIPracticeQuestion {
  if (q.type === "multipleChoice") {
    return {
      id: q.id,
      type: "multipleChoice",
      prompt: q.prompt,
      options: q.options ?? [],
      correctOptionId: q.correctOptionId,
      explanation: q.explanation,
    };
  }
  const ai: AIPracticeQuestion = {
    id: q.id,
    type: "numeric",
    prompt: q.prompt,
    value: q.value,
    tolerance: q.tolerance,
    explanation: q.explanation,
  };
  if (q.unit) ai.unit = q.unit;
  return ai;
}
