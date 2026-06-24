import { describe, expect, it } from "vitest";
import {
  integrateVelocities,
  idealVelocities,
  rmsError,
  errorToScore,
  scoreProfile,
} from "../driveScoring";

describe("integrateVelocities", () => {
  it("integrates a constant velocity into a straight path", () => {
    expect(integrateVelocities([2, 2, 2], 1, 0)).toEqual([0, 2, 4, 6]);
  });

  it("respects the starting position and dt", () => {
    expect(integrateVelocities([1, -1], 2, 5)).toEqual([5, 7, 5]);
  });
});

describe("idealVelocities", () => {
  it("recovers per-segment slopes from a target path", () => {
    expect(idealVelocities([0, 5, 8, 9], 1)).toEqual([5, 3, 1]);
  });
});

describe("rmsError", () => {
  it("is zero for identical paths", () => {
    expect(rmsError([0, 1, 2], [0, 1, 2])).toBe(0);
  });

  it("is positive when paths differ", () => {
    expect(rmsError([0, 0], [0, 2])).toBeCloseTo(Math.sqrt(2), 5);
  });
});

describe("errorToScore", () => {
  it("gives 100 for a perfect match and 0 past the scale", () => {
    expect(errorToScore(0, 4)).toBe(100);
    expect(errorToScore(4, 4)).toBe(0);
    expect(errorToScore(8, 4)).toBe(0);
    expect(errorToScore(2, 4)).toBe(50);
  });
});

describe("scoreProfile", () => {
  it("scores the ideal profile at 100", () => {
    const target = [0, 5, 8, 9, 8, 5, 0];
    const dt = 1;
    const ideal = idealVelocities(target, dt);
    expect(scoreProfile(ideal, target, dt, 4)).toBe(100);
  });

  it("scores a flat (do-nothing) profile low on a moving target", () => {
    const target = [0, 5, 8, 9, 8, 5, 0];
    expect(scoreProfile([0, 0, 0, 0, 0, 0], target, 1, 4)).toBe(0);
  });
});
