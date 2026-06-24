import { describe, expect, it } from "vitest";
import { quiz7 } from "../quiz-7-mastery-challenge";
import { gradeQuestion } from "../../../lib/quiz";

describe("Lesson 7 mastery-challenge quiz content", () => {
  it("targets the right lesson", () => {
    expect(quiz7.lessonId).toBe("lesson-7-mastery-challenge");
  });

  it("has 8–10 questions with unique ids", () => {
    expect(quiz7.questions.length).toBeGreaterThanOrEqual(8);
    expect(quiz7.questions.length).toBeLessThanOrEqual(10);
    const ids = quiz7.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mixes conceptual and calculation questions", () => {
    const cats = quiz7.questions.map((q) => q.category);
    expect(cats).toContain("conceptual");
    expect(cats).toContain("calculation");
  });

  it("every question is well-formed and has an explanation", () => {
    for (const q of quiz7.questions) {
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

  it("grades the intended correct answer as correct for every question", () => {
    for (const q of quiz7.questions) {
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

  it("only uses approved graph/plot presets", () => {
    const curves = new Set([
      "scurveSin",
      "parabolaDown",
      "accelerating",
      "linearUp",
      "linearDown",
    ]);
    const plots = new Set([
      "vConstantPos",
      "vAccelPos",
      "vDecelToNeg",
      "vTriangleUp",
    ]);
    for (const q of quiz7.questions) {
      if (q.graph) expect(curves.has(q.graph.curve)).toBe(true);
      if (q.plot) expect(plots.has(q.plot.preset)).toBe(true);
    }
  });
});
