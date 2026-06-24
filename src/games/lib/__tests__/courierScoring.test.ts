import { describe, expect, it } from "vitest";
import {
  dronePosition,
  distanceToWaypoint,
  closenessScore,
  scoreRound,
  isDelivered,
  trajectoryPoints,
  type DroneState,
  type Waypoint,
} from "../courierScoring";

const constant: DroneState = {
  x0: 0,
  y0: 0,
  vx: 2,
  vy: 1.5,
  ax: 0,
  ay: 0,
};

describe("dronePosition", () => {
  it("moves in a straight line under constant velocity", () => {
    expect(dronePosition(constant, 4)).toEqual({ x: 8, y: 6 });
  });

  it("treats x and y as independent and adds the ½at² term", () => {
    // Projectile-style arc: vx=3, vy=6, ay=-3.
    const arc: DroneState = { x0: 0, y0: 0, vx: 3, vy: 6, ax: 0, ay: -3 };
    expect(dronePosition(arc, 2)).toEqual({ x: 6, y: 6 }); // peak
    expect(dronePosition(arc, 4)).toEqual({ x: 12, y: 0 }); // landing
  });

  it("respects nonzero start position", () => {
    const s: DroneState = { x0: 5, y0: -2, vx: 0, vy: 0, ax: 0, ay: 0 };
    expect(dronePosition(s, 3)).toEqual({ x: 5, y: -2 });
  });
});

describe("distanceToWaypoint", () => {
  it("is zero when the drone lands exactly on the waypoint", () => {
    const wp: Waypoint = { t: 4, x: 8, y: 6 };
    expect(distanceToWaypoint(constant, wp)).toBeCloseTo(0, 6);
  });

  it("uses Euclidean distance (3-4-5 triangle)", () => {
    const wp: Waypoint = { t: 4, x: 11, y: 10 }; // off by (3, 4)
    expect(distanceToWaypoint(constant, wp)).toBeCloseTo(5, 6);
  });
});

describe("closenessScore", () => {
  it("gives full marks within tolerance", () => {
    expect(closenessScore(0, 0.5, 7)).toBe(100);
    expect(closenessScore(0.5, 0.5, 7)).toBe(100);
  });

  it("decays to zero past tolerance + scale", () => {
    expect(closenessScore(7.5, 0.5, 7)).toBe(0);
    expect(closenessScore(20, 0.5, 7)).toBe(0);
  });

  it("is linear in between", () => {
    // miss = tolerance + scale/2 → 50%.
    expect(closenessScore(0.5 + 3.5, 0.5, 7)).toBe(50);
  });

  it("returns 0 for a positive miss when scale is non-positive", () => {
    expect(closenessScore(1, 0.5, 0)).toBe(0);
  });
});

describe("scoreRound", () => {
  it("scores a perfect constant-velocity delivery at 100", () => {
    const wps: Waypoint[] = [{ t: 4, x: 8, y: 6 }];
    expect(scoreRound(constant, wps, 0.5, 7)).toBe(100);
  });

  it("scores a do-nothing drone low on a distant target", () => {
    const idle: DroneState = { x0: 0, y0: 0, vx: 0, vy: 0, ax: 0, ay: 0 };
    const wps: Waypoint[] = [{ t: 4, x: 8, y: 6 }]; // miss = 10 > 7.5
    expect(scoreRound(idle, wps, 0.5, 7)).toBe(0);
  });

  it("averages closeness across multiple waypoints", () => {
    const arc: DroneState = { x0: 0, y0: 0, vx: 3, vy: 6, ax: 0, ay: -3 };
    const wps: Waypoint[] = [
      { t: 2, x: 6, y: 6 },
      { t: 4, x: 12, y: 0 },
    ];
    expect(scoreRound(arc, wps, 0.5, 7)).toBe(100);
  });

  it("returns 0 for an empty round", () => {
    expect(scoreRound(constant, [], 0.5, 7)).toBe(0);
  });
});

describe("isDelivered", () => {
  it("flags a waypoint reached within tolerance", () => {
    expect(isDelivered(constant, { t: 4, x: 8, y: 6 }, 0.5)).toBe(true);
    expect(isDelivered(constant, { t: 4, x: 10, y: 6 }, 0.5)).toBe(false);
  });
});

describe("trajectoryPoints", () => {
  it("samples the path from start to tMax inclusive", () => {
    const pts = trajectoryPoints(constant, 4, 4);
    expect(pts.length).toBe(5);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[4]).toEqual({ x: 8, y: 6 });
  });
});
