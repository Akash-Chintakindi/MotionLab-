import { describe, expect, it } from "vitest";
import {
  answerPoints,
  generateGamePin,
  isValidGamePin,
  MIN_CORRECT_POINTS,
  normalizeGamePin,
  POINTS_PER_CORRECT,
  sampleQuestionIds,
  secondsLeft,
  sortPlayers,
  topPlayers,
  type LivePlayer,
} from "../liveGame";
import type { BankQuestion } from "../../content/practiceBank/types";

function player(p: Partial<LivePlayer>): LivePlayer {
  return {
    uid: "u",
    name: "P",
    score: 0,
    answeredIndex: -1,
    lastCorrect: false,
    joinedAt: 0,
    ...p,
  };
}

describe("game pin", () => {
  it("generates a 6-digit numeric pin", () => {
    const pin = generateGamePin(() => 0.42);
    expect(pin).toHaveLength(6);
    expect(isValidGamePin(pin)).toBe(true);
  });

  it("validates and normalizes input", () => {
    expect(isValidGamePin("12345")).toBe(false);
    expect(isValidGamePin("abcdef")).toBe(false);
    expect(normalizeGamePin(" 12 34 56 78 ")).toBe("123456");
  });
});

describe("sampleQuestionIds", () => {
  const bank = Array.from({ length: 10 }, (_, i) => ({
    id: `q${i}`,
  })) as BankQuestion[];

  it("returns the requested count of distinct ids", () => {
    const ids = sampleQuestionIds(bank, 5, () => 0.3);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  it("never asks for more than the bank holds", () => {
    expect(sampleQuestionIds(bank, 100, () => 0.1)).toHaveLength(10);
  });
});

describe("sortPlayers / topPlayers", () => {
  it("ranks by score desc then earliest join", () => {
    const ranked = sortPlayers([
      player({ uid: "a", score: 1000, joinedAt: 5 }),
      player({ uid: "b", score: 2000, joinedAt: 9 }),
      player({ uid: "c", score: 1000, joinedAt: 2 }),
    ]);
    expect(ranked.map((p) => p.uid)).toEqual(["b", "c", "a"]);
  });

  it("topPlayers limits the list", () => {
    const players = Array.from({ length: 8 }, (_, i) =>
      player({ uid: `u${i}`, score: i * 100 }),
    );
    expect(topPlayers(players, 5)).toHaveLength(5);
  });
});

describe("answerPoints (speed-weighted)", () => {
  it("awards the max for a near-instant correct answer", () => {
    expect(answerPoints(true, 0, 25)).toBe(POINTS_PER_CORRECT);
  });

  it("decreases as the clock runs, flooring at the time limit", () => {
    const half = answerPoints(true, 12_500, 25);
    expect(half).toBeLessThan(POINTS_PER_CORRECT);
    expect(half).toBeGreaterThan(MIN_CORRECT_POINTS);
    expect(answerPoints(true, 25_000, 25)).toBe(MIN_CORRECT_POINTS);
    expect(answerPoints(true, 999_000, 25)).toBe(MIN_CORRECT_POINTS);
  });

  it("awards nothing for a wrong answer", () => {
    expect(answerPoints(false, 0, 25)).toBe(0);
  });
});

describe("secondsLeft", () => {
  it("counts down and floors at zero", () => {
    expect(secondsLeft(10_000, 12_000, 25)).toBe(23);
    expect(secondsLeft(10_000, 999_000, 25)).toBe(0);
  });
});
