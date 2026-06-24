import { describe, expect, it } from "vitest";
import { gradeQuestion, quizScorePct } from "../quiz";
import type { QuizQuestion } from "../../types/content";

const mc: QuizQuestion = {
  id: "m",
  type: "multipleChoice",
  category: "conceptual",
  prompt: "?",
  options: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
  ],
  correctOptionId: "b",
  explanation: "because",
};

const num: QuizQuestion = {
  id: "n",
  type: "numeric",
  category: "calculation",
  prompt: "?",
  value: 4,
  tolerance: 0.1,
  explanation: "because",
};

describe("gradeQuestion", () => {
  it("grades multiple-choice by option id", () => {
    expect(gradeQuestion(mc, { kind: "option", optionId: "b" })).toBe(true);
    expect(gradeQuestion(mc, { kind: "option", optionId: "a" })).toBe(false);
    expect(gradeQuestion(mc, { kind: "numeric", value: "b" })).toBe(false);
  });

  it("grades numeric within tolerance", () => {
    expect(gradeQuestion(num, { kind: "numeric", value: "4" })).toBe(true);
    expect(gradeQuestion(num, { kind: "numeric", value: "4.05" })).toBe(true);
    expect(gradeQuestion(num, { kind: "numeric", value: "4.5" })).toBe(false);
    expect(gradeQuestion(num, { kind: "numeric", value: "" })).toBe(false);
    expect(gradeQuestion(num, { kind: "numeric", value: "abc" })).toBe(false);
  });
});

describe("quizScorePct", () => {
  it("computes rounded percentages", () => {
    expect(quizScorePct(0, 10)).toBe(0);
    expect(quizScorePct(10, 10)).toBe(100);
    expect(quizScorePct(1, 3)).toBe(33);
    expect(quizScorePct(0, 0)).toBe(0);
  });
});
