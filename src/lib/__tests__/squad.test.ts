import { describe, expect, it } from "vitest";
import {
  dailyBoardScore,
  formatAnswerTime,
  generateSquadCode,
  isValidSquadCode,
  normalizeSquadCode,
  SQUAD_CODE_LENGTH,
} from "../squad";

describe("squad codes", () => {
  it("generates a valid code of the right length", () => {
    const code = generateSquadCode(() => 0.5);
    expect(code).toHaveLength(SQUAD_CODE_LENGTH);
    expect(isValidSquadCode(code)).toBe(true);
  });

  it("never includes ambiguous characters", () => {
    let rng = 0;
    const code = generateSquadCode(() => {
      rng += 0.137;
      return rng % 1;
    });
    expect(code).not.toMatch(/[O0I1L]/);
  });

  it("normalizes user input (trim, uppercase, strip spaces)", () => {
    expect(normalizeSquadCode("  k7 m2qp ")).toBe("K7M2QP");
  });

  it("rejects malformed codes", () => {
    expect(isValidSquadCode("ABC")).toBe(false); // too short
    expect(isValidSquadCode("ABCDE0")).toBe(false); // contains 0
  });
});

describe("dailyBoardScore", () => {
  it("ranks correct answers above wrong ones", () => {
    expect(dailyBoardScore(true, 9000)).toBeGreaterThan(dailyBoardScore(false, 1));
  });

  it("ranks a faster correct answer above a slower one", () => {
    expect(dailyBoardScore(true, 3000)).toBeGreaterThan(dailyBoardScore(true, 8000));
  });

  it("gives wrong answers a floor of 0", () => {
    expect(dailyBoardScore(false, 1000)).toBe(0);
  });
});

describe("formatAnswerTime", () => {
  it("formats sub-minute times in seconds", () => {
    expect(formatAnswerTime(12_300)).toBe("12.3s");
  });

  it("formats longer times in minutes and seconds", () => {
    expect(formatAnswerTime(64_000)).toBe("1m 04s");
  });
});
