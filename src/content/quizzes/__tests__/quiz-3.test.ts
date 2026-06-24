import { describe, expect, it } from "vitest";
import { quiz3 } from "../quiz-3-displacement-area";

// Imported directly (not via the quizzes registry) so this suite stays
// self-contained; index.ts registration is reported separately for the
// integrator to apply.
describe("Lesson 3 quiz content", () => {
  it("targets the correct lesson", () => {
    expect(quiz3.lessonId).toBe("lesson-3-displacement-area");
  });

  it("has 8–10 questions with unique ids", () => {
    expect(quiz3.questions.length).toBeGreaterThanOrEqual(8);
    expect(quiz3.questions.length).toBeLessThanOrEqual(10);
    const ids = quiz3.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mixes conceptual and calculation questions", () => {
    const cats = quiz3.questions.map((q) => q.category);
    expect(cats).toContain("conceptual");
    expect(cats).toContain("calculation");
  });

  it("has at least one conceptual and one calculation question", () => {
    const conceptual = quiz3.questions.filter((q) => q.category === "conceptual");
    const calculation = quiz3.questions.filter((q) => q.category === "calculation");
    expect(conceptual.length).toBeGreaterThanOrEqual(1);
    expect(calculation.length).toBeGreaterThanOrEqual(1);
  });

  it("every question is well-formed and has an explanation", () => {
    for (const q of quiz3.questions) {
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

  it("only uses allowed plot presets", () => {
    const allowed = new Set([
      "vConstantPos",
      "vAccelPos",
      "vDecelToNeg",
      "vTriangleUp",
    ]);
    for (const q of quiz3.questions) {
      if (q.plot) expect(allowed.has(q.plot.preset)).toBe(true);
    }
  });
});
