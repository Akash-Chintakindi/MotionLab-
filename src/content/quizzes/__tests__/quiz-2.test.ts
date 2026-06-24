import { describe, expect, it } from "vitest";
import { quiz2 } from "../quiz-2-velocity-acceleration";

describe("Lesson 2 quiz content", () => {
  it("targets the correct lesson", () => {
    expect(quiz2.lessonId).toBe("lesson-2-velocity-acceleration");
  });

  it("has 8–10 questions with unique ids", () => {
    expect(quiz2.questions.length).toBeGreaterThanOrEqual(8);
    expect(quiz2.questions.length).toBeLessThanOrEqual(10);
    const ids = quiz2.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mixes conceptual and calculation questions", () => {
    const cats = quiz2.questions.map((q) => q.category);
    expect(cats).toContain("conceptual");
    expect(cats).toContain("calculation");
  });

  it("every question is well-formed and has an explanation", () => {
    for (const q of quiz2.questions) {
      expect(q.prompt.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(0);
      if (q.type === "multipleChoice") {
        expect(q.options && q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options!.map((o) => o.id)).toContain(q.correctOptionId);
      } else {
        expect(typeof q.value).toBe("number");
        expect(Number.isFinite(q.value)).toBe(true);
        expect(q.tolerance).toBeGreaterThan(0);
      }
    }
  });
});
