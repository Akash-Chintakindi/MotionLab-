import type { QuizQuestion } from "../types/content";

/** A learner's raw answer to a quiz question. */
export type QuizAnswer =
  | { kind: "option"; optionId: string }
  | { kind: "numeric"; value: string };

/** Grades a single answer against the question's correct value. */
export function gradeQuestion(
  question: QuizQuestion,
  answer: QuizAnswer,
): boolean {
  if (question.type === "multipleChoice") {
    return answer.kind === "option" && answer.optionId === question.correctOptionId;
  }
  if (answer.kind !== "numeric") return false;
  const parsed = Number(answer.value);
  if (Number.isNaN(parsed) || answer.value.trim() === "") return false;
  const tol = question.tolerance ?? 0;
  return Math.abs(parsed - (question.value ?? 0)) <= tol;
}

/** Percentage (0–100) of questions answered correctly. */
export function quizScorePct(correctCount: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correctCount / total) * 100);
}
