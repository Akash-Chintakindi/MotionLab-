import { describe, expect, it } from "vitest";
import {
  netDisplacement,
  distanceTravelled,
  closenessScore,
  scoreInterval,
  overallBest,
} from "../areaPainterScoring";

describe("netDisplacement", () => {
  it("is the rectangle area for a constant velocity", () => {
    expect(netDisplacement(() => 3, 0, 4)).toBeCloseTo(12, 5);
  });

  it("is the triangle area under v = 8 - 2t on [0, 4]", () => {
    // ½ · base(4) · height(8) = 16
    expect(netDisplacement((t) => 8 - 2 * t, 0, 4)).toBeCloseTo(16, 5);
  });

  it("nets positive and negative regions with sign", () => {
    // v = 8 - 2t crosses zero at t = 4; over [0,6] net = 16 - 4 = 12
    expect(netDisplacement((t) => 8 - 2 * t, 0, 6)).toBeCloseTo(12, 5);
  });

  it("is zero when positive and negative areas balance", () => {
    // v = 8 - 2t over [2, 6]: a + b = 8 ⇒ symmetric about the zero crossing
    expect(netDisplacement((t) => 8 - 2 * t, 2, 6)).toBeCloseTo(0, 5);
  });
});

describe("distanceTravelled", () => {
  it("adds the sizes of both areas regardless of sign", () => {
    // v = 8 - 2t over [0,6]: 16 forward + 4 backward = 20
    expect(distanceTravelled((t) => 8 - 2 * t, 0, 6)).toBeCloseTo(20, 5);
  });

  it("equals net displacement when velocity never changes sign", () => {
    const v = (t: number) => 2 + t;
    expect(distanceTravelled(v, 0, 6)).toBeCloseTo(netDisplacement(v, 0, 6), 5);
  });
});

describe("closenessScore", () => {
  it("gives 100 for an exact hit", () => {
    expect(closenessScore(12, 12, 6)).toBe(100);
  });

  it("gives 0 at or beyond the scale", () => {
    expect(closenessScore(18, 12, 6)).toBe(0);
    expect(closenessScore(30, 12, 6)).toBe(0);
  });

  it("falls linearly between", () => {
    expect(closenessScore(15, 12, 6)).toBe(50);
    expect(closenessScore(9, 12, 6)).toBe(50);
  });

  it("works for negative targets", () => {
    expect(closenessScore(-4, -4, 6)).toBe(100);
    expect(closenessScore(-1, -4, 6)).toBe(50);
  });

  it("handles a zero scale degenerate case", () => {
    expect(closenessScore(0, 0, 0)).toBe(100);
    expect(closenessScore(1, 0, 0)).toBe(0);
  });
});

describe("scoreInterval", () => {
  it("scores a perfect interval choice at 100", () => {
    const v = (t: number) => 8 - 2 * t;
    // [2,6] nets 0, matching a balance target of 0
    expect(scoreInterval(v, 2, 6, 0, 6)).toBe(100);
  });

  it("scores a poor interval choice low", () => {
    const v = (t: number) => 8 - 2 * t;
    // [0,4] nets 16, far from a target of 0 with scale 6
    expect(scoreInterval(v, 0, 4, 0, 6)).toBe(0);
  });
});

describe("overallBest", () => {
  it("averages the per-round bests and rounds", () => {
    expect(overallBest([100, 50, 0])).toBe(50);
    expect(overallBest([90, 80, 70])).toBe(80);
  });

  it("is 0 with no rounds", () => {
    expect(overallBest([])).toBe(0);
  });
});
