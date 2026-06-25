import type { Vec2 } from "../types";

// ---------------------------------------------------------------------------
// Geometry for the FRONT-FACING basketball view (you look straight at the
// hoop mounted on the wall; the timer sits above it; the ball is launched from
// a shooting line near the bottom). This is the single source of truth for
// where things are — BOTH the physics engine (basketballPhysics.ts) and the
// renderer (basketballRender.ts) consume this layout so they always agree on
// the rim position/size. Keep this contract stable.
// ---------------------------------------------------------------------------

/** Portrait court aspect (width : height). */
export const ASPECT_W = 4;
export const ASPECT_H = 5;

export interface Layout {
  w: number;
  h: number;

  /** Y of the shooting line the ball spawns on (near the bottom). */
  spawnY: number;
  /** Random spawn is uniform in [spawnXMin, spawnXMax] along the line. */
  spawnXMin: number;
  spawnXMax: number;

  /** Center of the rim opening (seen slightly from above), facing the player. */
  hoop: Vec2;
  /** Rim opening ellipse radii (rimRx horizontal, rimRy vertical foreshorten). */
  rimRx: number;
  rimRy: number;
  /** The "make" half-width at rim height: ball center within ⇒ clean swish. */
  rimInner: number;

  /** Backboard rectangle behind/above the rim. */
  board: { x: number; y: number; w: number; h: number };
  /** How far the net hangs below the rim. */
  netDrop: number;

  ballR: number;

  /** Gravity (px/s²); scales with canvas height for resolution independence. */
  gravity: number;
  /** Launch-speed range (px/s) mapped from the 0..1 power meter. */
  speedMin: number;
  speedMax: number;

  /** On-screen power-meter rectangle (renderer draws here). */
  power: { x: number; y: number; w: number; h: number };
}

export function computeLayout(w: number, h: number): Layout {
  const hoop: Vec2 = { x: w * 0.5, y: h * 0.33 };
  const rimRx = w * 0.115;
  const rimRy = w * 0.04;
  const ballR = Math.max(11, w * 0.052);

  const bw = w * 0.36;
  const bh = h * 0.17;
  const board = {
    x: hoop.x - bw * 0.5,
    y: hoop.y - rimRy * 0.5 - bh,
    w: bw,
    h: bh,
  };

  return {
    w,
    h,
    spawnY: h * 0.8,
    spawnXMin: w * 0.14,
    spawnXMax: w * 0.86,
    hoop,
    rimRx,
    rimRy,
    // A swish needs the descending ball's center inside the rim minus its own
    // radius (so it actually drops through, not just clip the ring).
    rimInner: Math.max(2, rimRx - ballR * 0.55),
    board,
    netDrop: h * 0.1,
    ballR,
    gravity: h * 4.5,
    speedMin: h * 1.0,
    speedMax: h * 3.4,
    power: { x: w * 0.88, y: h * 0.3, w: w * 0.06, h: h * 0.4 },
  };
}

/** Uniformly-random ball spawn x along the shooting line. */
export function randomSpawnX(lay: Layout, rng: () => number = Math.random): number {
  return lay.spawnXMin + rng() * (lay.spawnXMax - lay.spawnXMin);
}
