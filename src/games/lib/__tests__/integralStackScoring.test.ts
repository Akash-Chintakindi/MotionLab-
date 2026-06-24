import { describe, expect, it } from "vitest";
import {
  totalDuration,
  velocityAtTime,
  positionAtTime,
  finalVelocity,
  finalPosition,
  targetScore,
  blendScore,
  isHit,
  type AccelSegment,
} from "../integralStackScoring";

const CONST: AccelSegment[] = [{ a: 2, duration: 5 }];
const TWO_SEG: AccelSegment[] = [
  { a: 3, duration: 3 },
  { a: -1, duration: 3 },
];

describe("totalDuration", () => {
  it("sums segment durations", () => {
    expect(totalDuration(CONST)).toBe(5);
    expect(totalDuration(TWO_SEG)).toBe(6);
  });
});

describe("velocityAtTime", () => {
  it("applies v = v0 + a·t for constant acceleration", () => {
    expect(velocityAtTime(0, CONST, 5)).toBe(10);
    expect(velocityAtTime(0, CONST, 2.5)).toBe(5);
  });

  it("respects a nonzero initial velocity", () => {
    expect(velocityAtTime(3, CONST, 5)).toBe(13);
  });

  it("accumulates across segments", () => {
    // 0 + 3·3 = 9 at the seam, then 9 + (-1)·3 = 6 at the end.
    expect(velocityAtTime(0, TWO_SEG, 3)).toBe(9);
    expect(velocityAtTime(0, TWO_SEG, 6)).toBe(6);
  });
});

describe("positionAtTime", () => {
  it("applies x = ½·a·t² from rest", () => {
    expect(positionAtTime(0, 0, CONST, 5)).toBe(25);
    expect(positionAtTime(0, 0, CONST, 2.5)).toBe(6.25);
  });

  it("includes the v0·t and x0 terms", () => {
    // x0=2, v0=1, a=2, t=5 -> 2 + 5 + 25 = 32
    expect(positionAtTime(2, 1, CONST, 5)).toBe(32);
  });

  it("accumulates position across segments", () => {
    // seg1: ½·3·9 = 13.5 ; seg2: 9·3 + ½·(-1)·9 = 27 - 4.5 = 22.5 ; total 36
    expect(positionAtTime(0, 0, TWO_SEG, 6)).toBe(36);
  });
});

describe("finalVelocity / finalPosition", () => {
  it("evaluate at the end of the whole profile", () => {
    expect(finalVelocity(0, CONST)).toBe(10);
    expect(finalPosition(0, 0, CONST)).toBe(25);
    expect(finalVelocity(0, TWO_SEG)).toBe(6);
    expect(finalPosition(0, 0, TWO_SEG)).toBe(36);
  });
});

describe("targetScore", () => {
  it("gives 100 for a perfect match and 0 past the scale", () => {
    expect(targetScore(10, 10, 4)).toBe(100);
    expect(targetScore(14, 10, 4)).toBe(0);
    expect(targetScore(6, 10, 4)).toBe(0);
    expect(targetScore(12, 10, 4)).toBe(50);
  });

  it("handles a non-positive scale", () => {
    expect(targetScore(5, 5, 0)).toBe(100);
    expect(targetScore(5, 6, 0)).toBe(0);
  });
});

describe("blendScore", () => {
  it("averages and rounds the parts", () => {
    expect(blendScore([100, 50])).toBe(75);
    expect(blendScore([100])).toBe(100);
    expect(blendScore([80, 90, 100])).toBe(90);
    expect(blendScore([])).toBe(0);
  });
});

describe("isHit", () => {
  it("is true within tolerance and false outside it", () => {
    expect(isHit(10, 10.4, 0.5)).toBe(true);
    expect(isHit(10, 11, 0.5)).toBe(false);
  });
});
