// ---------------------------------------------------------------------------
// Render contract for the Shadow Fight-style brawler. The shell advances the
// engine (CombatState), then each frame calls `buildScene(state, layout, time)`
// to produce an immutable `BossScene`, and hands it to `drawScene`
// (bossRender.ts). The renderer reads BossScene fields ONLY — it never touches
// CombatState or runs simulation. Keep these shapes stable.
//
// Ambient particles (dust, embers) are owned by the shell — a small pool it
// updates each frame and assigns to `scene.particles`. Combat hit-sparks are
// owned by the engine (CombatState.hitSparks) and surfaced here.
// ---------------------------------------------------------------------------

import type { Vec2 } from "../types";
import type {
  AttackKind,
  AttackStrength,
  BossLayout,
  BossShape,
  CombatPhase,
  CombatState,
  FighterAction,
  FighterSide,
  HitHeight,
  HitSpark,
  MovePhase,
} from "./bossTypes";
import { LEFT_WALL, RIGHT_WALL } from "./bossEngine";

export interface BossSceneParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  /** Downward acceleration (px/s^2); 0 = floaty. */
  gravity: number;
  spin?: number;
}

/** Which full-screen layer the shell should show. */
export type BossScreen = "intro" | "fighting" | "victory" | "defeat";

/** Everything the renderer needs to pose one fighter this frame. */
export interface FighterPose {
  side: FighterSide;
  /** Foot position on the ground plane, in canvas px. */
  x: number;
  /** Height of the hips above the ground (px); 0 = grounded. */
  y: number;
  facing: 1 | -1;
  action: FighterAction;
  crouching: boolean;
  blocking: boolean;
  airborne: boolean;
  stunned: boolean;
  /** Active attack descriptors (null when not attacking). */
  attackKind: AttackKind | null;
  attackStrength: AttackStrength | null;
  movePhase: MovePhase | null;
  moveHeight: HitHeight | null;
  /** 0..1 health and meter. */
  hp: number;
  meter: number;
  combo: number;
}

/** Immutable per-frame snapshot the renderer consumes. */
export interface BossScene {
  layout: BossLayout;
  time: number;
  reduced: boolean;
  screen: BossScreen;

  // ---- Boss identity / styling ----
  bossShape: BossShape;
  bossPrimary: string;
  bossSecondary: string;
  bossAccent: string;
  bossName: string;
  bossTitle: string;
  phaseIndex: number;
  phaseCount: number;

  // ---- Fighters ----
  player: FighterPose;
  boss: FighterPose;

  // ---- HUD ----
  score: number;
  highScore: number;
  maxCombo: number;
  banner: string | null;

  // ---- FX ----
  shake: number; // 0..1 intensity
  flash: number; // 0..1 white flash
  hitSparks: HitSpark[];
  particles: BossSceneParticle[];
}

const PHASE_TO_SCREEN: Partial<Record<CombatPhase, BossScreen>> = {
  intro: "intro",
  victory: "victory",
  defeat: "defeat",
};

// World -> screen mapping. The engine simulates in fixed world units between
// LEFT_WALL and RIGHT_WALL; the renderer works in canvas px. We map the world
// play area onto the layout's [leftWall, rightWall] so fighters (and the hit
// sparks they spawn) always stay inside the visible canvas regardless of its
// width — fixing the boss clipping off the right edge on narrow canvases.
const WORLD_SPAN = RIGHT_WALL - LEFT_WALL;

function worldFactor(layout: BossLayout): number {
  const screenSpan = layout.rightWall - layout.leftWall;
  return WORLD_SPAN > 0 ? screenSpan / WORLD_SPAN : 1;
}

function worldToScreenX(wx: number, layout: BossLayout, factor: number): number {
  return layout.leftWall + (wx - LEFT_WALL) * factor;
}

function poseOf(side: FighterSide, state: CombatState, layout: BossLayout, factor: number): FighterPose {
  const f = side === "player" ? state.player : state.boss;
  const attacking = f.action === "attack" && f.move !== null;
  return {
    side,
    x: worldToScreenX(f.x, layout, factor),
    y: f.y * factor,
    facing: f.facing,
    action: f.action,
    crouching: f.crouching,
    blocking: f.blocking,
    airborne: !f.onGround,
    stunned: f.action === "hitstun" || f.action === "blockstun" || f.action === "knockdown",
    attackKind: attacking ? f.move!.kind : null,
    attackStrength: attacking ? f.move!.strength : null,
    movePhase: attacking ? f.movePhase : null,
    moveHeight: attacking ? f.move!.height : null,
    hp: f.maxHp > 0 ? Math.max(0, Math.min(1, f.hp / f.maxHp)) : 0,
    meter: Math.max(0, Math.min(1, f.meter)),
    combo: f.combo,
  };
}

/** Resolution-independent side-view geometry. Ground sits low on the canvas. */
export function makeLayout(width: number, height: number): BossLayout {
  const scale = Math.max(0.5, Math.min(width / 760, height / 460));
  const margin = Math.min(width * 0.08, 70);
  return {
    width,
    height,
    groundY: height * 0.86,
    leftWall: margin,
    rightWall: width - margin,
    scale,
    center: { x: width * 0.5, y: height * 0.5 } as Vec2,
  };
}

/**
 * Maps engine CombatState -> drawable BossScene. Pure and allocation-light.
 * The shell assigns `particles` (its own pool) and `highScore` via opts.
 */
export function buildScene(
  state: CombatState,
  layout: BossLayout,
  time: number,
  opts: { reduced?: boolean; highScore?: number; particles?: BossSceneParticle[] } = {},
): BossScene {
  const factor = worldFactor(layout);

  // Hit sparks are spawned by the engine in world coords (x in the world span,
  // y = height above ground). Map them to absolute canvas coords so they land
  // on the fighters' bodies rather than at the top of the screen.
  const hitSparks: HitSpark[] = state.hitSparks.map((s) => ({
    ...s,
    x: worldToScreenX(s.x, layout, factor),
    y: layout.groundY - s.y * factor,
    size: s.size * layout.scale,
  }));

  return {
    layout,
    time,
    reduced: opts.reduced ?? false,
    screen: PHASE_TO_SCREEN[state.combatPhase] ?? "fighting",

    bossShape: state.config.visual.shape,
    bossPrimary: state.config.visual.primary,
    bossSecondary: state.config.visual.secondary,
    bossAccent: state.config.visual.accent,
    bossName: state.config.name,
    bossTitle: state.config.title,
    phaseIndex: state.phaseIndex,
    phaseCount: state.config.phases.length,

    player: poseOf("player", state, layout, factor),
    boss: poseOf("boss", state, layout, factor),

    score: state.score,
    highScore: opts.highScore ?? 0,
    maxCombo: state.maxCombo,
    banner: state.banner,

    shake: Math.max(0, Math.min(1, state.shake)),
    flash: Math.max(0, Math.min(1, state.flash)),
    hitSparks,
    particles: opts.particles ?? [],
  };
}
