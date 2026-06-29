// ---------------------------------------------------------------------------
// Shared contract for Boss Fight Mode — a Shadow Fight-style 2D silhouette
// brawler. Two fighters face off on a side-view arena: each can walk, jump,
// crouch, block, and throw light/heavy punches and kicks (high / mid / low /
// overhead) plus a meter Special. Win by draining the boss's single HP bar.
//
// This file is the single source of truth shared by the combat engine
// (bossEngine.ts), the weapon system (weapons.ts), the boss registry
// (bossRegistry.ts), the canvas renderer (bossRender.ts), and the React shell
// (BossFight.tsx + controls). Keep these shapes STABLE.
//
// Design notes live in docs/boss-fight-mode-prd.md.
// ---------------------------------------------------------------------------

import type { Vec2 } from "../types";

// ---- Player input ---------------------------------------------------------

export type AttackKind = "punch" | "kick";
export type AttackStrength = "light" | "heavy";

/**
 * A player input intent. `bossInput.ts` maps the on-screen buttons + keyboard
 * to these; `applyIntent` consumes them. `move`, `crouch`, and `block` are held
 * states (the shell re-sends them as they change); the rest are taps. The
 * engine resolves an `attack` into a concrete move from the fighter's current
 * stance (grounded / crouching / airborne).
 */
export type BossIntent =
  | { kind: "move"; dir: -1 | 0 | 1 }
  | { kind: "jump" }
  | { kind: "crouch"; pressed: boolean }
  | { kind: "block"; pressed: boolean }
  // A single Punch / Kick request. The engine derives the concrete move
  // (light, or a heavier directional variant) from the fighter's stance and the
  // direction currently held: neutral = light, holding toward the opponent =
  // a heavy forward attack, crouching = a low, airborne = an overhead.
  | { kind: "attack"; attack: AttackKind }
  | { kind: "special" };

// ---- Moves / frame data ---------------------------------------------------

/** The stance a move is performed from. */
export type MoveStance = "stand" | "crouch" | "air";

/** The height a strike threatens — drives the block/crouch/jump read. */
export type HitHeight = "high" | "mid" | "low" | "overhead";

/**
 * Frame data for one attack. The engine owns the MOVES table values; weapons
 * scale damage / reach / speed on top. Times are in milliseconds.
 */
export interface AttackMove {
  id: string;
  kind: AttackKind;
  strength: AttackStrength;
  stance: MoveStance;
  height: HitHeight;
  /** Windup before the hitbox goes live. */
  startupMs: number;
  /** How long the hitbox stays live. */
  activeMs: number;
  /** Lag after the active frames during which the fighter is vulnerable. */
  recoveryMs: number;
  /** Horizontal reach of the hitbox from the fighter's front (px, pre-weapon). */
  baseReachPx: number;
  /** Damage before the weapon's damage multiplier. */
  baseDamage: number;
  /** Stun inflicted on a clean hit. */
  hitstunMs: number;
  /** Stun inflicted when blocked. */
  blockstunMs: number;
  /** Horizontal knockback applied to the victim (px). */
  pushbackPx: number;
  /** Meter (0..1) the attacker gains when it connects. */
  meterGain: number;
  /** Whether a clean hit knocks the victim down. */
  knockdown?: boolean;
}

// ---- Boss content config --------------------------------------------------

/** Silhouette archetype the renderer styles each fighter's shadow with. */
export type BossShape =
  | "slopeWraith" // Boss 1
  | "accelArrow" // Boss 2
  | "riemannTower" // Boss 3
  | "ringCore" // Boss 4
  | "componentCross" // Boss 5
  | "arcComet" // Boss 6
  | "gravityOrb" // Boss 7
  | "framePrism" // Boss 8
  | "sineSerpent" // Boss 9
  | "mirror" // Boss 10
  | "singularity"; // Finale

export interface BossVisual {
  shape: BossShape;
  /** Glow / aura palette (hex). */
  primary: string;
  secondary: string;
  accent: string;
}

/** How a boss fights — tuned up the difficulty curve. */
export interface BossAIProfile {
  /** 0..1: how readily it presses an attack when the player is in range. */
  aggression: number;
  /** Delay before it reacts to the player's actions (ms; lower = sharper). */
  reactionMs: number;
  /** 0..1: chance it blocks an incoming, well-read strike. */
  blockChance: number;
  /** 0..1: chance it chooses a jump-in approach. */
  jumpChance: number;
  /** Spacing (px) it tries to maintain before committing. */
  preferredRangePx: number;
  /** Max attacks it will chain in a string. */
  comboLength: number;
  /** Walk-speed multiplier. */
  moveSpeedMult: number;
}

/**
 * A boss phase: an HP segment with its own AI profile. Mini-bosses have one
 * phase; the finale has three that escalate as its bar is chipped down.
 */
export interface BossPhase {
  hp: number;
  ai: BossAIProfile;
}

export interface BossConfig {
  /** Stable id. For mini-bosses this equals the lessonId; finale is "finale". */
  id: string;
  /** The lesson this boss is gated behind, or null for the finale. */
  lessonId: string | null;
  /** Difficulty index: 1..10 for mini-bosses, 11 for the finale. */
  index: number;
  name: string;
  /** e.g. "the Slope Wraith". */
  title: string;
  /** Light narrative taunt (one line). */
  taunt: string;
  visual: BossVisual;
  /** 1 phase for mini-bosses; the finale has 3. */
  phases: BossPhase[];
  musicTrack: "boss" | "finale";
}

// ---- Weapons (score -> weapon) -------------------------------------------

export type WeaponTier = 1 | 2 | 3 | 4 | 5;

export type WeaponArchetype =
  | "fastBlade"
  | "fastFists"
  | "heavyHammer"
  | "midThrow"
  | "dualFast"
  | "rangedArc"
  | "slowHeavy"
  | "counter"
  | "rhythm"
  | "balanced";

/** A lesson's themed weapon. Instances live in weapons.ts. */
export interface WeaponConfig {
  id: string;
  /** The lesson that awards this weapon. */
  lessonId: string;
  name: string;
  archetype: WeaponArchetype;
  /** Special move name (unlocks at tier >= 3, upgrades at tier 5). */
  special: string;
  /** Reference light/heavy damage at tier 1 (HUD + tier scaling base). */
  baseLightDamage: number;
  baseHeavyDamage: number;
  /** Base reach (px) the weapon adds to a move's reach. */
  baseReachPx: number;
}

/** Effective per-fight stats after applying the tier multipliers. */
export interface WeaponStats {
  /** Multiplier applied to a move's baseDamage. */
  damageMult: number;
  /** Reference light/heavy damage (for the loadout HUD + tests). */
  lightDamage: number;
  heavyDamage: number;
  /** Startup/recovery speed multiplier (> 1 = snappier). */
  attackSpeed: number;
  /** Extra reach (px) added to every move. */
  reachPx: number;
  /** Meter (0..1) gained per landed hit. */
  meterPerHit: number;
  specialUnlocked: boolean;
  specialUpgraded: boolean;
}

// ---- Fighter runtime state ------------------------------------------------

export type FighterSide = "player" | "boss";

export type FighterAction =
  | "idle"
  | "walk"
  | "jump"
  | "crouch"
  | "block"
  | "attack"
  | "hitstun"
  | "blockstun"
  | "knockdown"
  | "ko";

export type MovePhase = "startup" | "active" | "recovery";

export interface FighterState {
  side: FighterSide;
  /** World x of the fighter's center on the ground plane (px). */
  x: number;
  /** Height of the hips above the ground (px); 0 = grounded. */
  y: number;
  vx: number;
  vy: number;
  /** +1 faces right, -1 faces left. Fighters auto-face their opponent. */
  facing: 1 | -1;
  onGround: boolean;
  crouching: boolean;
  blocking: boolean;
  hp: number;
  maxHp: number;
  /** Special meter, 0..1. */
  meter: number;
  action: FighterAction;
  /** The active attack (when action === "attack"), else null. */
  move: AttackMove | null;
  movePhase: MovePhase | null;
  /** ms elapsed in the current action (or move phase). */
  actionTimer: number;
  /** True once the active move has already connected (one hit per swing). */
  hitThisMove: boolean;
  /** Remaining hit/block stun (ms). */
  stunTimer: number;
  /** Current attacker combo count. */
  combo: number;
}

// ---- Combat runtime state (engine public state) --------------------------
//
// `CombatState` is produced and advanced by bossEngine.ts and read by the
// renderer + shell. The engine MAY add internal fields, but every field here
// must be present and meaningful, since render/UI depend on them.

export type CombatPhase = "intro" | "fighting" | "victory" | "defeat";

/** A short-lived contact effect spawned at a hit/block/KO point. */
export interface HitSpark {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
  kind: "hit" | "block" | "ko" | "special";
}

export interface CombatState {
  config: BossConfig;
  weapon: WeaponConfig;
  tier: WeaponTier;
  stats: WeaponStats;

  player: FighterState;
  boss: FighterState;

  /** Index into config.phases (boss HP segment). */
  phaseIndex: number;
  combatPhase: CombatPhase;
  /** Seconds spent in the current combatPhase. */
  phaseTimer: number;

  score: number;
  maxCombo: number;
  hitsLanded: number;
  hitsTaken: number;
  /** Seconds elapsed in the fight. */
  elapsed: number;

  /** Deterministic RNG cursor (for tests/replays). */
  rngState: number;
  /** Set when the fight ends. */
  result: "win" | "lose" | null;

  /** Transient view cues. */
  shake: number;
  flash: number;
  banner: string | null;
  hitSparks: HitSpark[];
}

// ---- Layout (canvas geometry) --------------------------------------------

/** Resolution-independent side-view geometry shared by engine + renderer. */
export interface BossLayout {
  width: number;
  height: number;
  /** Y of the ground plane (px from top). */
  groundY: number;
  /** Left / right world bounds the fighters are clamped between (px). */
  leftWall: number;
  rightWall: number;
  /** Unit scale derived from canvas size. */
  scale: number;
  /** Convenience anchor used by the intro card, etc. */
  center: Vec2;
}

// ---- Result reported to the page on fight end ----------------------------

export interface BossFightResult {
  bossId: string;
  defeated: boolean;
  score: number;
  /** 1..3 performance stars (distinct from the 1..5 weapon tier). */
  stars: 1 | 2 | 3;
  weaponTierUsed: WeaponTier;
}
