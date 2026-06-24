import { describe, expect, it } from "vitest";
import { getQuiz, hasQuiz } from "../quizzes";

describe("Lesson 1 quiz content", () => {
  const quiz = getQuiz("lesson-1-position-velocity");

  it("is registered and resolvable", () => {
    expect(hasQuiz("lesson-1-position-velocity")).toBe(true);
    expect(quiz).toBeDefined();
  });

  it("has 8–10 questions with unique ids", () => {
    expect(quiz!.questions.length).toBeGreaterThanOrEqual(8);
    expect(quiz!.questions.length).toBeLessThanOrEqual(10);
    const ids = quiz!.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mixes conceptual and calculation questions", () => {
    const cats = quiz!.questions.map((q) => q.category);
    expect(cats).toContain("conceptual");
    expect(cats).toContain("calculation");
  });

  it("every question is well-formed and has an explanation", () => {
    for (const q of quiz!.questions) {
      expect(q.prompt.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(0);
      if (q.type === "multipleChoice") {
        expect(q.options && q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options!.map((o) => o.id)).toContain(q.correctOptionId);
      } else {
        expect(typeof q.value).toBe("number");
        expect(q.tolerance).toBeGreaterThan(0);
      }
    }
  });
});
