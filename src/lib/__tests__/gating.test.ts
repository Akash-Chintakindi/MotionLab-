import { describe, expect, it } from "vitest";
import {
  LESSON_MASTERY_THRESHOLD,
  QUIZ_PASS_PERCENT,
  lessonMastery,
  modesUnlocked,
  quizPassed,
} from "../gating";

describe("gating thresholds", () => {
  it("uses 80% lesson mastery and 70% quiz pass bars", () => {
    expect(LESSON_MASTERY_THRESHOLD).toBe(0.8);
    expect(QUIZ_PASS_PERCENT).toBe(70);
  });
});

describe("lessonMastery", () => {
  it("returns 0 when no progress is recorded", () => {
    expect(lessonMastery(null, "l1")).toBe(0);
    expect(lessonMastery({ masteryByLesson: {} }, "l1")).toBe(0);
  });

  it("returns the stored mastery fraction", () => {
    expect(lessonMastery({ masteryByLesson: { l1: 0.9 } }, "l1")).toBe(0.9);
  });
});

describe("modesUnlocked", () => {
  it("locks practice/quiz below 80% mastery", () => {
    expect(modesUnlocked({ masteryByLesson: { l1: 0.79 } }, "l1")).toBe(false);
    expect(modesUnlocked(null, "l1")).toBe(false);
  });

  it("unlocks practice/quiz at exactly 80% and above", () => {
    expect(modesUnlocked({ masteryByLesson: { l1: 0.8 } }, "l1")).toBe(true);
    expect(modesUnlocked({ masteryByLesson: { l1: 1 } }, "l1")).toBe(true);
  });
});

describe("quizPassed", () => {
  it("requires 70% to pass", () => {
    expect(quizPassed(69)).toBe(false);
    expect(quizPassed(70)).toBe(true);
    expect(quizPassed(100)).toBe(true);
  });
});
