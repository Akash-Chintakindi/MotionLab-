import { describe, expect, it } from "vitest";
import { quiz8 } from "../quiz-8-free-fall";

describe("Lesson 8 quiz content", () => {
  it("targets the right lesson", () => {
    expect(quiz8.lessonId).toBe("lesson-8-free-fall");
  });

  it("has 8–10 questions with unique ids", () => {
    expect(quiz8.questions.length).toBeGreaterThanOrEqual(8);
    expect(quiz8.questions.length).toBeLessThanOrEqual(10);
    const ids = quiz8.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mixes conceptual and calculation questions", () => {
    const cats = quiz8.questions.map((q) => q.category);
    expect(cats).toContain("conceptual");
    expect(cats).toContain("calculation");
  });

  it("every question is well-formed and has an explanation", () => {
    for (const q of quiz8.questions) {
      expect(q.prompt.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(0);
      if (q.type === "multipleChoice") {
        expect(q.options && q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options!.map((o) => o.id)).toContain(q.correctOptionId);
      } else {
        expect(typeof q.value).toBe("number");
        expect(q.tolerance).toBeGreaterThan(0);
        expect(q.unit && q.unit.length).toBeGreaterThan(0);
        expect(q.placeholder && q.placeholder.length).toBeGreaterThan(0);
      }
    }
  });
});
