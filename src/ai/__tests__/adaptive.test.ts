import { describe, expect, it } from "vitest";
import {
  adaptiveSuggestion,
  easierDifficulty,
  harderDifficulty,
} from "../adaptive";

describe("difficulty helpers", () => {
  it("steps up and down without overshooting the ends", () => {
    expect(harderDifficulty("easy")).toBe("medium");
    expect(harderDifficulty("medium")).toBe("hard");
    expect(harderDifficulty("hard")).toBe("hard");
    expect(easierDifficulty("hard")).toBe("medium");
    expect(easierDifficulty("medium")).toBe("easy");
    expect(easierDifficulty("easy")).toBe("easy");
  });
});

describe("adaptiveSuggestion", () => {
  it("returns none without a long enough run", () => {
    expect(adaptiveSuggestion([true, true], "easy")).toEqual({ kind: "none" });
    expect(adaptiveSuggestion([false, true, false], "medium")).toEqual({
      kind: "none",
    });
  });

  it("suggests leveling up after a correct streak (except on hard)", () => {
    expect(adaptiveSuggestion([true, true, true], "easy")).toEqual({
      kind: "levelUp",
      to: "medium",
    });
    expect(adaptiveSuggestion([true, true, true], "medium")).toEqual({
      kind: "levelUp",
      to: "hard",
    });
    expect(adaptiveSuggestion([true, true, true, true], "hard")).toEqual({
      kind: "none",
    });
  });

  it("suggests leveling down after a wrong streak, or reviewing on easy", () => {
    expect(adaptiveSuggestion([false, false, false], "hard")).toEqual({
      kind: "levelDown",
      to: "medium",
    });
    expect(adaptiveSuggestion([false, false, false], "medium")).toEqual({
      kind: "levelDown",
      to: "easy",
    });
    expect(adaptiveSuggestion([false, false, false], "easy")).toEqual({
      kind: "reviewLesson",
    });
  });

  it("only considers the trailing run, not totals", () => {
    expect(adaptiveSuggestion([false, false, true, true, true], "easy")).toEqual(
      { kind: "levelUp", to: "medium" },
    );
    expect(adaptiveSuggestion([true, true, false, false, false], "medium")).toEqual(
      { kind: "levelDown", to: "easy" },
    );
  });
});
