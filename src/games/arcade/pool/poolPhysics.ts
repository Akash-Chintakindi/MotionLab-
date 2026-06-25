import type { Vec2 } from "../types";

// ---------------------------------------------------------------------------
// CONTRACT (the PoolGame component depends on these exports). The pool-physics
// agent OWNS this file and will harden the simulation + add a unit-test suite,
// but must keep these signatures stable. Coordinates are in TABLE UNITS with
// the origin at the bottom-left pocket; +x right, +y up (a math coordinate
// plane, matching what the learner sees).
// ---------------------------------------------------------------------------

export interface Ball {
  id: string;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  color: string;
  pocketed: boolean;
  isCue?: boolean;
  number?: number;
}

export interface Pocket {
  id: string;
  pos: Vec2;
  radius: number;
}

export interface PoolTable {
  width: number;
  height: number;
  pockets: Pocket[];
  ballRadius: number;
  /** Rolling friction deceleration, in units/s². */
  friction: number;
  /** Cushion energy retention on bounce (0..1). */
  cushionRestitution: number;
}

export interface ShotInput {
  /** Direction of the cue ball's initial velocity, degrees from +x axis. */
  angleDeg: number;
  /** Initial speed in units/s. */
  speed: number;
}

export type PoolEvent =
  | { type: "ballCollision"; a: string; b: string; impact: number }
  | { type: "cushion"; ball: string }
  | { type: "pocketed"; ball: string; pocket: string };

export interface StepResult {
  balls: Ball[];
  events: PoolEvent[];
  /** True once every ball has effectively stopped moving. */
  settled: boolean;
}

const EPS = 1e-6;
const STOP_SPEED = 0.05;
/** Hard cap on sub-steps per call so a runaway speed can't hang the loop. */
const MAX_SUBSTEPS = 4096;
/**
 * A sub-step may advance the fastest ball at most this fraction of the smallest
 * ball radius. Keeping per-slice travel well under a radius guarantees that
 * approaching balls always overlap (and so collide) before passing through one
 * another, eliminating tunneling through balls, cushions, and pockets.
 */
const MAX_STEP_FRACTION = 0.25;

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}
function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}
function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}
function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}
function len(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}
function norm(a: Vec2): Vec2 {
  const l = len(a);
  return l < EPS ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/** Apply a shot to the cue ball, returning a new ball array. */
export function applyShot(balls: Ball[], shot: ShotInput): Ball[] {
  const rad = (shot.angleDeg * Math.PI) / 180;
  return balls.map((b) =>
    b.isCue && !b.pocketed
      ? {
          ...b,
          vel: { x: Math.cos(rad) * shot.speed, y: Math.sin(rad) * shot.speed },
        }
      : b,
  );
}

/**
 * Advances the simulation by `dt` seconds. Deterministic.
 *
 * The model:
 *  - Friction is a constant deceleration (`table.friction`, units/s²) that
 *    opposes each ball's velocity.
 *  - Ball–ball collisions are equal-mass and elastic: the velocity components
 *    along the line of centers are exchanged, and overlap is split evenly so
 *    the balls are pushed apart (positional de-overlap).
 *  - Cushions reflect the perpendicular velocity component, scaled by
 *    `cushionRestitution`.
 *  - A ball is pocketed when its center comes within a pocket's radius.
 *
 * To stop fast shots from tunneling through balls/cushions/pockets, `dt` is
 * split into N equal sub-steps sized so the fastest ball never travels more
 * than a fraction of a ball radius per slice.
 */
export function stepSimulation(
  balls: Ball[],
  table: PoolTable,
  dt: number,
): StepResult {
  const events: PoolEvent[] = [];
  const next = balls.map((b) => ({ ...b, pos: { ...b.pos }, vel: { ...b.vel } }));

  if (dt > EPS) {
    // Choose sub-step count from the fastest ball so no slice over-travels.
    let maxSpeed = 0;
    let minRadius = table.ballRadius > EPS ? table.ballRadius : Infinity;
    for (const b of next) {
      if (b.pocketed) continue;
      maxSpeed = Math.max(maxSpeed, len(b.vel));
      if (b.radius > EPS) minRadius = Math.min(minRadius, b.radius);
    }
    if (!Number.isFinite(minRadius)) minRadius = 1;

    const maxStepDist = Math.max(EPS, minRadius * MAX_STEP_FRACTION);
    let substeps = 1;
    const travel = maxSpeed * dt;
    if (travel > maxStepDist) {
      substeps = Math.min(MAX_SUBSTEPS, Math.ceil(travel / maxStepDist));
    }
    const h = dt / substeps;

    for (let s = 0; s < substeps; s++) {
      const moved = integrate(next, table, h, events);
      if (!moved) break; // everything has stopped; remaining slices are no-ops
    }
  }

  // Robust settle detection: settled once every ball is pocketed or below the
  // stop speed. When settled, zero out the tiny residual velocities.
  const settled = next.every((b) => b.pocketed || len(b.vel) < STOP_SPEED);
  if (settled) for (const b of next) if (!b.pocketed) b.vel = { x: 0, y: 0 };

  return { balls: next, events, settled };
}

/**
 * Advances all balls by a single sub-step of `h` seconds, mutating `next` in
 * place and appending any events. Returns true if any ball was in motion.
 */
function integrate(
  next: Ball[],
  table: PoolTable,
  h: number,
  events: PoolEvent[],
): boolean {
  let anyMotion = false;

  for (const b of next) {
    if (b.pocketed) continue;

    // friction: constant deceleration opposing velocity
    const speed = len(b.vel);
    if (speed > EPS) {
      anyMotion = true;
      const newSpeed = Math.max(0, speed - table.friction * h);
      b.vel = scale(norm(b.vel), newSpeed);
    } else {
      b.vel = { x: 0, y: 0 };
      continue;
    }

    // integrate position
    b.pos = add(b.pos, scale(b.vel, h));

    // cushions: reflect the perpendicular component with restitution
    const r = b.radius;
    if (b.pos.x < r) {
      b.pos.x = r;
      b.vel.x = -b.vel.x * table.cushionRestitution;
      events.push({ type: "cushion", ball: b.id });
    } else if (b.pos.x > table.width - r) {
      b.pos.x = table.width - r;
      b.vel.x = -b.vel.x * table.cushionRestitution;
      events.push({ type: "cushion", ball: b.id });
    }
    if (b.pos.y < r) {
      b.pos.y = r;
      b.vel.y = -b.vel.y * table.cushionRestitution;
      events.push({ type: "cushion", ball: b.id });
    } else if (b.pos.y > table.height - r) {
      b.pos.y = table.height - r;
      b.vel.y = -b.vel.y * table.cushionRestitution;
      events.push({ type: "cushion", ball: b.id });
    }
  }

  // ball-ball collisions (equal mass, elastic)
  for (let i = 0; i < next.length; i++) {
    const a = next[i];
    if (a.pocketed) continue;
    for (let j = i + 1; j < next.length; j++) {
      const b = next[j];
      if (b.pocketed) continue;
      const delta = sub(b.pos, a.pos);
      const dist = len(delta);
      const minDist = a.radius + b.radius;
      if (dist > EPS && dist < minDist) {
        const n = scale(delta, 1 / dist);
        // positional de-overlap, split evenly
        const overlap = minDist - dist;
        a.pos = add(a.pos, scale(n, -overlap / 2));
        b.pos = add(b.pos, scale(n, overlap / 2));
        // exchange velocity components along the line of centers
        const va = dot(a.vel, n);
        const vb = dot(b.vel, n);
        const diff = vb - va;
        // Only resolve if they are actually approaching, so an already
        // overlapping pair isn't given spurious extra velocity.
        if (diff < 0) {
          a.vel = add(a.vel, scale(n, diff));
          b.vel = add(b.vel, scale(n, -diff));
          anyMotion = true;
          events.push({
            type: "ballCollision",
            a: a.id,
            b: b.id,
            impact: Math.abs(diff),
          });
        }
      }
    }
  }

  // pockets: capture when a ball center is within the pocket radius
  for (const b of next) {
    if (b.pocketed) continue;
    for (const p of table.pockets) {
      if (len(sub(b.pos, p.pos)) < p.radius) {
        b.pocketed = true;
        b.vel = { x: 0, y: 0 };
        events.push({ type: "pocketed", ball: b.id, pocket: p.id });
        break;
      }
    }
  }

  return anyMotion;
}

// ---- Shot solving / grading ----------------------------------------------

export interface IdealShot {
  /** Required cue aim direction (degrees from +x) to sink the object ball. */
  aimAngleDeg: number;
  /** "Ghost ball" cue-center position at contact. */
  ghostBall: Vec2;
  /** Minimum speed for the object ball to just reach the pocket. */
  minSpeed: number;
  /** A comfortable speed that sinks it without flying off. */
  idealSpeed: number;
}

/**
 * Computes the ideal cut shot: the cue must strike the object ball along the
 * line from the pocket through the object ball (ghost-ball method).
 */
export function computeIdealShot(
  cue: Vec2,
  object: Vec2,
  pocket: Vec2,
  table: PoolTable,
): IdealShot {
  const objToPocket = sub(pocket, object);
  const dirObjToPocket = norm(objToPocket);
  // ghost ball sits 2r behind the object ball (away from the pocket)
  const ghostBall = sub(object, scale(dirObjToPocket, table.ballRadius * 2));
  const aim = sub(ghostBall, cue);
  const aimAngleDeg = (Math.atan2(aim.y, aim.x) * 180) / Math.PI;

  // distances the object ball must travel to the pocket
  const dObjPocket = len(objToPocket);
  // minimum object-ball launch speed to coast distance d under friction:
  // v = sqrt(2 a d)
  const vObjNeeded = Math.sqrt(2 * table.friction * dObjPocket);
  // cue must also reach the ghost ball, then transfer ~its speed (head-on).
  const dCueGhost = len(aim);
  // cue speed needed so it arrives with vObjNeeded after friction over dCueGhost
  const minSpeed = Math.sqrt(vObjNeeded * vObjNeeded + 2 * table.friction * dCueGhost);
  const idealSpeed = minSpeed * 1.35;
  return { aimAngleDeg, ghostBall, minSpeed, idealSpeed };
}

export interface ShotTolerance {
  /** Acceptable absolute angle error in degrees. */
  angleDeg: number;
  /** Lower speed multiplier of minSpeed (e.g. 0.95). */
  speedLow: number;
  /** Upper speed multiplier of minSpeed (e.g. 2.5). */
  speedHigh: number;
}

export const DEFAULT_TOLERANCE: ShotTolerance = {
  angleDeg: 2.5,
  speedLow: 0.95,
  speedHigh: 2.6,
};

export interface ShotGrade {
  angleErrorDeg: number;
  angleOk: boolean;
  speedOk: boolean;
}

/** Normalizes an angle difference into [-180, 180]. */
export function angleDelta(a: number, b: number): number {
  let d = ((a - b + 180) % 360) - 180;
  if (d < -180) d += 360;
  return d;
}

export function gradeShot(
  input: ShotInput,
  ideal: IdealShot,
  tol: ShotTolerance = DEFAULT_TOLERANCE,
): ShotGrade {
  const angleErrorDeg = Math.abs(angleDelta(input.angleDeg, ideal.aimAngleDeg));
  return {
    angleErrorDeg,
    angleOk: angleErrorDeg <= tol.angleDeg,
    speedOk:
      input.speed >= ideal.minSpeed * tol.speedLow &&
      input.speed <= ideal.minSpeed * tol.speedHigh,
  };
}
