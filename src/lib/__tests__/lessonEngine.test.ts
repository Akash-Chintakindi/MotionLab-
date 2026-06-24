import { describe, expect, it } from "vitest";
import {
  buildLessonSummary,
  computeMastery,
  computeResumeIndex,
} from "../lessonEngine";
import type { LessonProgress } from "../../types/progress";
import type { Lesson, LessonStep } from "../../types/content";

function lp(partial: Partial<LessonProgress>): LessonProgress {
  return {
    lessonId: "x",
    status: "in_progress",
    currentStepIndex: 0,
    completedStepIds: [],
    attemptsByStep: {},
    correctByStep: {},
    lastUpdatedAt: 0,
    completedAt: null,
    ...partial,
  };
}

const concept: LessonStep = {
  id: "c",
  type: "concept",
  prompt: "Intro",
  interactionConfig: {},
  correctAnswer: null,
  feedback: { correct: "ok", incorrect: "no" },
};
const mc: LessonStep = {
  id: "mc",
  type: "multipleChoice",
  prompt: "Pick one",
  interactionConfig: { options: [{ id: "a", label: "A" }] },
  correctAnswer: { optionId: "a" },
  feedback: { correct: "ok", incorrect: "no" },
};
const num: LessonStep = {
  id: "num",
  type: "numeric",
  prompt: "Compute",
  interactionConfig: { tolerance: 0.1 },
  correctAnswer: { value: 1 },
  feedback: { correct: "ok", incorrect: "no" },
};

function lesson(steps: LessonStep[]): Lesson {
  return {
    id: "l",
    title: "L",
    order: 1,
    estimatedMinutes: 5,
    coreIdea: "",
    steps,
  };
}

describe("computeMastery", () => {
  it("is 100% with no wrong steps", () => {
    expect(computeMastery(8, 0)).toBe(1);
  });
  it("drops proportionally with wrong steps", () => {
    expect(computeMastery(8, 2)).toBe(0.75);
  });
  it("handles empty lessons", () => {
    expect(computeMastery(0, 0)).toBe(1);
  });
});

describe("computeResumeIndex", () => {
  it("starts at 0 with no progress", () => {
    expect(computeResumeIndex(null, 8)).toBe(0);
  });
  it("resumes in-progress lessons at the saved step", () => {
    expect(
      computeResumeIndex(lp({ status: "in_progress", currentStepIndex: 3 }), 8),
    ).toBe(3);
  });
  it("clamps an out-of-range saved index", () => {
    expect(
      computeResumeIndex(lp({ status: "in_progress", currentStepIndex: 99 }), 8),
    ).toBe(7);
  });
});

describe("buildLessonSummary", () => {
  it("classifies gradable steps by attempts and skips concept steps", () => {
    const s = buildLessonSummary(
      lesson([concept, mc, num]),
      lp({ attemptsByStep: { mc: 1, num: 3 } }),
      0.5,
    );
    expect(s.totalGradable).toBe(2);
    expect(s.firstTryCount).toBe(1);
    expect(s.retriedCount).toBe(1);
    expect(s.masteryPct).toBe(50);
    expect(s.steps.map((x) => x.outcome)).toEqual([
      "info",
      "first-try",
      "retried",
    ]);
  });

  it("falls back to first-try ratio when mastery is missing", () => {
    const s = buildLessonSummary(
      lesson([mc, num]),
      lp({ attemptsByStep: { mc: 1, num: 2 } }),
      undefined,
    );
    expect(s.masteryPct).toBe(50);
  });

  it("treats unseen gradable steps as first-try (0 attempts)", () => {
    const s = buildLessonSummary(lesson([mc]), null, undefined);
    expect(s.firstTryCount).toBe(1);
    expect(s.retriedCount).toBe(0);
    expect(s.masteryPct).toBe(100);
  });
});
