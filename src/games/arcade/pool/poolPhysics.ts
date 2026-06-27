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
  /** True for a 9–15 striped ball (purely cosmetic — drives the render band). */
  stripe?: boolean;
  /** Cosmetic accumulated roll angle (radians); drives the rolling animation. */
  roll?: number;
  /** Cosmetic unit direction of the ball's last travel, to orient the roll. */
  rollDir?: Vec2;
  /**
   * Transient english tagged onto the cue ball by a spin shot, consumed on the
   * cue's FIRST object-ball collision (see `integrate`). `x` = side english,
   * `y` = follow(+)/draw(−), each in [-1,1]. Absent ⇒ no spin (the default
   * behaviour is byte-for-byte unchanged).
   */
  pendingSpin?: Vec2;
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
  /**
   * Optional english (cue-tip contact offset), each component in [-1,1]:
   * `x` = side english (right +), `y` = follow(+)/draw(−). Omitted or {0,0}
   * means a plain centre-ball hit — physics stays exactly as before.
   */
  spin?: Vec2;
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

/**
 * How strongly english reshapes the cue's post-contact velocity, as a fraction
 * of its incoming speed. Follow/draw push the cue forward/back along its travel
 * line; side english deflects it sideways. Tuned to read as real (a follow shot
 * trails the object at ~half pace) without teleporting the cue.
 */
const FOLLOW_SCALE = 0.5;
const SIDE_SCALE = 0.32;

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
  // Only a non-zero spin tags the cue; otherwise we strip any stale tag so the
  // result is identical to a plain centre-ball hit (no behavioural drift).
  const hasSpin = !!shot.spin && (shot.spin.x !== 0 || shot.spin.y !== 0);
  return balls.map((b) => {
    if (!b.isCue || b.pocketed) return b;
    const { pendingSpin: _drop, ...rest } = b;
    const next: Ball = {
      ...rest,
      vel: { x: Math.cos(rad) * shot.speed, y: Math.sin(rad) * shot.speed },
    };
    if (hasSpin && shot.spin) next.pendingSpin = { x: shot.spin.x, y: shot.spin.y };
    return next;
  });
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
          // A spin-tagged cue ball: capture its incoming velocity *before* the
          // exchange so the english can be applied along its true travel line.
          const spinner = a.isCue && a.pendingSpin ? a : b.isCue && b.pendingSpin ? b : null;
          const cueVelBefore = spinner ? { ...spinner.vel } : null;

          a.vel = add(a.vel, scale(n, diff));
          b.vel = add(b.vel, scale(n, -diff));
          anyMotion = true;
          events.push({
            type: "ballCollision",
            a: a.id,
            b: b.id,
            impact: Math.abs(diff),
          });

          // Consume the english on this first object-ball contact only.
          if (spinner && cueVelBefore) applySpin(spinner, cueVelBefore);
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

/**
 * Consumes a cue ball's pending english on its first object-ball contact,
 * nudging its post-collision velocity. `velBefore` is the cue's velocity at the
 * instant of impact; the effect scales with that speed so a soft tap barely
 * curves while a firm follow really trails the object — momentum made visible.
 *  - follow (`spin.y > 0`): push the cue FORWARD along its travel line.
 *  - draw   (`spin.y < 0`): pull the cue BACK (reverse component).
 *  - side   (`spin.x`):     deflect the cue sideways (right of travel is +).
 * The tag is cleared so it can never re-fire on a later collision.
 */
function applySpin(cue: Ball, velBefore: Vec2): void {
  const spin = cue.pendingSpin;
  cue.pendingSpin = undefined;
  if (!spin) return;
  const sp = len(velBefore);
  if (sp < EPS) return;
  const fwd = scale(velBefore, 1 / sp);
  // Right-hand normal: travelling +x, "right" points toward −y (math plane).
  const right: Vec2 = { x: fwd.y, y: -fwd.x };
  cue.vel = add(cue.vel, scale(fwd, spin.y * sp * FOLLOW_SCALE));
  cue.vel = add(cue.vel, scale(right, spin.x * sp * SIDE_SCALE));
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

// ---- Aim prediction (live guide) -----------------------------------------

export interface AimPrediction {
  /** What the aim ray meets first. */
  kind: "ball" | "cushion" | "none";
  /** Cue-ball *center* position at first contact (ghost ball / rail touch). */
  contact: Vec2;
  /** Distance the cue ball travels along the aim ray to that contact. */
  distance: number;
  /** Struck object ball id (only for kind === "ball"). */
  ballId?: string;
  /** Unit direction the struck object ball will travel (the line of centers). */
  objectDir?: Vec2;
  /**
   * Unit direction the cue ball continues after the contact. For a ball hit it
   * is the equal-mass elastic carom (the 90° tangent component); for a cushion
   * it is the reflected ray. May be a zero vector for a dead-straight ball hit.
   */
  cueDir?: Vec2;
}

/**
 * Casts a ray from the cue ball along `angleDeg` and predicts the first thing
 * it meets — an object ball or a cushion — so the aim guide can show contact
 * and rebound. Pure and side-effect free (used purely for the on-table guide).
 *
 *  - Object ball: returns the ghost-ball contact point (cue center where the
 *    centre separation equals the summed radii), the object-ball travel
 *    direction (along the line of centers) and the cue-ball carom direction
 *    (equal-mass elastic ≈ 90° to the object direction — the tangent rule).
 *  - Cushion: returns the rail touch point and the reflected direction.
 */
export function predictAim(
  balls: Ball[],
  table: PoolTable,
  cueId: string,
  angleDeg: number,
): AimPrediction {
  const cue = balls.find((b) => b.id === cueId && !b.pocketed);
  const rad = (angleDeg * Math.PI) / 180;
  const d: Vec2 = { x: Math.cos(rad), y: Math.sin(rad) };
  if (!cue) return { kind: "none", contact: { x: 0, y: 0 }, distance: 0 };
  const c = cue.pos;

  // Nearest object ball: ray–circle intersection at separation (rc + rb).
  let ballT = Infinity;
  let struck: Ball | null = null;
  for (const b of balls) {
    if (b.id === cueId || b.isCue || b.pocketed) continue;
    const big = cue.radius + b.radius;
    const fx = c.x - b.pos.x;
    const fy = c.y - b.pos.y;
    const proj = d.x * fx + d.y * fy; // d · (C − O)
    const cc = fx * fx + fy * fy - big * big;
    const disc = proj * proj - cc;
    if (disc < 0) continue; // ray misses this ball
    const t = -proj - Math.sqrt(disc); // nearest forward root
    if (t > EPS && t < ballT) {
      ballT = t;
      struck = b;
    }
  }

  // Nearest cushion: the cue *center* is bounded by its radius on every rail.
  const r = cue.radius;
  let railT = Infinity;
  let railAxis: "x" | "y" | null = null;
  if (d.x > EPS) {
    const t = (table.width - r - c.x) / d.x;
    if (t > EPS && t < railT) ((railT = t), (railAxis = "x"));
  } else if (d.x < -EPS) {
    const t = (r - c.x) / d.x;
    if (t > EPS && t < railT) ((railT = t), (railAxis = "x"));
  }
  if (d.y > EPS) {
    const t = (table.height - r - c.y) / d.y;
    if (t > EPS && t < railT) ((railT = t), (railAxis = "y"));
  } else if (d.y < -EPS) {
    const t = (r - c.y) / d.y;
    if (t > EPS && t < railT) ((railT = t), (railAxis = "y"));
  }

  if (struck && ballT <= railT) {
    const contact: Vec2 = { x: c.x + d.x * ballT, y: c.y + d.y * ballT };
    const objectDir = norm(sub(struck.pos, contact)); // contact → object centre
    const along = d.x * objectDir.x + d.y * objectDir.y;
    // Equal-mass elastic: the object takes the line-of-centers component, the
    // cue keeps the tangential remainder (≈ perpendicular — the 90° rule).
    const cueDir = norm({
      x: d.x - objectDir.x * along,
      y: d.y - objectDir.y * along,
    });
    return {
      kind: "ball",
      contact,
      distance: ballT,
      ballId: struck.id,
      objectDir,
      cueDir,
    };
  }

  if (railAxis) {
    const contact: Vec2 = { x: c.x + d.x * railT, y: c.y + d.y * railT };
    const cueDir =
      railAxis === "x" ? { x: -d.x, y: d.y } : { x: d.x, y: -d.y };
    return { kind: "cushion", contact, distance: railT, cueDir };
  }

  // Degenerate (zero direction): just project a short stub forward.
  return {
    kind: "none",
    contact: { x: c.x + d.x * 20, y: c.y + d.y * 20 },
    distance: 20,
  };
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

// ---- Headless settle ------------------------------------------------------

export interface SettleResult {
  balls: Ball[];
  /** Every ball that dropped this run, in the order it was pocketed. */
  pocketed: { ball: string; pocket: string }[];
  events: PoolEvent[];
}

/**
 * Steps the simulation to rest in one call (no animation). Used by the full
 * game's reduced-motion path and by tests. Deterministic for a given input.
 */
export function simulateToSettle(
  balls: Ball[],
  table: PoolTable,
  dt = 1 / 120,
  maxSteps = 8000,
): SettleResult {
  let current = balls;
  const events: PoolEvent[] = [];
  const pocketed: { ball: string; pocket: string }[] = [];
  for (let i = 0; i < maxSteps; i++) {
    const res = stepSimulation(current, table, dt);
    current = res.balls;
    for (const ev of res.events) {
      events.push(ev);
      if (ev.type === "pocketed") pocketed.push({ ball: ev.ball, pocket: ev.pocket });
    }
    if (res.settled) break;
  }
  return { balls: current, pocketed, events };
}
