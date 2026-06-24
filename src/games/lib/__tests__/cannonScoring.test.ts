import { describe, expect, it } from "vitest";
import {
  toRadians,
  components,
  timeOfFlight,
  range,
  peakHeight,
  trajectoryPoint,
  minDistanceToTarget,
  heightAtX,
  clearsWall,
  distanceToScore,
  scoreShot,
  overallScore,
  type ShotConfig,
} from "../cannonScoring";

describe("toRadians", () => {
  it("converts degrees to radians", () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI, 6);
    expect(toRadians(0)).toBe(0);
  });
});

describe("components", () => {
  it("splits a horizontal launch into all-x velocity", () => {
    const c = components(10, 0);
    expect(c.x).toBeCloseTo(10, 6);
    expect(c.y).toBeCloseTo(0, 6);
  });

  it("matches vy = v·sinθ (lesson example: 20 m/s at 30°)", () => {
    const c = components(20, 30);
    expect(c.y).toBeCloseTo(10, 6); // 20·sin30° = 10
  });
});

describe("timeOfFlight / range / peakHeight (g = 10)", () => {
  it("a straight-up launch hangs for 2·vy/g seconds", () => {
    expect(timeOfFlight(20, 90, 10)).toBeCloseTo(4, 6); // 2·20/10
  });

  it("range is maximized at 45° (v²/g)", () => {
    expect(range(20, 45, 10)).toBeCloseTo(40, 4); // 400/10
  });

  it("range is symmetric about 45°", () => {
    expect(range(20, 30, 10)).toBeCloseTo(range(20, 60, 10), 4);
  });

  it("peak height depends only on the vertical component", () => {
    expect(peakHeight(20, 90, 10)).toBeCloseTo(20, 4); // 400/20
    expect(peakHeight(20, 45, 10)).toBeCloseTo(10, 4); // 200/20
  });
});

describe("trajectoryPoint", () => {
  it("evolves x linearly and y with constant acceleration", () => {
    // Horizontal launch: x grows steadily, y falls as -½gt².
    const p = trajectoryPoint(10, 0, 2, 10);
    expect(p.x).toBeCloseTo(20, 6);
    expect(p.y).toBeCloseTo(-20, 6);
  });

  it("a straight-up shot has no horizontal motion", () => {
    const p = trajectoryPoint(20, 90, 1, 10);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(15, 6); // 20·1 − 5·1²
  });
});

describe("minDistanceToTarget", () => {
  it("is ~0 when the landing point is the target", () => {
    const d = minDistanceToTarget(20, 45, { x: 40, y: 0 }, 10);
    expect(d).toBeLessThan(0.5);
  });

  it("is large for an unreachable target", () => {
    const d = minDistanceToTarget(20, 45, { x: 5, y: 100 }, 10);
    expect(d).toBeGreaterThan(50);
  });
});

describe("heightAtX / clearsWall", () => {
  it("reports the arc height at a horizontal position", () => {
    // 20 m/s at 45°: at x = 20 (half the 40 m range) it is at peak ≈ 10 m.
    expect(heightAtX(20, 45, 20, 10)).toBeCloseTo(10, 4);
  });

  it("a steep, fast shot clears a tall wall", () => {
    expect(clearsWall(28, 70, { x: 25, height: 18 }, 10)).toBe(true);
  });

  it("a flat shot fails to clear the wall", () => {
    expect(clearsWall(20, 45, { x: 25, height: 18 }, 10)).toBe(false);
  });
});

describe("distanceToScore", () => {
  it("gives full marks within tolerance and 0 past tolerance+scale", () => {
    expect(distanceToScore(0, 2, 20)).toBe(100);
    expect(distanceToScore(2, 2, 20)).toBe(100);
    expect(distanceToScore(12, 2, 20)).toBe(50);
    expect(distanceToScore(22, 2, 20)).toBe(0);
    expect(distanceToScore(50, 2, 20)).toBe(0);
  });
});

describe("scoreShot", () => {
  const flat: ShotConfig = { target: { x: 40, y: 0 }, tolerance: 2.5, scale: 20 };
  const walled: ShotConfig = {
    target: { x: 50, y: 0 },
    tolerance: 3,
    scale: 20,
    wall: { x: 25, height: 18 },
  };

  it("scores a direct hit at 100", () => {
    expect(scoreShot(20, 45, flat, 10)).toBe(100);
  });

  it("scores a wild miss low", () => {
    expect(scoreShot(8, 15, flat, 10)).toBeLessThan(40);
  });

  it("returns 0 when the shot is blocked by the wall", () => {
    expect(scoreShot(20, 45, walled, 10)).toBe(0);
  });

  it("rewards a shot that clears the wall and reaches the target", () => {
    expect(scoreShot(28, 70, walled, 10)).toBeGreaterThan(70);
  });
});

describe("overallScore", () => {
  it("averages the per-round bests", () => {
    expect(overallScore([100, 80, 60])).toBe(80);
    expect(overallScore([])).toBe(0);
  });
});
