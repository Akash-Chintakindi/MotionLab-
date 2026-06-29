import { describe, expect, it } from "vitest";
import { quiz9 } from "../quiz-9-relative-motion";

describe("Lesson 9 quiz content", () => {
  it("targets the right lesson", () => {
    expect(quiz9.lessonId).toBe("lesson-9-relative-motion");
  });

  it("has 8–10 questions with unique ids", () => {
    expect(quiz9.questions.length).toBeGreaterThanOrEqual(8);
    expect(quiz9.questions.length).toBeLessThanOrEqual(10);
    const ids = quiz9.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mixes conceptual and calculation questions", () => {
    const cats = quiz9.questions.map((q) => q.category);
    expect(cats).toContain("conceptual");
    expect(cats).toContain("calculation");
  });

  it("every question is well-formed and has an explanation", () => {
    for (const q of quiz9.questions) {
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
