import { describe, expect, it } from "vitest";
import {
  integrateAccelerations,
  idealAccelerations,
  rmsError,
  errorToScore,
  scoreProfile,
} from "../accelerationPilotScoring";

describe("integrateAccelerations", () => {
  it("integrates a constant acceleration into a ramping velocity curve", () => {
    expect(integrateAccelerations([2, 2, 2], 1, 0)).toEqual([0, 2, 4, 6]);
  });

  it("respects the initial velocity v0 and dt", () => {
    expect(integrateAccelerations([-3, -3], 1, 9)).toEqual([9, 6, 3]);
  });

  it("can drive velocity through zero into negative (decelerate past stop)", () => {
    expect(integrateAccelerations([-3, -3, -3], 1, 6)).toEqual([6, 3, 0, -3]);
  });
});

describe("idealAccelerations", () => {
  it("recovers per-segment slopes (a = dv/dt) from a target velocity curve", () => {
    expect(idealAccelerations([0, 2, 4, 6], 1)).toEqual([2, 2, 2]);
  });

  it("recovers a speed-up-then-hold profile", () => {
    expect(idealAccelerations([0, 3, 6, 6, 6], 1)).toEqual([3, 3, 0, 0]);
  });
});

describe("rmsError", () => {
  it("is zero for identical curves", () => {
    expect(rmsError([0, 2, 4], [0, 2, 4])).toBe(0);
  });

  it("is positive when curves differ", () => {
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
  it("scores the ideal acceleration profile at 100", () => {
    const target = [9, 6, 3, 0, -3, -6, -9];
    const dt = 1;
    const ideal = idealAccelerations(target, dt);
    expect(scoreProfile(ideal, target, dt, 4)).toBe(100);
  });

  it("scores a do-nothing (zero acceleration) profile low on a moving target", () => {
    const target = [0, 2, 4, 6, 8, 10, 12];
    expect(scoreProfile([0, 0, 0, 0, 0, 0], target, 1, 4)).toBe(0);
  });
});
