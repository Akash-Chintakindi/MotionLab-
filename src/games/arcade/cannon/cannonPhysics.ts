import type { Vec2 } from "../types";
import type { Layout, Terrain, TerrainStyle } from "./cannonLayout";
import {
  cannonBodyCenter,
  cannonPivot,
  generateTerrain,
  terrainYAt,
} from "./cannonLayout";
import type { BankDifficulty } from "../../../content/practiceBank/types";

// ---------------------------------------------------------------------------
// Pure physics + game math for the cannon duel. NO React, NO canvas.
//
// Angles are RADIANS measured from the +x axis in a y-UP sense (π/2 = straight
// up). Screen space has y growing DOWNWARD, so an upward launch has NEGATIVE
// screen vy. The player cannon fires up-and-right (dir ∈ ~[0.05, 1.45]); the AI
// cannon fires up-and-left (dir ∈ ~[1.69, 3.09]).
//
// A shot is a genuine projectile integrated at a fixed timestep. It explodes
// when it strikes the terrain, scores when it reaches the opponent, or sails
// off-screen as a miss. The "perfect" AI shot comes from an analytic solve
// (idealSpeed), then noise scaled by difficulty is layered on top.
// ---------------------------------------------------------------------------

const SIM_DT = 1 / 120;
const SIM_MAX_STEPS = 1600;

// --- launch + analytic solve -----------------------------------------------

/** Launch velocity (screen coords) for a direction + speed. */
export function launchVelocity(dir: number, speed: number): Vec2 {
  return { x: speed * Math.cos(dir), y: -speed * Math.sin(dir) };
}

export function powerToSpeed(power: number, lay: Layout): number {
  return lay.speedMin + clamp01(power) * (lay.speedMax - lay.speedMin);
}

export function speedToPower(speed: number, lay: Layout): number {
  return clamp01((speed - lay.speedMin) / (lay.speedMax - lay.speedMin));
}

/**
 * The launch speed (px/s) that makes a projectile from `from` pass exactly
 * through `to` for the given launch direction, or null if no positive speed can
 * (the direction is too shallow or points the wrong way). Derived from the
 * projectile equations (screen y-down):
 *   speed² = ½·g·A² / (Δy_screen + sin(dir)·A),  where A = Δx / cos(dir).
 */
export function idealSpeed(
  from: Vec2,
  to: Vec2,
  dir: number,
  gravity: number,
): number | null {
  const dx = to.x - from.x;
  const dyScreen = to.y - from.y;
  const cos = Math.cos(dir);

  if (Math.abs(cos) < 1e-3 || Math.abs(dx) < 1e-3) {
    // Near-vertical lob onto a roughly-overhead target.
    const sin = Math.sin(dir);
    if (sin < 1e-3) return null;
    const rise = Math.max(1, from.y - to.y) * 1.1 + 1;
    return Math.sqrt(2 * gravity * rise) / sin;
  }

  const A = dx / cos;
  if (A <= 0) return null; // direction points away from the target
  const denom = dyScreen + Math.sin(dir) * A;
  if (denom <= 0) return null; // too shallow — would need infinite speed
  const sq = (0.5 * gravity * A * A) / denom;
  if (!isFinite(sq) || sq <= 0) return null;
  return Math.sqrt(sq);
}

// --- shot simulation --------------------------------------------------------

export type ShotOutcome = "hitTarget" | "hitTerrain" | "offscreen";

export interface ShotSim {
  /** Animation polyline from the muzzle to the impact point. */
  points: Vec2[];
  outcome: ShotOutcome;
  /** Where the ball finally resolved (impact / exit). */
  impact: Vec2;
  /** Closest the ball ever came to the target center (px). */
  closest: number;
  /** Apex of the arc (highest point), handy for camera/preview. */
  apex: Vec2;
}

/**
 * Integrates a projectile from `from` at `dir`/`speed` and resolves it against
 * the terrain and the opponent. The returned polyline is ready to animate.
 */
export function simulateShot(
  lay: Layout,
  terrain: Terrain,
  from: Vec2,
  dir: number,
  speed: number,
  target: Vec2,
  targetR: number,
): ShotSim {
  const g = lay.gravity;
  const v = launchVelocity(dir, speed);
  let vx = v.x;
  let vy = v.y;
  let x = from.x;
  let y = from.y;

  const pts: Vec2[] = [{ x, y }];
  let apexX = x;
  let apexY = y;
  let closest = Infinity;

  for (let step = 0; step < SIM_MAX_STEPS; step++) {
    const px = x;
    const py = y;
    vy += g * SIM_DT;
    x += vx * SIM_DT;
    y += vy * SIM_DT;
    if (y < apexY) {
      apexY = y;
      apexX = x;
    }
    if (step % 2 === 0) pts.push({ x, y });

    const d = Math.hypot(x - target.x, y - target.y);
    if (d < closest) closest = d;

    // Target hit — the ball reached the opponent cannon.
    if (d <= targetR) {
      pts.push({ x, y });
      return {
        points: pts,
        outcome: "hitTarget",
        impact: { x, y },
        closest,
        apex: { x: apexX, y: apexY },
      };
    }

    // Terrain collision — refine the crossing a little for a clean impact point.
    if (y >= terrainYAt(lay, terrain, x)) {
      const hit = refineTerrainHit(lay, terrain, px, py, x, y);
      pts.push(hit);
      return {
        points: pts,
        outcome: "hitTerrain",
        impact: hit,
        closest,
        apex: { x: apexX, y: apexY },
      };
    }

    // Off the sides / bottom — a clean miss into the distance.
    if (x < -lay.ballR * 4 || x > lay.w + lay.ballR * 4 || y > lay.h + lay.ballR * 4) {
      pts.push({ x, y });
      return {
        points: pts,
        outcome: "offscreen",
        impact: { x, y },
        closest,
        apex: { x: apexX, y: apexY },
      };
    }
  }

  return {
    points: pts,
    outcome: "offscreen",
    impact: { x, y },
    closest,
    apex: { x: apexX, y: apexY },
  };
}

function refineTerrainHit(
  lay: Layout,
  terrain: Terrain,
  px: number,
  py: number,
  x: number,
  y: number,
): Vec2 {
  // Binary-search the segment for where the path crosses the ground.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const mx = px + (x - px) * mid;
    const my = py + (y - py) * mid;
    if (my >= terrainYAt(lay, terrain, mx)) hi = mid;
    else lo = mid;
  }
  const t = (lo + hi) / 2;
  return { x: px + (x - px) * t, y: py + (y - py) * t };
}

// --- short dotted aim preview ----------------------------------------------

/**
 * A SHORT curved preview near the muzzle. Its on-screen length scales with
 * power and is capped at `lay.maxPreview` at full power, so the dotted line
 * "charges up" as you pull back without ever revealing the whole trajectory.
 * Stops early if it would dive into the ground.
 */
export function previewArc(
  lay: Layout,
  terrain: Terrain,
  from: Vec2,
  dir: number,
  speed: number,
): Vec2[] {
  const power = speedToPower(speed, lay);
  const budget = lay.maxPreview * clamp01(power);
  if (budget < 1) return [{ x: from.x, y: from.y }];

  const g = lay.gravity;
  const v = launchVelocity(dir, speed);
  let vx = v.x;
  let vy = v.y;
  let x = from.x;
  let y = from.y;
  const pts: Vec2[] = [{ x, y }];
  let len = 0;

  for (let step = 0; step < SIM_MAX_STEPS; step++) {
    const px = x;
    const py = y;
    vy += g * SIM_DT;
    x += vx * SIM_DT;
    y += vy * SIM_DT;
    len += Math.hypot(x - px, y - py);
    if (step % 2 === 0) pts.push({ x, y });
    if (len >= budget) break;
    if (y >= terrainYAt(lay, terrain, x)) break;
    if (x < 0 || x > lay.w || y < 0) break;
  }
  return pts;
}

// --- AI aim -----------------------------------------------------------------

export interface AiShot {
  dir: number;
  speed: number;
}

interface DiffNoise {
  ang: number;
  speed: number;
}

/** Aim error by difficulty: easy is wild, hard is near-perfect. */
const AI_NOISE: Record<BankDifficulty, DiffNoise> = {
  easy: { ang: 0.26, speed: 0.3 },
  medium: { ang: 0.12, speed: 0.13 },
  hard: { ang: 0.025, speed: 0.03 },
};

const AI_DIR_MIN = Math.PI / 2 + 0.12; // just past straight up, leaning left
const AI_DIR_MAX = Math.PI - 0.06; // nearly flat to the left

/**
 * The player's launch-angle window (rad, y-up). Mirrors the drag clamp in
 * CannonGame so the solvability check samples exactly what a player can aim.
 */
export const PLAYER_DIR_MIN = 0.06;
export const PLAYER_DIR_MAX = 1.5;

/**
 * Computes the AI's shot toward `target`. It scans lob angles, solves the exact
 * speed for each (idealSpeed), and prefers an angle whose trajectory both stays
 * in the speed range AND clears the terrain to actually reach the player. The
 * chosen "perfect" shot is then perturbed by difficulty-scaled noise — so a
 * Hard AI lands true while an Easy AI sprays wide.
 */
export function aiAim(
  lay: Layout,
  terrain: Terrain,
  from: Vec2,
  target: Vec2,
  targetR: number,
  difficulty: BankDifficulty,
  rng: () => number = Math.random,
): AiShot {
  const best = solveAiShot(lay, terrain, from, target, targetR);
  const noise = AI_NOISE[difficulty];
  const dir = clamp(
    best.dir + (rng() * 2 - 1) * noise.ang,
    AI_DIR_MIN - 0.1,
    AI_DIR_MAX + 0.1,
  );
  const speed = clamp(
    best.speed * (1 + (rng() * 2 - 1) * noise.speed),
    lay.speedMin * 0.6,
    lay.speedMax,
  );
  return { dir, speed };
}

/** The clean (noise-free) AI solution — exposed for the perfect-shot path. */
export function solveAiShot(
  lay: Layout,
  terrain: Terrain,
  from: Vec2,
  target: Vec2,
  targetR: number,
): AiShot {
  let cleanBest: AiShot | null = null;
  let fallback: AiShot = {
    dir: (AI_DIR_MIN + AI_DIR_MAX) / 2,
    speed: (lay.speedMin + lay.speedMax) / 2,
  };
  let fallbackClosest = Infinity;

  const samples = 26;
  for (let i = 0; i <= samples; i++) {
    const dir = AI_DIR_MIN + (i / samples) * (AI_DIR_MAX - AI_DIR_MIN);
    const ideal = idealSpeed(from, target, dir, lay.gravity);
    if (ideal == null) continue;
    const speed = clamp(ideal, lay.speedMin, lay.speedMax);
    const sim = simulateShot(lay, terrain, from, dir, speed, target, targetR);
    if (sim.outcome === "hitTarget") {
      // Prefer the most arcing clean shot — a steeper lob clears terrain best.
      if (!cleanBest || dir > cleanBest.dir) cleanBest = { dir, speed };
    }
    if (sim.closest < fallbackClosest) {
      fallbackClosest = sim.closest;
      fallback = { dir, speed };
    }
  }

  return cleanBest ?? fallback;
}

// --- solvability + guaranteed-solvable terrain ------------------------------

function muzzleTip(lay: Layout, pivot: Vec2, dir: number): Vec2 {
  return {
    x: pivot.x + Math.cos(dir) * lay.muzzleLen,
    y: pivot.y - Math.sin(dir) * lay.muzzleLen,
  };
}

/** Sampling density for the existence check: angles × powers per side. */
export interface SolveGrid {
  angles: number;
  powers: number;
}

/**
 * A reasonably fine grid (≈33 angles × 17 powers). Fine enough to find a real
 * firing window, coarse enough to scan hundreds of terrains in a test run.
 */
export const DEFAULT_SOLVE_GRID: SolveGrid = { angles: 32, powers: 16 };

/**
 * Does ANY launch within one cannon's allowed angle/power window land a hit on
 * `target` without the terrain blocking it first? Reuses `simulateShot` so the
 * verdict matches real gameplay exactly. Two passes: first the analytic
 * exact-speed lob at each angle (what the aim solver fires), then a brute power
 * sweep to cover angles whose ideal speed clamps out of range.
 */
function sideCanHit(
  lay: Layout,
  terrain: Terrain,
  pivotX: number,
  target: Vec2,
  dirMin: number,
  dirMax: number,
  grid: SolveGrid,
): boolean {
  const pivot = cannonPivot(lay, terrain, pivotX);

  for (let i = 0; i <= grid.angles; i++) {
    const dir = dirMin + ((dirMax - dirMin) * i) / grid.angles;
    const from = muzzleTip(lay, pivot, dir);
    const ideal = idealSpeed(from, target, dir, lay.gravity);
    if (ideal == null) continue;
    const speed = clamp(ideal, lay.speedMin, lay.speedMax);
    const sim = simulateShot(lay, terrain, from, dir, speed, target, lay.hitR);
    if (sim.outcome === "hitTarget") return true;
  }

  for (let i = 0; i <= grid.angles; i++) {
    const dir = dirMin + ((dirMax - dirMin) * i) / grid.angles;
    const from = muzzleTip(lay, pivot, dir);
    for (let j = 0; j <= grid.powers; j++) {
      const speed =
        lay.speedMin + ((lay.speedMax - lay.speedMin) * j) / grid.powers;
      const sim = simulateShot(lay, terrain, from, dir, speed, target, lay.hitR);
      if (sim.outcome === "hitTarget") return true;
    }
  }

  return false;
}

/** Can the player cannon (left) land a hit on the AI cannon (right)? */
export function playerCanHit(
  lay: Layout,
  terrain: Terrain,
  grid: SolveGrid = DEFAULT_SOLVE_GRID,
): boolean {
  const target = cannonBodyCenter(lay, terrain, lay.aiX);
  return sideCanHit(
    lay,
    terrain,
    lay.playerX,
    target,
    PLAYER_DIR_MIN,
    PLAYER_DIR_MAX,
    grid,
  );
}

/** Can the AI cannon (right) land a hit on the player cannon (left)? */
export function aiCanHit(
  lay: Layout,
  terrain: Terrain,
  grid: SolveGrid = DEFAULT_SOLVE_GRID,
): boolean {
  const target = cannonBodyCenter(lay, terrain, lay.playerX);
  return sideCanHit(
    lay,
    terrain,
    lay.aiX,
    target,
    AI_DIR_MIN,
    AI_DIR_MAX,
    grid,
  );
}

/** A terrain is solvable only if BOTH cannons have a feasible firing window. */
export function isTerrainSolvable(
  lay: Layout,
  terrain: Terrain,
  grid: SolveGrid = DEFAULT_SOLVE_GRID,
): boolean {
  return playerCanHit(lay, terrain, grid) && aiCanHit(lay, terrain, grid);
}

// Progressive height caps (fractions; larger = lower ground) used to shave the
// peaks between the cannons. Each step lowers any central peak that pokes above
// the cap, converging on a gentle, always-clearable profile.
const CARVE_CAPS = [0.5, 0.56, 0.62, 0.68, 0.73, 0.78, 0.83];
/** Flat-line fraction for the guaranteed fallback (both barrels clear it). */
const FALLBACK_FLAT = 0.82;

/**
 * Lowers central peaks so the projectile's achievable apex can clear them.
 * Only the span between the cannon pads is touched; the peaks are clipped to
 * `capFrac`, lightly smoothed, then re-clipped so the height bound truly holds.
 */
function carveCentral(lay: Layout, terrain: Terrain, capFrac: number): Terrain {
  const heights = terrain.heights.slice();
  const n = heights.length - 1;
  const playerIdx = Math.round((lay.playerX / lay.w) * n);
  const aiIdx = Math.round((lay.aiX / lay.w) * n);
  const lo = Math.min(playerIdx, aiIdx);
  const hi = Math.max(playerIdx, aiIdx);
  const pad = Math.max(3, Math.round(n * 0.05));
  const from = lo + pad;
  const to = hi - pad;

  for (let i = from; i <= to; i++) {
    if (heights[i] < capFrac) heights[i] = capFrac;
  }
  // Soften the clipped shoulders so the carve still reads as organic terrain.
  const src = heights.slice();
  for (let i = Math.max(1, from - 2); i <= Math.min(n - 1, to + 2); i++) {
    heights[i] = (src[i - 1] + 2 * src[i] + src[i + 1]) / 4;
  }
  for (let i = from; i <= to; i++) {
    if (heights[i] < capFrac) heights[i] = capFrac;
  }

  return { heights, style: terrain.style };
}

/** A flat, low battlefield — the can't-fail fallback if carving never lands. */
function flattenSolvable(base: Terrain): Terrain {
  const heights = base.heights.map(() => FALLBACK_FLAT);
  return { heights, style: base.style };
}

/**
 * Builds a battlefield that is GUARANTEED solvable from both sides. It first
 * tries a handful of natural fields (best variety + looks); if none are
 * playable, it carves the last one's central peaks down step by step, and as a
 * worst-case it flattens to a gentle profile. Deterministic given `rng`, so
 * tests can pin a seed. Same public signature as `generateTerrain`.
 */
export function generateSolvableTerrain(
  lay: Layout,
  rng: () => number = Math.random,
  forced?: TerrainStyle,
): Terrain {
  const ATTEMPTS = 12;
  let last: Terrain | null = null;
  for (let a = 0; a < ATTEMPTS; a++) {
    const terrain = generateTerrain(lay, rng, forced);
    last = terrain;
    if (isTerrainSolvable(lay, terrain)) return terrain;
  }

  const base = last ?? generateTerrain(lay, rng, forced);
  for (const cap of CARVE_CAPS) {
    const carved = carveCentral(lay, base, cap);
    if (isTerrainSolvable(lay, carved)) return carved;
  }

  return flattenSolvable(base);
}

// --- ammo + shields + question economy -------------------------------------

/** Starting cannonballs for the player. */
export const START_AMMO = 3;
/** Hearts each side begins with. */
export const START_HEARTS = 3;
/** Most shields the player may stockpile at once. */
export const MAX_PLAYER_SHIELDS = 1;
/** Most shields the AI may stockpile at once. */
export const MAX_AI_SHIELDS = 3;

/**
 * Question difficulty adapts to how close the duel is. A tense, late, or losing
 * board demands harder questions; a comfortable lead serves easier ones. Reward
 * (ammo/shields) is the same — the challenge is what scales.
 */
export function questionDifficulty(
  playerHearts: number,
  aiHearts: number,
): BankDifficulty {
  const diff = playerHearts - aiHearts;
  if (diff >= 2) return "easy"; // comfortably ahead
  if (diff <= -1) return "hard"; // behind — claw back under pressure
  // Within one heart: tension rises as the board empties out.
  if (playerHearts <= 1 || aiHearts <= 1) return "hard";
  if (diff === 1) return "medium";
  return "medium"; // dead even, mid-board
}

export interface MatchState {
  playerHearts: number;
  aiHearts: number;
  ammo: number;
  playerShields: number;
  aiShields: number;
}

export function freshMatch(): MatchState {
  return {
    playerHearts: START_HEARTS,
    aiHearts: START_HEARTS,
    ammo: START_AMMO,
    playerShields: 0,
    aiShields: 0,
  };
}

export type RewardChoice = "ammo" | "shield";

/** Applies a correct-answer reward (player picks ammo or a shield). */
export function applyReward(state: MatchState, choice: RewardChoice): MatchState {
  if (choice === "shield") {
    return {
      ...state,
      playerShields: Math.min(MAX_PLAYER_SHIELDS, state.playerShields + 1),
    };
  }
  return { ...state, ammo: state.ammo + 1 };
}

/** A wrong answer hands the AI a shield (capped). */
export function applyWrongAnswer(state: MatchState): MatchState {
  return { ...state, aiShields: Math.min(MAX_AI_SHIELDS, state.aiShields + 1) };
}

export type HitResult = "shielded" | "heart" | "defeated";

/**
 * Resolves a confirmed hit on a side: a shield breaks first (absorbing the
 * blow); otherwise a heart is lost. Returns the next state + what happened.
 */
export function resolveHit(
  state: MatchState,
  side: "player" | "ai",
): { state: MatchState; result: HitResult } {
  const next = { ...state };
  if (side === "player") {
    if (next.playerShields > 0) {
      next.playerShields -= 1;
      return { state: next, result: "shielded" };
    }
    next.playerHearts = Math.max(0, next.playerHearts - 1);
    return { state: next, result: next.playerHearts <= 0 ? "defeated" : "heart" };
  }
  if (next.aiShields > 0) {
    next.aiShields -= 1;
    return { state: next, result: "shielded" };
  }
  next.aiHearts = Math.max(0, next.aiHearts - 1);
  return { state: next, result: next.aiHearts <= 0 ? "defeated" : "heart" };
}

// --- scoring ----------------------------------------------------------------

const DIFFICULTY_BONUS: Record<BankDifficulty, number> = {
  easy: 0,
  medium: 200,
  hard: 400,
};

/** Final session score: a win is worth the most, then hits + survivors. */
export function computeScore(params: {
  won: boolean;
  hitsDealt: number;
  playerHearts: number;
  ammo: number;
  playerShields: number;
  difficulty: BankDifficulty;
}): number {
  const { won, hitsDealt, playerHearts, ammo, playerShields, difficulty } =
    params;
  return Math.round(
    (won ? 1000 : 0) +
      hitsDealt * 150 +
      playerHearts * 100 +
      ammo * 10 +
      playerShields * 20 +
      DIFFICULTY_BONUS[difficulty],
  );
}

// --- helpers ----------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
