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
