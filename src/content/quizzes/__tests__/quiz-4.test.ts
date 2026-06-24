import { describe, expect, it } from "vitest";
import { quiz4 } from "../quiz-4-acceleration-to-position";

describe("Lesson 4 quiz content", () => {
  it("targets the right lesson", () => {
    expect(quiz4.lessonId).toBe("lesson-4-acceleration-to-position");
  });

  it("has 8–10 questions with unique ids", () => {
    expect(quiz4.questions.length).toBeGreaterThanOrEqual(8);
    expect(quiz4.questions.length).toBeLessThanOrEqual(10);
    const ids = quiz4.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mixes conceptual and calculation questions", () => {
    const cats = quiz4.questions.map((q) => q.category);
    expect(cats).toContain("conceptual");
    expect(cats).toContain("calculation");
  });

  it("every question is well-formed and has an explanation", () => {
    for (const q of quiz4.questions) {
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
