import { describe, it, expect } from "vitest";
import {
  applyShot,
  stepSimulation,
  computeIdealShot,
  gradeShot,
  angleDelta,
  DEFAULT_TOLERANCE,
  type Ball,
  type PoolTable,
  type Pocket,
  type PoolEvent,
} from "../poolPhysics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBall(over: Partial<Ball> & Pick<Ball, "id" | "pos">): Ball {
  return {
    vel: { x: 0, y: 0 },
    radius: 1,
    color: "#fff",
    pocketed: false,
    ...over,
  };
}

/** A roomy table whose pockets sit clear of the cushions used by the tests. */
function makeTable(over: Partial<PoolTable> = {}): PoolTable {
  return {
    width: 100,
    height: 50,
    ballRadius: 1,
    friction: 40,
    cushionRestitution: 0.6,
    pockets: [],
    ...over,
  };
}

function speed(b: Ball): number {
  return Math.hypot(b.vel.x, b.vel.y);
}

/**
 * Runs the sim with a fixed small dt until settled (or a step cap is hit).
 * Returns the final balls plus every event that fired along the way.
 */
function runToSettle(
  balls: Ball[],
  table: PoolTable,
  dt = 1 / 240,
  maxSteps = 200_000,
): { balls: Ball[]; events: PoolEvent[]; steps: number } {
  let current = balls;
  const events: PoolEvent[] = [];
  let steps = 0;
  for (; steps < maxSteps; steps++) {
    const res = stepSimulation(current, table, dt);
    current = res.balls;
    events.push(...res.events);
    if (res.settled) break;
  }
  return { balls: current, events, steps };
}

const byId = (balls: Ball[], id: string): Ball => {
  const b = balls.find((x) => x.id === id);
  if (!b) throw new Error(`ball ${id} not found`);
  return b;
};

// ---------------------------------------------------------------------------
// Friction
// ---------------------------------------------------------------------------

describe("friction stopping distance", () => {
  it("stops after ~v^2 / (2a) units", () => {
    const table = makeTable({ friction: 40 });
    const v = 30;
    const start = { x: 50, y: 25 };
    const ball = makeBall({ id: "b", pos: { ...start }, vel: { x: v, y: 0 } });

    const { balls } = runToSettle([ball], table);
    const final = byId(balls, "b");

    const expected = (v * v) / (2 * table.friction); // 11.25
    const travelled = final.pos.x - start.x;

    expect(final.pos.y).toBeCloseTo(25, 6);
    expect(speed(final)).toBe(0);
    expect(Math.abs(travelled - expected)).toBeLessThan(0.5);
  });

  it("scales stopping distance with the square of the launch speed", () => {
    const table = makeTable({ friction: 40 });
    const dist = (v: number) => {
      const ball = makeBall({ id: "b", pos: { x: 20, y: 25 }, vel: { x: v, y: 0 } });
      const { balls } = runToSettle([ball], table);
      return byId(balls, "b").pos.x - 20;
    };
    const d1 = dist(20);
    const d2 = dist(40); // doubling speed -> ~4x distance
    expect(d2 / d1).toBeGreaterThan(3.8);
    expect(d2 / d1).toBeLessThan(4.2);
  });
});

// ---------------------------------------------------------------------------
// Equal-mass elastic collision
// ---------------------------------------------------------------------------

describe("equal-mass head-on elastic collision", () => {
  it("transfers all velocity from the mover to the struck ball", () => {
    // Friction-free so momentum & energy are exactly conserved at impact.
    const table = makeTable({ friction: 0 });
    const a = makeBall({ id: "a", pos: { x: 20, y: 25 }, vel: { x: 20, y: 0 } });
    const b = makeBall({ id: "b", pos: { x: 40, y: 25 }, vel: { x: 0, y: 0 } });

    let current = [a, b];
    const dt = 1 / 480;
    let collided = false;
    for (let i = 0; i < 5000 && !collided; i++) {
      const pxBefore = current.reduce((s, x) => s + x.vel.x, 0);
      const keBefore = current.reduce((s, x) => s + speed(x) ** 2, 0);
      const res = stepSimulation(current, table, dt);
      current = res.balls;
      if (res.events.some((e) => e.type === "ballCollision")) {
        collided = true;
        const pxAfter = current.reduce((s, x) => s + x.vel.x, 0);
        const keAfter = current.reduce((s, x) => s + speed(x) ** 2, 0);
        // conservation of momentum and kinetic energy (equal mass)
        expect(pxAfter).toBeCloseTo(pxBefore, 3);
        expect(keAfter).toBeCloseTo(keBefore, 2);
      }
    }

    expect(collided).toBe(true);
    // mover stopped, struck ball carries the velocity
    expect(byId(current, "a").vel.x).toBeCloseTo(0, 4);
    expect(byId(current, "b").vel.x).toBeCloseTo(20, 4);
  });

  it("emits a ballCollision event carrying the impact speed", () => {
    const table = makeTable({ friction: 0 });
    const a = makeBall({ id: "a", pos: { x: 20, y: 25 }, vel: { x: 20, y: 0 } });
    const b = makeBall({ id: "b", pos: { x: 40, y: 25 }, vel: { x: 0, y: 0 } });
    const { events } = runToSettleUntilEvent([a, b], table, "ballCollision");
    const hit = events.find((e) => e.type === "ballCollision");
    expect(hit).toBeTruthy();
    if (hit && hit.type === "ballCollision") {
      expect(hit.impact).toBeCloseTo(20, 2);
    }
  });
});

/** Steps until a given event type fires (used for friction-free scenarios). */
function runToSettleUntilEvent(
  balls: Ball[],
  table: PoolTable,
  type: PoolEvent["type"],
  dt = 1 / 480,
  maxSteps = 20_000,
): { balls: Ball[]; events: PoolEvent[] } {
  let current = balls;
  const events: PoolEvent[] = [];
  for (let i = 0; i < maxSteps; i++) {
    const res = stepSimulation(current, table, dt);
    current = res.balls;
    events.push(...res.events);
    if (res.events.some((e) => e.type === type)) break;
    if (res.settled) break;
  }
  return { balls: current, events };
}

// ---------------------------------------------------------------------------
// No tunneling (sub-stepping)
// ---------------------------------------------------------------------------

describe("no tunneling", () => {
  it("a very fast ball still collides with a stationary one", () => {
    const table = makeTable({ friction: 0 });
    // dt is huge and speed enormous: without sub-stepping the ball would jump
    // 500 units in one call, leaping clean past the target 10 units away.
    const fast = makeBall({ id: "fast", pos: { x: 10, y: 25 }, vel: { x: 5000, y: 0 } });
    const target = makeBall({ id: "target", pos: { x: 20, y: 25 }, vel: { x: 0, y: 0 } });

    const res = stepSimulation([fast, target], table, 0.1);

    const hit = res.events.some((e) => e.type === "ballCollision");
    expect(hit).toBe(true);
    // momentum passed to the target instead of the mover sailing through
    expect(byId(res.balls, "target").vel.x).toBeGreaterThan(1);
  });

  it("a fast ball does not skip past a pocket", () => {
    const pocket: Pocket = { id: "p", pos: { x: 60, y: 25 }, radius: 2.5 };
    const table = makeTable({ friction: 0, pockets: [pocket] });
    const ball = makeBall({ id: "b", pos: { x: 5, y: 25 }, vel: { x: 6000, y: 0 } });

    const res = stepSimulation([ball], table, 0.1);
    expect(res.events.some((e) => e.type === "pocketed")).toBe(true);
    expect(byId(res.balls, "b").pocketed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cushions
// ---------------------------------------------------------------------------

describe("cushion bounce", () => {
  it("reverses the perpendicular component and loses energy per restitution", () => {
    const restitution = 0.6;
    const table = makeTable({ friction: 0, cushionRestitution: restitution });
    const ball = makeBall({ id: "b", pos: { x: 90, y: 25 }, vel: { x: 20, y: 0 } });

    let current = [ball];
    const dt = 1 / 480;
    let bounced = false;
    for (let i = 0; i < 5000 && !bounced; i++) {
      const vBefore = byId(current, "b").vel.x;
      const res = stepSimulation(current, table, dt);
      current = res.balls;
      if (res.events.some((e) => e.type === "cushion")) {
        bounced = true;
        const vAfter = byId(current, "b").vel.x;
        // direction flipped...
        expect(Math.sign(vAfter)).toBe(-Math.sign(vBefore));
        // ...and speed reduced by the restitution factor
        expect(Math.abs(vAfter)).toBeCloseTo(Math.abs(vBefore) * restitution, 3);
      }
    }
    expect(bounced).toBe(true);
  });

  it("only reflects the component normal to the cushion (y untouched on a side wall)", () => {
    const table = makeTable({ friction: 0, cushionRestitution: 0.8 });
    const ball = makeBall({ id: "b", pos: { x: 90, y: 25 }, vel: { x: 20, y: 7 } });
    const { balls } = runToSettleUntilEvent([ball], table, "cushion");
    const after = byId(balls, "b");
    expect(after.vel.x).toBeLessThan(0); // x reflected
    expect(after.vel.y).toBeCloseTo(7, 3); // y preserved (no friction)
  });
});

// ---------------------------------------------------------------------------
// computeIdealShot (ghost-ball method)
// ---------------------------------------------------------------------------

describe("computeIdealShot", () => {
  it("aims straight along the line for a colinear cue/object/pocket", () => {
    const table = makeTable();
    const cue = { x: 10, y: 10 };
    const object = { x: 40, y: 10 };
    const pocket = { x: 90, y: 10 };
    const ideal = computeIdealShot(cue, object, pocket, table);

    expect(angleDelta(ideal.aimAngleDeg, 0)).toBeCloseTo(0, 4);
    // ghost ball sits 2r behind the object, on the cue side
    expect(ideal.ghostBall.x).toBeCloseTo(object.x - 2 * table.ballRadius, 6);
    expect(ideal.ghostBall.y).toBeCloseTo(10, 6);
    expect(ideal.minSpeed).toBeGreaterThan(0);
    expect(ideal.idealSpeed).toBeGreaterThan(ideal.minSpeed);
  });

  it("offsets the ghost ball to the far side of the object for a cut shot", () => {
    const table = makeTable();
    const cue = { x: 25, y: 15 };
    const object = { x: 50, y: 25 };
    const pocket = { x: 90, y: 45 };
    const ideal = computeIdealShot(cue, object, pocket, table);

    // ghost is offset from the object directly away from the pocket
    const toPocket = { x: pocket.x - object.x, y: pocket.y - object.y };
    const ghostOffset = {
      x: ideal.ghostBall.x - object.x,
      y: ideal.ghostBall.y - object.y,
    };
    const dot = toPocket.x * ghostOffset.x + toPocket.y * ghostOffset.y;
    expect(dot).toBeLessThan(0); // ghost is on the opposite side from the pocket

    // offset magnitude is exactly 2r (one ball diameter)
    const mag = Math.hypot(ghostOffset.x, ghostOffset.y);
    expect(mag).toBeCloseTo(2 * table.ballRadius, 6);
  });
});

// ---------------------------------------------------------------------------
// INTEGRATION: the ideal shot actually sinks the object ball
// ---------------------------------------------------------------------------

describe("integration: ideal shot sinks the object ball", () => {
  it("straight shot drops the object into the targeted pocket", () => {
    const pocket: Pocket = { id: "corner", pos: { x: 90, y: 10 }, radius: 3 };
    const table = makeTable({ friction: 40, pockets: [pocket] });

    const cuePos = { x: 10, y: 10 };
    const objPos = { x: 40, y: 10 };
    const ideal = computeIdealShot(cuePos, objPos, pocket.pos, table);

    const cue = makeBall({ id: "cue", pos: { ...cuePos }, isCue: true });
    const obj = makeBall({ id: "obj", pos: { ...objPos } });

    const launched = applyShot([cue, obj], {
      angleDeg: ideal.aimAngleDeg,
      speed: ideal.idealSpeed,
    });
    const { balls, events } = runToSettle(launched, table);

    const sunk = byId(balls, "obj");
    expect(sunk.pocketed).toBe(true);
    const pocketEvent = events.find(
      (e) => e.type === "pocketed" && e.ball === "obj",
    );
    expect(pocketEvent && pocketEvent.type === "pocketed" && pocketEvent.pocket).toBe(
      "corner",
    );
  });

  it("moderate cut shot drops the object into the targeted pocket", () => {
    const pocket: Pocket = { id: "side", pos: { x: 90, y: 25 }, radius: 3 };
    const table = makeTable({ friction: 40, pockets: [pocket] });

    const cuePos = { x: 25, y: 15 };
    const objPos = { x: 50, y: 25 };
    const ideal = computeIdealShot(cuePos, objPos, pocket.pos, table);

    const cue = makeBall({ id: "cue", pos: { ...cuePos }, isCue: true });
    const obj = makeBall({ id: "obj", pos: { ...objPos } });

    const launched = applyShot([cue, obj], {
      angleDeg: ideal.aimAngleDeg,
      speed: ideal.idealSpeed,
    });
    const { balls } = runToSettle(launched, table);

    expect(byId(balls, "obj").pocketed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyShot
// ---------------------------------------------------------------------------

describe("applyShot", () => {
  it("only sets the cue ball's velocity", () => {
    const cue = makeBall({ id: "cue", pos: { x: 10, y: 10 }, isCue: true });
    const obj = makeBall({ id: "obj", pos: { x: 40, y: 10 } });
    const out = applyShot([cue, obj], { angleDeg: 90, speed: 50 });
    expect(byId(out, "cue").vel.x).toBeCloseTo(0, 6);
    expect(byId(out, "cue").vel.y).toBeCloseTo(50, 6);
    expect(byId(out, "obj").vel).toEqual({ x: 0, y: 0 });
  });

  it("does not launch a pocketed cue ball", () => {
    const cue = makeBall({ id: "cue", pos: { x: 10, y: 10 }, isCue: true, pocketed: true });
    const out = applyShot([cue], { angleDeg: 0, speed: 50 });
    expect(byId(out, "cue").vel).toEqual({ x: 0, y: 0 });
  });
});

// ---------------------------------------------------------------------------
// angleDelta + gradeShot
// ---------------------------------------------------------------------------

describe("angleDelta", () => {
  it("normalizes differences into [-180, 180]", () => {
    expect(angleDelta(10, 350)).toBeCloseTo(20, 6);
    expect(angleDelta(350, 10)).toBeCloseTo(-20, 6);
    expect(angleDelta(0, 180)).toBeCloseTo(-180, 6);
    expect(angleDelta(90, 90)).toBeCloseTo(0, 6);
  });
});

describe("gradeShot", () => {
  const ideal = {
    aimAngleDeg: 30,
    ghostBall: { x: 0, y: 0 },
    minSpeed: 100,
    idealSpeed: 135,
  };

  it("accepts a shot within angle and speed tolerance", () => {
    const grade = gradeShot({ angleDeg: 31, speed: 120 }, ideal);
    expect(grade.angleOk).toBe(true);
    expect(grade.speedOk).toBe(true);
    expect(grade.angleErrorDeg).toBeCloseTo(1, 6);
  });

  it("flags an angle outside tolerance", () => {
    const grade = gradeShot({ angleDeg: 40, speed: 120 }, ideal);
    expect(grade.angleOk).toBe(false);
    expect(grade.angleErrorDeg).toBeCloseTo(10, 6);
  });

  it("flags a speed that is too low", () => {
    const grade = gradeShot(
      { angleDeg: 30, speed: ideal.minSpeed * (DEFAULT_TOLERANCE.speedLow - 0.1) },
      ideal,
    );
    expect(grade.speedOk).toBe(false);
  });

  it("flags a speed that is too high", () => {
    const grade = gradeShot(
      { angleDeg: 30, speed: ideal.minSpeed * (DEFAULT_TOLERANCE.speedHigh + 0.5) },
      ideal,
    );
    expect(grade.speedOk).toBe(false);
  });

  it("uses angleDelta so wrap-around angles still grade correctly", () => {
    const wrapIdeal = { ...ideal, aimAngleDeg: 359 };
    const grade = gradeShot({ angleDeg: 1, speed: 120 }, wrapIdeal);
    expect(grade.angleErrorDeg).toBeCloseTo(2, 6);
    expect(grade.angleOk).toBe(true);
  });
});
