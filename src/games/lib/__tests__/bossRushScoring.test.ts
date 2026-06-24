import { describe, expect, it } from "vitest";
import {
  countCorrect,
  longestStreak,
  comboBonus,
  summarizeRun,
  scoreRun,
} from "../bossRushScoring";

describe("countCorrect", () => {
  it("counts the true flags", () => {
    expect(countCorrect([true, false, true])).toBe(2);
    expect(countCorrect([false, false, false])).toBe(0);
    expect(countCorrect([])).toBe(0);
  });
});

describe("longestStreak", () => {
  it("finds the longest run of consecutive wins", () => {
    expect(longestStreak([true, true, false, true])).toBe(2);
    expect(longestStreak([true, true, true, true])).toBe(4);
    expect(longestStreak([false, true, true, true, false, true])).toBe(3);
  });

  it("is zero when nothing is correct or the run is empty", () => {
    expect(longestStreak([false, false])).toBe(0);
    expect(longestStreak([])).toBe(0);
  });
});

describe("comboBonus", () => {
  it("awards nothing for a streak under two", () => {
    expect(comboBonus(0)).toBe(0);
    expect(comboBonus(1)).toBe(0);
  });

  it("awards perExtra points per additional consecutive win", () => {
    expect(comboBonus(2)).toBe(2);
    expect(comboBonus(3)).toBe(4);
    expect(comboBonus(6)).toBe(10);
  });

  it("caps the bonus", () => {
    expect(comboBonus(10)).toBe(12);
    expect(comboBonus(50)).toBe(12);
  });
});

describe("summarizeRun", () => {
  it("breaks down a perfect run and caps the score at 100", () => {
    const flags = [true, true, true, true, true, true];
    const s = summarizeRun(flags);
    expect(s.correct).toBe(6);
    expect(s.total).toBe(6);
    expect(s.longestStreak).toBe(6);
    expect(s.base).toBe(100);
    expect(s.bonus).toBe(10);
    expect(s.score).toBe(100);
  });

  it("adds the combo bonus to the accuracy base", () => {
    const flags = [true, true, true, false, false, false];
    const s = summarizeRun(flags);
    expect(s.correct).toBe(3);
    expect(s.base).toBe(50);
    expect(s.longestStreak).toBe(3);
    expect(s.bonus).toBe(4);
    expect(s.score).toBe(54);
  });
});

describe("scoreRun", () => {
  it("scores a perfect run at 100", () => {
    expect(scoreRun([true, true, true, true, true, true])).toBe(100);
  });

  it("scores a blank run at 0", () => {
    expect(scoreRun([false, false, false, false, false, false])).toBe(0);
    expect(scoreRun([])).toBe(0);
  });

  it("rewards a half-correct run between the extremes", () => {
    const score = scoreRun([true, false, true, false, true, false]);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
    // 3/6 = 50 base, longest streak 1 -> no bonus.
    expect(score).toBe(50);
  });
});
