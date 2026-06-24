import { describe, expect, it } from "vitest";
import { quiz5 } from "../quiz-5-two-dimensions";
import { gradeQuestion } from "../../../lib/quiz";

describe("Lesson 5 quiz content", () => {
  it("targets the right lesson", () => {
    expect(quiz5.lessonId).toBe("lesson-5-two-dimensions");
  });

  it("has 8–10 questions with unique ids", () => {
    expect(quiz5.questions.length).toBeGreaterThanOrEqual(8);
    expect(quiz5.questions.length).toBeLessThanOrEqual(10);
    const ids = quiz5.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mixes conceptual and calculation questions", () => {
    const cats = quiz5.questions.map((q) => q.category);
    expect(cats).toContain("conceptual");
    expect(cats).toContain("calculation");
  });

  it("every question is well-formed and has an explanation", () => {
    for (const q of quiz5.questions) {
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

  it("grades the authored correct answers as correct", () => {
    for (const q of quiz5.questions) {
      if (q.type === "multipleChoice") {
        expect(
          gradeQuestion(q, { kind: "option", optionId: q.correctOptionId! }),
        ).toBe(true);
      } else {
        expect(
          gradeQuestion(q, { kind: "numeric", value: String(q.value) }),
        ).toBe(true);
      }
    }
  });
});
