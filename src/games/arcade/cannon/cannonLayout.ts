import type { Vec2 } from "../types";

// ---------------------------------------------------------------------------
// Geometry for the CANNON ARTILLERY DUEL. A wide landscape battlefield: the
// player's cannon sits on the left ridge, the AI's on the right, and a
// procedurally generated terrain rolls between them. This module is the single
// source of truth for WHERE things are — both the physics sim (cannonPhysics)
// and the renderer (cannonRender) read it so they always agree on cannon
// positions, ball size, gravity and the launch-speed range.
//
// Everything geometric is expressed as a fraction of the canvas so the game is
// resolution independent (the component recomputes the Layout on every resize).
// Terrain is stored as height FRACTIONS too, so a mid-round resize never warps
// the landscape — `terrainYAt` converts to pixels against the live Layout.
// ---------------------------------------------------------------------------

/** Landscape battlefield aspect (width : height). 4:3 gives room for a duel. */
export const ASPECT_W = 4;
export const ASPECT_H = 3;

/** How many terrain segments span the field (sample count = SEGMENTS + 1). */
export const SEGMENTS = 120;

export interface Layout {
  w: number;
  h: number;

  /** Cannon pivot x positions (px). */
  playerX: number;
  aiX: number;

  /** Radius (px) of a cannon's body — used for hit detection + drawing scale. */
  cannonR: number;
  /** Barrel length (px) from the pivot to the muzzle tip. */
  muzzleLen: number;
  /** Hit radius (px): a ball whose center comes within this of a cannon scores. */
  hitR: number;

  ballR: number;

  /** Gravity (px/s²); scales with canvas height for resolution independence. */
  gravity: number;
  /** Launch-speed range (px/s) mapped from the 0..1 power the drag produces. */
  speedMin: number;
  speedMax: number;

  /** Max on-screen length (px) of the SHORT dotted aim preview at full power. */
  maxPreview: number;
}

export function computeLayout(w: number, h: number): Layout {
  return {
    w,
    h,
    playerX: w * 0.11,
    aiX: w * 0.89,
    cannonR: Math.max(14, w * 0.032),
    muzzleLen: Math.max(26, w * 0.07),
    hitR: Math.max(20, w * 0.05),
    ballR: Math.max(5, w * 0.014),
    gravity: h * 2.0,
    speedMin: h * 0.55,
    speedMax: h * 1.78,
    maxPreview: w * 0.26,
  };
}

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------

export type TerrainStyle =
  | "rollingHills"
  | "centralMountain"
  | "plateaus"
  | "valley"
  | "ridges";

export const TERRAIN_STYLES: TerrainStyle[] = [
  "rollingHills",
  "centralMountain",
  "plateaus",
  "valley",
  "ridges",
];

export interface Terrain {
  /** Height fractions (0 = top of canvas, 1 = bottom) at SEGMENTS+1 columns. */
  heights: number[];
  style: TerrainStyle;
}

/** Lowest the ground can sit (small fraction = high terrain near the sky). */
const GROUND_MIN = 0.42;
/** Deepest the ground can sit (near the bottom of the canvas). */
const GROUND_MAX = 0.9;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function smoothPad(heights: number[], centerIdx: number, halfSpan: number): void {
  const target = heights[centerIdx];
  for (let i = centerIdx - halfSpan; i <= centerIdx + halfSpan; i++) {
    if (i < 0 || i >= heights.length) continue;
    const t = 1 - Math.abs(i - centerIdx) / (halfSpan + 1);
    // Ease the pad into the surrounding land so it doesn't look stamped on.
    heights[i] = heights[i] + (target - heights[i]) * (0.55 + 0.45 * t);
  }
}

/**
 * Builds a fresh battlefield. Deterministic given `rng`, so tests can pin a
 * seed. A random style is picked unless one is forced; flat pads are pressed
 * under both cannons so each barrel fires from level, unobstructed ground.
 */
export function generateTerrain(
  lay: Layout,
  rng: () => number = Math.random,
  forced?: TerrainStyle,
): Terrain {
  const style = forced ?? TERRAIN_STYLES[Math.floor(rng() * TERRAIN_STYLES.length)];
  const n = SEGMENTS;
  const heights = new Array<number>(n + 1);

  // A couple of random sine layers give every style a little organic jitter.
  const base = 0.62 + (rng() - 0.5) * 0.06;
  const a1 = 0.05 + rng() * 0.05;
  const a2 = 0.02 + rng() * 0.04;
  const f1 = 1.5 + rng() * 2.5;
  const f2 = 4 + rng() * 4;
  const p1 = rng() * Math.PI * 2;
  const p2 = rng() * Math.PI * 2;

  for (let i = 0; i <= n; i++) {
    const u = i / n; // 0..1 across the field
    let yf = base;
    yf += Math.sin(u * Math.PI * 2 * f1 + p1) * a1;
    yf += Math.sin(u * Math.PI * 2 * f2 + p2) * a2;

    switch (style) {
      case "centralMountain": {
        // A tall peak in the middle that shots must clear or thread.
        const d = (u - 0.5) / 0.16;
        yf -= Math.exp(-d * d) * 0.27;
        break;
      }
      case "valley": {
        // High shoulders, a sunken centre — a classic artillery basin.
        yf -= (1 - Math.cos(u * Math.PI * 2)) * 0.5 * 0.18;
        yf += Math.cos(u * Math.PI * 2) * 0.1;
        break;
      }
      case "plateaus": {
        // Stepped mesas; quantise then let the sine layers soften the edges.
        const step = Math.round(u * 5) / 5;
        yf = base - 0.16 + (step - 0.5) * 0.18;
        yf += Math.sin(u * Math.PI * 2 * f2 + p2) * 0.015;
        break;
      }
      case "ridges": {
        // A row of sharp peaks and troughs.
        yf -= Math.abs(Math.sin(u * Math.PI * 4 + p1)) * 0.16;
        break;
      }
      case "rollingHills":
      default: {
        // Gentle dunes — the extra sine layers above already do the work.
        yf -= Math.sin(u * Math.PI * 3 + p2) * 0.04;
        break;
      }
    }

    heights[i] = clamp(yf, GROUND_MIN, GROUND_MAX);
  }

  // Press flat firing pads under both cannons so the barrels are never buried.
  const playerIdx = Math.round((lay.playerX / lay.w) * n);
  const aiIdx = Math.round((lay.aiX / lay.w) * n);
  const halfSpan = Math.max(3, Math.round(n * 0.04));
  // Keep pads in the lower half so cannons read as "down on the field".
  heights[playerIdx] = clamp(heights[playerIdx], 0.6, GROUND_MAX);
  heights[aiIdx] = clamp(heights[aiIdx], 0.6, GROUND_MAX);
  smoothPad(heights, playerIdx, halfSpan);
  smoothPad(heights, aiIdx, halfSpan);

  return { heights, style };
}

/** Ground screen-y (px) at an arbitrary x, linearly interpolated. */
export function terrainYAt(lay: Layout, terrain: Terrain, x: number): number {
  const n = terrain.heights.length - 1;
  const u = clamp(x / lay.w, 0, 1);
  const f = u * n;
  const i = Math.min(n - 1, Math.floor(f));
  const t = f - i;
  const hf = terrain.heights[i] + (terrain.heights[i + 1] - terrain.heights[i]) * t;
  return hf * lay.h;
}

/** Where a cannon's pivot sits: on the ground at its column, body centered. */
export function cannonPivot(lay: Layout, terrain: Terrain, x: number): Vec2 {
  return { x, y: terrainYAt(lay, terrain, x) - lay.cannonR * 0.65 };
}

/** Center of a cannon's body for hit detection (a touch above the pivot). */
export function cannonBodyCenter(lay: Layout, terrain: Terrain, x: number): Vec2 {
  const p = cannonPivot(lay, terrain, x);
  return { x: p.x, y: p.y - lay.cannonR * 0.1 };
}
