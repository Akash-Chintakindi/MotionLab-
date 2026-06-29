// ---------------------------------------------------------------------------
// Pure, deterministic combat engine for Boss Fight Mode — a Shadow Fight-style
// 2D silhouette brawler. No DOM, no rendering, no steady-state allocation. The
// React shell maps input to BossIntent and calls applyIntent (player only); the
// game loop calls stepCombat(dt), which runs a FIXED 60Hz accumulator so the
// simulation is identical regardless of frame pacing. All randomness flows
// through a seeded Mulberry32 cursor in state.rngState, so seed + scripted
// per-step intents fully determine the outcome.
//
// physics-intuition: jumps are a real ballistic arc (gravity pulls vy down to a
// believable apex); heavy strikes start slow and recover slow (mass = slow to
// start, slow to stop) and shove the victim with weighty pushback; landing a
// clean low/overhead beats the wrong guard; knockdowns buckle the victim. The
// frame data (startup -> active -> recovery) gives every swing anticipation and
// follow-through.
// ---------------------------------------------------------------------------

import type {
  AttackKind,
  AttackMove,
  AttackStrength,
  BossConfig,
  BossIntent,
  CombatState,
  FighterState,
  HitSpark,
  MoveStance,
  WeaponConfig,
  WeaponStats,
  WeaponTier,
} from "./bossTypes";
import { weaponStats } from "./weapons";

// --- constants -------------------------------------------------------------

/** Internal fixed timestep. 60Hz keeps frame windows crisp and testable. */
export const FIXED_DT = 1 / 60;

/** Nominal world arena width (px). The renderer maps its own layout; the engine
 * simulates in these fixed world units and the shell scales for display. */
export const ARENA_WIDTH = 760;
const WALL_MARGIN = 60;
export const LEFT_WALL = WALL_MARGIN;
export const RIGHT_WALL = ARENA_WIDTH - WALL_MARGIN;

/** Half body width (px) — used for facing-front offset and overlap pushout. */
const BODY_HALF = 26;
const MIN_SEPARATION = BODY_HALF * 2;

const PLAYER_MAX_HP = 100;

// Locomotion / ballistics (px, px/s, px/s^2).
const WALK_SPEED = 165;
const GROUND_FRICTION = 0.78;
const AIR_DRAG = 0.99;
const GRAVITY = 1900;
const JUMP_VELOCITY = 580; // up is +y (y = height above ground)
const AIR_CONTROL = 90;

// Airborne fighters float above low/mid attacks; a high/overhead can still
// reach up to this height.
const AIR_HITTABLE_MAX = 96;

const INTRO_S = 0.8;
const BANNER_S = 1.0;
const PHASE_BANNER_S = 1.1;

const BLOCK_CHIP_FRAC = 0.12;
const MAX_SPARKS = 24;

// Guard break: a heavy/forward attack that lands on a blocking victim smashes
// through the guard instead of being chipped. It deals real (reduced) damage,
// a long stagger, heavy pushback, and clears the victim's block.
const GUARD_BREAK_DAMAGE_FRAC = 0.62; // ~55-70% of a clean hit
const GUARD_BREAK_STUN_MULT = 1.85; // long blockstun / stagger
const GUARD_BREAK_PUSHBACK_FRAC = 0.9;

const BOSS_REACH_BONUS = 30; // bosses fight bare-handed with a fixed extra reach
const SPECIAL_REACH_BONUS = 46;

// Boss AI cadence: decisions fire on a fraction of the reaction time so the
// boss keeps initiative and chains strings instead of idling between swings.
const AI_CADENCE_MULT = 0.72;

// --- frame data (the MOVES table) ------------------------------------------
//
// Base, pre-weapon templates for the directional moveset plus the meter
// Special. There is NO separate "heavy button": a single Punch / Kick request
// is resolved by `resolveMove` from the fighter's STANCE plus the direction it
// holds relative to the opponent:
//
//   stance air                  -> an overhead air attack   (airPunch / airKick)
//   stance crouch               -> a low                     (crouchPunch / crouchKick)
//   standing, holding TOWARD     -> a heavy forward variant   (punchHeavy / kickHeavy)
//   standing, neutral            -> a light                   (punchLight / kickLight)
//   standing, holding AWAY       -> a longer-reach poke       (punchPoke / kickPoke)
//
// `resolveAttack` then scales the chosen template by a fighter's weapon stats
// into the concrete AttackMove stored on FighterState.move. Heavy moves
// (`strength: "heavy"`) GUARD-BREAK a blocking victim (see resolveHits) and the
// renderer poses them big. physics-intuition: heavies wind up slow and recover
// slow (mass = slow to start, slow to stop) and shove with weighty pushback;
// lights are quick, low-commitment, and chain. Times are ms; reach/damage px/hp.

type MoveId =
  | "punchLight"
  | "punchHeavy"
  | "punchPoke"
  | "kickLight"
  | "kickHeavy"
  | "kickPoke"
  | "crouchPunch"
  | "crouchKick"
  | "airPunch"
  | "airKick"
  | "special";

function move(
  id: MoveId,
  kind: AttackKind,
  strength: AttackStrength,
  stance: MoveStance,
  height: AttackMove["height"],
  startupMs: number,
  activeMs: number,
  recoveryMs: number,
  baseReachPx: number,
  baseDamage: number,
  hitstunMs: number,
  blockstunMs: number,
  pushbackPx: number,
  knockdown = false,
): AttackMove {
  return {
    id,
    kind,
    strength,
    stance,
    height,
    startupMs,
    activeMs,
    recoveryMs,
    baseReachPx,
    baseDamage,
    hitstunMs,
    blockstunMs,
    pushbackPx,
    meterGain: 0,
    knockdown,
  };
}

/** The shared, frozen frame-data table. Read-only; never mutated at runtime. */
export const MOVES: Readonly<Record<MoveId, AttackMove>> = {
  // --- standing, neutral: light, fast, low-commitment, chains combos --------
  // Fast jab — high.
  punchLight: move("punchLight", "punch", "light", "stand", "high", 90, 60, 150, 34, 6, 220, 110, 10),
  // Mid round kick — solid poke.
  kickLight: move("kickLight", "kick", "light", "stand", "mid", 130, 80, 200, 48, 8, 260, 140, 16),

  // --- standing, holding TOWARD: heavy forward variants (GUARD-BREAK) -------
  // Advancing overhead hook — slow windup + recovery, big shove, breaks guard.
  punchHeavy: move("punchHeavy", "punch", "heavy", "stand", "overhead", 240, 90, 420, 42, 15, 440, 280, 40),
  // Advancing body kick — mid, breaks guard and knocks the victim down.
  kickHeavy: move("kickHeavy", "kick", "heavy", "stand", "mid", 220, 100, 430, 56, 13, 480, 240, 30, true),

  // --- standing, holding AWAY: longer-reach spacing pokes (light) -----------
  // Back-step straight — high, extra reach, keeps the opponent honest.
  punchPoke: move("punchPoke", "punch", "light", "stand", "high", 120, 60, 200, 48, 7, 240, 130, 14),
  // Long teep — mid, the longest poke, spaces the opponent out.
  kickPoke: move("kickPoke", "kick", "light", "stand", "mid", 150, 80, 220, 64, 9, 260, 150, 20),

  // --- crouching: lows (beat a standing guard) ------------------------------
  // Crouch jab — low, fast.
  crouchPunch: move("crouchPunch", "punch", "light", "crouch", "low", 100, 60, 200, 40, 6, 240, 120, 10),
  // Crouch sweep — low, knocks down.
  crouchKick: move("crouchKick", "kick", "light", "crouch", "low", 110, 90, 240, 50, 9, 360, 160, 18, true),

  // --- airborne: overheads (beat a crouch guard) ----------------------------
  // Air smash — overhead from the air.
  airPunch: move("airPunch", "punch", "heavy", "air", "overhead", 70, 120, 200, 40, 10, 320, 170, 12),
  // Jump kick — overhead dive.
  airKick: move("airKick", "kick", "heavy", "air", "overhead", 80, 140, 200, 46, 11, 340, 180, 14),

  // --- meter Special — long-reach overhead finisher; damage scales off weapon
  special: move("special", "kick", "heavy", "stand", "overhead", 150, 120, 340, 30, 18, 520, 300, 46, true),
};

/**
 * Which directional variant an attack resolves to from the standing stance,
 * derived from the direction the fighter holds relative to the opponent.
 */
export type AttackDir = "forward" | "neutral" | "back";

/** Held direction (-1/0/1 in world space) relative to which way the fighter faces. */
export function attackDirOf(heldDir: -1 | 0 | 1, facing: 1 | -1): AttackDir {
  if (heldDir === 0) return "neutral";
  return heldDir === facing ? "forward" : "back";
}

/**
 * Resolve the BASE move (pre-weapon) for a fighter's stance + held direction +
 * attack kind. Pure and shared by BOTH fighters (player input and boss AI), so
 * the directional moveset is identical for everyone:
 *   air    -> overhead air attack (dir ignored)
 *   crouch -> low                 (dir ignored)
 *   stand + forward -> heavy guard-breaking variant
 *   stand + neutral -> light
 *   stand + back    -> longer-reach poke
 */
export function resolveMove(stance: MoveStance, dir: AttackDir, attack: AttackKind): AttackMove {
  if (stance === "air") return attack === "punch" ? MOVES.airPunch : MOVES.airKick;
  if (stance === "crouch") return attack === "punch" ? MOVES.crouchPunch : MOVES.crouchKick;
  if (dir === "forward") return attack === "punch" ? MOVES.punchHeavy : MOVES.kickHeavy;
  if (dir === "back") return attack === "punch" ? MOVES.punchPoke : MOVES.kickPoke;
  return attack === "punch" ? MOVES.punchLight : MOVES.kickLight;
}

/** Per-fighter weapon-derived scaling applied when a move starts. */
interface MoveScale {
  attackSpeed: number;
  reachPx: number;
  damageMult: number;
  meterPerHit: number;
}

/**
 * Resolve a base move into the concrete, weapon-scaled AttackMove the engine
 * actually runs: startup/recovery shortened by attack speed, reach extended,
 * damage multiplied, and the per-hit meter gain baked in. The renderer only
 * reads kind/strength/height/phase, so baking the numbers here is safe.
 */
export function resolveAttack(base: AttackMove, scale: MoveScale): AttackMove {
  const meterFactor = base.id === "special" ? 0 : base.strength === "heavy" ? 1.5 : 1;
  return {
    ...base,
    startupMs: base.startupMs / scale.attackSpeed,
    recoveryMs: base.recoveryMs / scale.attackSpeed,
    baseReachPx: base.baseReachPx + scale.reachPx,
    baseDamage: base.baseDamage * scale.damageMult,
    meterGain: scale.meterPerHit * meterFactor,
  };
}

// --- internal state --------------------------------------------------------

interface Buffered {
  // The single Punch / Kick request; the concrete move is resolved at fire time
  // from the fighter's stance + held direction (there is no strength field).
  attack: AttackKind | null;
  jump: boolean;
  special: boolean;
  timer: number; // ms remaining before a buffered tap is dropped
}

/** Per-fighter control + weapon scaling kept off the public FighterState. */
interface Control {
  dir: -1 | 0 | 1;
  crouchHeld: boolean;
  blockHeld: boolean;
  scale: MoveScale;
  bossDamageMult: number;
  buffered: Buffered;
}

interface AiState {
  decisionMs: number;
  reactMs: number;
  comboLeft: number;
  threatSeen: boolean;
  /** 0..1 running read of how much the player turtles — biases the boss toward
   *  guard-breaking heavies when it climbs. */
  guardReads: number;
}

interface InternalState extends CombatState {
  acc: number;
  playerCtl: Control;
  bossCtl: Control;
  ai: AiState;
  aiEnabled: boolean;
  damageDealt: number;
  specialsUsed: number;
  bannerTimer: number;
}

export interface CreateCombatParams {
  config: BossConfig;
  weapon: WeaponConfig;
  tier: WeaponTier;
  seed?: number;
  /** Defaults to true. Tests may disable the boss AI for controlled scenarios. */
  aiEnabled?: boolean;
}

// --- public API ------------------------------------------------------------

function makeFighter(side: FighterState["side"], x: number, facing: 1 | -1, hp: number): FighterState {
  return {
    side,
    x,
    y: 0,
    vx: 0,
    vy: 0,
    facing,
    onGround: true,
    crouching: false,
    blocking: false,
    hp,
    maxHp: hp,
    meter: 0,
    action: "idle",
    move: null,
    movePhase: null,
    actionTimer: 0,
    hitThisMove: false,
    stunTimer: 0,
    combo: 0,
  };
}

function emptyBuffer(): Buffered {
  return { attack: null, jump: false, special: false, timer: 0 };
}

function controlFor(scale: MoveScale, bossDamageMult: number): Control {
  return {
    dir: 0,
    crouchHeld: false,
    blockHeld: false,
    scale,
    bossDamageMult,
    buffered: emptyBuffer(),
  };
}

export function createCombat(params: CreateCombatParams): CombatState {
  const { config, weapon, tier, seed, aiEnabled = true } = params;
  const stats: WeaponStats = weaponStats(weapon, tier);
  const phase = config.phases[0];

  const player = makeFighter("player", LEFT_WALL + 130, 1, PLAYER_MAX_HP);
  const boss = makeFighter("boss", RIGHT_WALL - 130, -1, phase.hp);

  const playerScale: MoveScale = {
    attackSpeed: stats.attackSpeed,
    reachPx: stats.reachPx,
    damageMult: stats.damageMult,
    meterPerHit: stats.meterPerHit,
  };
  const bossScale: MoveScale = {
    attackSpeed: 1 + (config.index - 1) * 0.02,
    reachPx: BOSS_REACH_BONUS,
    damageMult: 1,
    meterPerHit: 0,
  };

  const s: InternalState = {
    config,
    weapon,
    tier,
    stats,

    player,
    boss,

    phaseIndex: 0,
    combatPhase: "intro",
    phaseTimer: 0,

    score: 0,
    maxCombo: 0,
    hitsLanded: 0,
    hitsTaken: 0,
    elapsed: 0,

    rngState: (seed ?? 1) | 0,
    result: null,

    shake: 0,
    flash: 0,
    banner: null,
    hitSparks: [],

    acc: 0,
    playerCtl: controlFor(playerScale, 1),
    bossCtl: controlFor(bossScale, difficultyDamage(config, 0)),
    ai: { decisionMs: 0, reactMs: 0, comboLeft: 0, threatSeen: false, guardReads: 0 },
    aiEnabled,
    damageDealt: 0,
    specialsUsed: 0,
    bannerTimer: 0,
  };
  return s;
}

/** Advance the fight in place by `dtSeconds` of wall-clock time. */
export function stepCombat(state: CombatState, dtSeconds: number): void {
  const s = state as InternalState;
  if (s.result) return;
  if (!(dtSeconds > 0)) return;
  // Clamp to avoid a spiral of death after a long stall (tab backgrounded).
  const dt = dtSeconds > 0.25 ? 0.25 : dtSeconds;
  s.acc += dt;
  while (s.acc >= FIXED_DT) {
    tick(s, FIXED_DT);
    s.acc -= FIXED_DT;
    if (s.result) {
      s.acc = 0;
      break;
    }
  }
}

/** Apply one player input intent. Only ever affects the PLAYER fighter. */
export function applyIntent(state: CombatState, intent: BossIntent): void {
  const s = state as InternalState;
  if (s.result) return;
  const ctl = s.playerCtl;
  switch (intent.kind) {
    case "move":
      ctl.dir = intent.dir;
      return;
    case "crouch":
      ctl.crouchHeld = intent.pressed;
      return;
    case "block":
      ctl.blockHeld = intent.pressed;
      return;
    case "jump":
      ctl.buffered.jump = true;
      ctl.buffered.timer = 120;
      return;
    case "attack":
      // Only the kind is carried; the concrete move is resolved at fire time
      // from the player's stance + the direction currently held.
      ctl.buffered.attack = intent.attack;
      ctl.buffered.timer = 120;
      return;
    case "special":
      ctl.buffered.special = true;
      ctl.buffered.timer = 120;
      return;
  }
}

/** 1..3 performance stars from the final state (distinct from weapon tier). */
export function starsFor(state: CombatState): 1 | 2 | 3 {
  if (state.result !== "win") return 1;
  const hpFrac = state.player.maxHp > 0 ? state.player.hp / state.player.maxHp : 0;
  if (hpFrac >= 0.7 && state.hitsTaken <= 3) return 3;
  if (hpFrac >= 0.4 && state.hitsTaken <= 8) return 2;
  return 1;
}

// --- per-tick machine ------------------------------------------------------

function tick(s: InternalState, dt: number): void {
  s.elapsed += dt;
  s.phaseTimer += dt;

  decayCues(s, dt);

  if (s.combatPhase === "intro") {
    if (s.phaseTimer >= INTRO_S) {
      s.combatPhase = "fighting";
      s.phaseTimer = 0;
    }
    return;
  }
  if (s.combatPhase === "victory" || s.combatPhase === "defeat") return;

  // 1) Inputs -> start moves for actionable fighters.
  startBufferedActions(s, s.player, s.playerCtl, dt);
  if (s.aiEnabled) bossThink(s, dt);

  // 2) Apply held states + integrate physics + advance move phases.
  updateFighter(s.player, heldFor(s, s.player), dt);
  updateFighter(s.boss, heldFor(s, s.boss), dt);

  // 3) Resolve any active hitboxes.
  resolveHits(s, s.player, s.boss);
  if (s.result) return;
  resolveHits(s, s.boss, s.player);
  if (s.result) return;

  // 4) Clamp to walls + push apart overlapping bodies.
  resolveBounds(s);

  // 5) Auto-face the opponent when actionable.
  faceOpponent(s.player, s.boss);
  faceOpponent(s.boss, s.player);

  s.score = liveScore(s);
}

function decayCues(s: InternalState, dt: number): void {
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 2.6);
  if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 3);
  if (s.bannerTimer > 0) {
    s.bannerTimer -= dt;
    if (s.bannerTimer <= 0) s.banner = null;
  }
  const sparks = s.hitSparks;
  for (let i = sparks.length - 1; i >= 0; i--) {
    sparks[i].life -= dt;
    if (sparks[i].life <= 0) sparks.splice(i, 1);
  }
}

// --- held-input resolution -------------------------------------------------

interface Held {
  dir: -1 | 0 | 1;
  crouch: boolean;
  block: boolean;
  /** Walk-speed multiplier (bosses close faster up the curve). */
  speedMult: number;
}

function heldFor(s: InternalState, f: FighterState): Held {
  if (f.side === "player") {
    return { dir: s.playerCtl.dir, crouch: s.playerCtl.crouchHeld, block: s.playerCtl.blockHeld, speedMult: 1 };
  }
  if (s.aiEnabled) {
    const speedMult = s.config.phases[s.phaseIndex].ai.moveSpeedMult;
    return { dir: s.bossCtl.dir, crouch: s.bossCtl.crouchHeld, block: s.bossCtl.blockHeld, speedMult };
  }
  // AI off: persist whatever a test set directly on the FighterState.
  return { dir: 0, crouch: f.crouching, block: f.blocking, speedMult: 1 };
}

// --- starting actions ------------------------------------------------------

function canAct(f: FighterState): boolean {
  return (
    f.stunTimer <= 0 &&
    f.action !== "attack" &&
    f.action !== "knockdown" &&
    f.action !== "ko" &&
    f.action !== "hitstun" &&
    f.action !== "blockstun"
  );
}

function startBufferedActions(s: InternalState, f: FighterState, ctl: Control, dt: number): void {
  const buf = ctl.buffered;
  if (buf.timer > 0) {
    buf.timer -= dt * 1000;
    if (buf.timer <= 0) {
      buf.attack = null;
      buf.jump = false;
      buf.special = false;
    }
  }
  if (!canAct(f)) return;

  if (buf.special) {
    if (startSpecial(s, f, ctl)) {
      buf.special = false;
      buf.attack = null;
      buf.jump = false;
      return;
    }
  }
  if (buf.attack) {
    const stance: MoveStance = !f.onGround ? "air" : f.crouching ? "crouch" : "stand";
    // Direction held relative to the opponent picks the standing variant:
    // toward = heavy/forward (guard-break), neutral = light, away = poke.
    const dir = attackDirOf(ctl.dir, f.facing);
    const base = resolveMove(stance, dir, buf.attack);
    startMove(f, ctl, base);
    buf.attack = null;
    buf.jump = false;
    return;
  }
  if (buf.jump && f.onGround && !f.crouching) {
    f.vy = JUMP_VELOCITY;
    f.onGround = false;
    f.action = "jump";
    buf.jump = false;
  }
}

function startMove(f: FighterState, ctl: Control, base: AttackMove): void {
  f.move = resolveAttack(base, ctl.scale);
  f.action = "attack";
  f.movePhase = "startup";
  f.actionTimer = 0;
  f.hitThisMove = false;
}

function startSpecial(s: InternalState, f: FighterState, ctl: Control): boolean {
  if (f.side !== "player") return false;
  if (!s.stats.specialUnlocked) return false;
  if (f.meter < 1) return false;
  const upgraded = s.stats.specialUpgraded;
  const specialScale: MoveScale = {
    attackSpeed: ctl.scale.attackSpeed,
    reachPx: ctl.scale.reachPx + SPECIAL_REACH_BONUS,
    damageMult: 1,
    meterPerHit: 0,
  };
  const resolved = resolveAttack(MOVES.special, specialScale);
  // Damage scales off the weapon's reference heavy damage, not the table base.
  resolved.baseDamage = s.stats.heavyDamage * (upgraded ? 2.4 : 1.9);
  f.move = resolved;
  f.action = "attack";
  f.movePhase = "startup";
  f.actionTimer = 0;
  f.hitThisMove = false;
  f.meter = 0;
  s.specialsUsed += 1;
  s.flash = Math.max(s.flash, 0.7);
  setBanner(s, s.weapon.special);
  spawnSpark(s, f.x + f.facing * BODY_HALF, 70, "special");
  return true;
}

// --- per-fighter update ----------------------------------------------------

function updateFighter(f: FighterState, held: Held, dt: number): void {
  // Tick down stun and recover.
  if (f.stunTimer > 0) {
    f.stunTimer -= dt * 1000;
    if (f.stunTimer <= 0) {
      f.stunTimer = 0;
      if (f.action === "hitstun" || f.action === "blockstun" || f.action === "knockdown") {
        f.action = f.onGround ? "idle" : "jump";
      }
    }
  }

  const actionable = canAct(f);

  // Held stance (crouch / block) only while grounded and free to move.
  if (actionable && f.onGround) {
    f.crouching = held.crouch;
    f.blocking = held.block;
  } else if (!f.onGround) {
    f.crouching = false;
  }

  // Horizontal locomotion.
  if (actionable && f.onGround && !f.crouching) {
    if (held.dir !== 0) {
      f.vx = held.dir * WALK_SPEED * held.speedMult;
      if (f.action === "idle") f.action = "walk";
    } else {
      f.vx *= GROUND_FRICTION;
      if (Math.abs(f.vx) < 4) f.vx = 0;
      if (f.action === "walk") f.action = "idle";
    }
  } else if (!f.onGround) {
    if (held.dir !== 0) f.vx += held.dir * AIR_CONTROL * dt;
    f.vx *= AIR_DRAG;
  } else if (f.action !== "attack") {
    // Crouching / guarding: bleed off residual ground velocity.
    f.vx *= GROUND_FRICTION;
    if (Math.abs(f.vx) < 4) f.vx = 0;
  }

  f.x += f.vx * dt;

  // Gravity / ground contact.
  if (!f.onGround) {
    f.vy -= GRAVITY * dt;
    f.y += f.vy * dt;
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
      f.onGround = true;
      if (f.action === "jump") f.action = "idle";
    }
  }

  advanceMove(f, dt);
}

function advanceMove(f: FighterState, dt: number): void {
  if (f.action !== "attack" || !f.move) return;
  f.actionTimer += dt * 1000;
  const m = f.move;
  if (f.movePhase === "startup") {
    if (f.actionTimer >= m.startupMs) {
      f.movePhase = "active";
      f.actionTimer = 0;
      f.hitThisMove = false;
    }
  } else if (f.movePhase === "active") {
    if (f.actionTimer >= m.activeMs) {
      f.movePhase = "recovery";
      f.actionTimer = 0;
    }
  } else if (f.movePhase === "recovery") {
    if (f.actionTimer >= m.recoveryMs) {
      f.action = f.onGround ? "idle" : "jump";
      f.move = null;
      f.movePhase = null;
      f.actionTimer = 0;
    }
  }
}

// --- hit resolution --------------------------------------------------------

type HitOutcome = "whiff" | "block" | "hit";

/**
 * Pure block/height read: given an attack height and the victim's stance, does
 * the strike whiff (wrong height for the stance), get blocked (guard covers the
 * height), or connect? Standing guard stops high/mid/overhead but loses to lows;
 * crouch guard stops low/mid but loses to overheads; a high strike sails over a
 * croucher; lows and mids miss an airborne victim.
 */
export function defendOutcome(
  height: AttackMove["height"],
  victimBlocking: boolean,
  victimCrouching: boolean,
  victimAirborne: boolean,
): HitOutcome {
  if (victimAirborne) {
    if (height === "low" || height === "mid") return "whiff";
    return "hit"; // block doesn't apply meaningfully mid-air
  }
  if (victimCrouching) {
    if (height === "high") return "whiff"; // ducked under
    if (victimBlocking) {
      // Crouch guard covers low + mid; overhead beats it.
      return height === "overhead" ? "hit" : "block";
    }
    return "hit";
  }
  // Standing.
  if (victimBlocking) {
    // Standing guard covers high / mid / overhead; lows beat it.
    return height === "low" ? "hit" : "block";
  }
  return "hit";
}

function resolveHits(s: InternalState, attacker: FighterState, victim: FighterState): void {
  if (attacker.action !== "attack" || attacker.movePhase !== "active") return;
  if (attacker.hitThisMove || !attacker.move) return;

  const m = attacker.move;
  const facing = attacker.facing;
  const front = attacker.x + facing * BODY_HALF;
  const reach = m.baseReachPx;
  // Horizontal gap from the attacker's front to the victim center, in the
  // direction the attacker faces.
  const gap = (victim.x - front) * facing;
  if (gap < -BODY_HALF || gap > reach + BODY_HALF) return;

  const victimAirborne = !victim.onGround && victim.y > 18;
  if (victimAirborne && victim.y > AIR_HITTABLE_MAX) return;

  const outcome = defendOutcome(m.height, victim.blocking, victim.crouching, victimAirborne);
  if (outcome === "whiff") return;

  attacker.hitThisMove = true;

  const sparkX = (front + victim.x) / 2;
  const sparkY = victimAirborne ? victim.y + 50 : victim.crouching ? 40 : 64;

  if (outcome === "block") {
    // GUARD BREAK: a heavy/forward strike the guard *covers* smashes through it
    // instead of being chipped — real (reduced) damage, a long stagger, heavy
    // pushback + flash, and the victim's block is knocked open. The height read
    // still applies first (a heavy the guard does NOT cover already resolves to
    // a clean hit via defendOutcome, e.g. an overhead vs a crouch guard).
    if (m.strength === "heavy") {
      const dmg = Math.max(1, Math.round(m.baseDamage * GUARD_BREAK_DAMAGE_FRAC * mult(s, attacker)));
      victim.hp = Math.max(0, victim.hp - dmg);
      victim.blocking = false;
      victim.combo = 0;
      setStun(victim, "blockstun", m.blockstunMs * GUARD_BREAK_STUN_MULT);
      applyPushback(victim, facing, m.pushbackPx * GUARD_BREAK_PUSHBACK_FRAC);

      attacker.combo += 1;
      if (attacker.side === "player" && attacker.combo > s.maxCombo) s.maxCombo = attacker.combo;
      attacker.meter = Math.min(1, attacker.meter + m.meterGain * 0.75);

      if (attacker.side === "player") {
        s.hitsLanded += 1;
        trackDealt(s, dmg);
        setBanner(s, "Guard Break!");
      } else {
        s.hitsTaken += 1;
      }

      spawnSpark(s, sparkX, sparkY, "hit");
      s.shake = Math.max(s.shake, 0.95);
      s.flash = Math.max(s.flash, 0.5);
      if (victim.hp <= 0) onKo(s, victim);
      return;
    }

    // Light blocked — small chip + blockstun, safe but cedes initiative.
    const chip = Math.max(0, Math.round(m.baseDamage * BLOCK_CHIP_FRAC * mult(s, attacker)));
    if (chip > 0) victim.hp = Math.max(0, victim.hp - chip);
    setStun(victim, "blockstun", m.blockstunMs);
    applyPushback(victim, facing, m.pushbackPx * 0.4);
    attacker.combo = 0;
    attacker.meter = Math.min(1, attacker.meter + m.meterGain * 0.3);
    spawnSpark(s, sparkX, sparkY, "block");
    s.shake = Math.max(s.shake, 0.2);
    if (victim.side === "boss") trackDealt(s, chip);
    if (victim.hp <= 0) onKo(s, victim);
    return;
  }

  // Clean hit.
  const dmg = Math.max(1, Math.round(m.baseDamage * mult(s, attacker)));
  victim.hp = Math.max(0, victim.hp - dmg);
  victim.combo = 0;
  setStun(victim, m.knockdown ? "knockdown" : "hitstun", m.hitstunMs);
  applyPushback(victim, facing, m.pushbackPx);
  if (m.knockdown && victim.onGround) {
    victim.vy = JUMP_VELOCITY * 0.35;
    victim.onGround = false;
  }

  attacker.combo += 1;
  if (attacker.side === "player" && attacker.combo > s.maxCombo) s.maxCombo = attacker.combo;
  attacker.meter = Math.min(1, attacker.meter + m.meterGain);

  if (attacker.side === "player") {
    s.hitsLanded += 1;
    trackDealt(s, dmg);
    if (attacker.combo >= 3 && attacker.combo % 3 === 0) setBanner(s, `${attacker.combo} Combo!`);
  } else {
    s.hitsTaken += 1;
  }

  spawnSpark(s, sparkX, sparkY, "hit");
  s.shake = Math.max(s.shake, m.strength === "heavy" ? 0.85 : 0.4);
  if (m.strength === "heavy") s.flash = Math.max(s.flash, 0.4);

  if (victim.hp <= 0) onKo(s, victim);
}

/** Outgoing damage multiplier — bosses scale by their difficulty bossDamageMult. */
function mult(s: InternalState, attacker: FighterState): number {
  return attacker.side === "boss" ? s.bossCtl.bossDamageMult : 1;
}

function trackDealt(s: InternalState, dmg: number): void {
  s.damageDealt += dmg;
}

function setStun(f: FighterState, action: FighterState["action"], ms: number): void {
  f.action = action;
  f.stunTimer = ms;
  f.move = null;
  f.movePhase = null;
  f.hitThisMove = false;
  f.actionTimer = 0;
}

function applyPushback(f: FighterState, attackerFacing: 1 | -1, px: number): void {
  f.x += attackerFacing * px;
}

// --- KO + phase transitions ------------------------------------------------

function onKo(s: InternalState, victim: FighterState): void {
  if (victim.side === "boss") {
    spawnSpark(s, victim.x, 64, "ko");
    s.flash = Math.max(s.flash, 0.8);
    if (s.phaseIndex < s.config.phases.length - 1) {
      advancePhase(s);
    } else {
      victim.action = "ko";
      s.combatPhase = "victory";
      s.phaseTimer = 0;
      s.result = "win";
      setBanner(s, "Victory!");
      s.score = liveScore(s);
    }
  } else {
    victim.action = "ko";
    s.combatPhase = "defeat";
    s.phaseTimer = 0;
    s.result = "lose";
    setBanner(s, "Defeat");
    s.score = liveScore(s);
  }
}

function advancePhase(s: InternalState): void {
  s.phaseIndex += 1;
  const phase = s.config.phases[s.phaseIndex];
  const boss = s.boss;
  boss.hp = phase.hp;
  boss.maxHp = phase.hp;
  boss.action = "idle";
  boss.move = null;
  boss.movePhase = null;
  boss.stunTimer = 0;
  boss.combo = 0;
  s.bossCtl.bossDamageMult = difficultyDamage(s.config, s.phaseIndex);
  s.ai.comboLeft = 0;
  s.ai.decisionMs = 0;
  s.flash = Math.max(s.flash, 0.9);
  s.banner = "Phase down!";
  s.bannerTimer = PHASE_BANNER_S;
}

// BossAIProfile has no damage mult; the registry stores it on DifficultyParams.
// For phase transitions we recompute it from the curve index so the finale's
// later phases hit harder without threading extra config through.
function difficultyDamage(config: BossConfig, phaseIndex: number): number {
  return 1 + 0.05 * (config.index - 1 + phaseIndex);
}

// --- bounds + facing -------------------------------------------------------

function resolveBounds(s: InternalState): void {
  const lo = LEFT_WALL + BODY_HALF;
  const hi = RIGHT_WALL - BODY_HALF;
  const p = s.player;
  const b = s.boss;

  // Body overlap pushout (horizontal only).
  const dx = b.x - p.x;
  const dist = Math.abs(dx);
  if (dist < MIN_SEPARATION) {
    const overlap = MIN_SEPARATION - dist;
    const dir = dx >= 0 ? 1 : -1;
    p.x -= (dir * overlap) / 2;
    b.x += (dir * overlap) / 2;
  }

  p.x = clamp(p.x, lo, hi);
  b.x = clamp(b.x, lo, hi);
}

function faceOpponent(f: FighterState, opp: FighterState): void {
  if (!canAct(f) || !f.onGround) return;
  if (opp.x > f.x + 1) f.facing = 1;
  else if (opp.x < f.x - 1) f.facing = -1;
}

// --- boss AI ---------------------------------------------------------------

function bossThink(s: InternalState, dt: number): void {
  const boss = s.boss;
  const player = s.player;
  const ctl = s.bossCtl;
  const ai = s.ai;
  const profile = s.config.phases[s.phaseIndex].ai;

  // Running read of how much the player turtles — biases toward guard-breaks.
  const playerGuarding = player.blocking && player.onGround;
  ai.guardReads = clamp(ai.guardReads + (playerGuarding ? 0.06 : -0.03), 0, 1);

  if (!canAct(boss)) {
    ctl.dir = 0;
    return;
  }

  const dist = Math.abs(player.x - boss.x);
  const attackReach = MOVES.kickLight.baseReachPx + ctl.scale.reachPx + BODY_HALF * 2;
  const hpFrac = boss.maxHp > 0 ? boss.hp / boss.maxHp : 1;
  const ms = dt * 1000;

  // --- reaction-gated block read against the player's swing -----------------
  const playerThreatening =
    player.action === "attack" &&
    (player.movePhase === "startup" || player.movePhase === "active") &&
    dist < attackReach + 30;

  if (playerThreatening) {
    if (!ai.threatSeen) {
      ai.threatSeen = true;
      ai.reactMs = profile.reactionMs;
    } else if (ai.reactMs > 0) {
      ai.reactMs -= ms;
      if (ai.reactMs <= 0 && nextRand(s) < profile.blockChance) {
        ctl.blockHeld = true;
        // Guard the correct height: crouch-block lows, stand-block otherwise.
        ctl.crouchHeld = player.move?.height === "low";
        ctl.dir = 0;
        return;
      }
    } else if (ctl.blockHeld) {
      ctl.dir = 0;
      return; // keep holding the read guard
    }
  } else {
    ai.threatSeen = false;
    ctl.blockHeld = false;
    ctl.crouchHeld = false;
  }

  // --- decision cadence -----------------------------------------------------
  if (ai.decisionMs > 0) {
    ai.decisionMs -= ms;
    // Continue approaching/retreating with the last decision's held dir.
    return;
  }
  ai.decisionMs = profile.reactionMs * AI_CADENCE_MULT * (0.75 + nextRand(s) * 0.5);

  const inRange = dist <= attackReach;
  const tooClose = dist < profile.preferredRangePx - 20;
  const tooFar = dist > profile.preferredRangePx + 24;
  const towardPlayer: -1 | 1 = player.x >= boss.x ? 1 : -1;

  // Mid-string: keep the pressure on with fast lights while willing + in range.
  if (ai.comboLeft > 0 && inRange && nextRand(s) < profile.aggression + 0.1) {
    ai.comboLeft -= 1;
    bossAttack(s, false);
    return;
  }

  // Only badly hurt bosses consider backing off, and even then rarely.
  if (hpFrac < 0.25 && nextRand(s) < 0.3) {
    if (nextRand(s) < profile.blockChance) {
      ctl.blockHeld = true;
      ctl.dir = 0;
    } else {
      ctl.dir = -towardPlayer as -1 | 1;
    }
    return;
  }

  if (tooFar) {
    ctl.dir = towardPlayer;
    if (nextRand(s) < profile.jumpChance && dist < attackReach + 120 && boss.onGround) {
      boss.vy = JUMP_VELOCITY;
      boss.onGround = false;
      boss.action = "jump";
    }
    return;
  }

  if (inRange && nextRand(s) < profile.aggression) {
    ctl.blockHeld = false;
    // Open a fresh string; the opener may go heavy to break the player's guard.
    ai.comboLeft = Math.max(0, profile.comboLength - 1);
    bossAttack(s, true);
    return;
  }

  if (tooClose) {
    ctl.dir = -towardPlayer as -1 | 1;
    return;
  }

  // Default: press toward the player more often than holding ground.
  ctl.dir = nextRand(s) < 0.7 ? towardPlayer : 0;
}

/**
 * Drive the boss through the SAME directional resolver the player uses. An
 * `opener` may commit to a heavy/forward guard-break (more likely the meaner
 * the boss is and the more the player has been blocking); mid-string attacks
 * stay light/fast. Airborne -> air overhead, crouch picks -> a low.
 */
function bossAttack(s: InternalState, opener: boolean): void {
  const boss = s.boss;
  const ctl = s.bossCtl;
  if (!canAct(boss)) return;
  const player = s.player;
  const profile = s.config.phases[s.phaseIndex].ai;
  const ai = s.ai;

  // Jump-in: overhead air attack while airborne.
  if (!boss.onGround) {
    boss.crouching = false;
    ctl.crouchHeld = false;
    ctl.dir = 0;
    const atk: AttackKind = nextRand(s) < 0.5 ? "kick" : "punch";
    startMove(boss, ctl, resolveMove("air", "neutral", atk));
    return;
  }

  const playerGuarding = player.blocking && player.onGround;
  const playerCrouchGuard = playerGuarding && player.crouching;

  // Guard-break (heavy/forward) probability — climbs with aggression, how much
  // the player turtles, and whether they are blocking right now.
  const heavyChance = opener
    ? clamp(
        0.18 + profile.aggression * 0.35 + ai.guardReads * 0.4 + (playerGuarding ? 0.25 : 0),
        0,
        0.95,
      )
    : 0;

  let stance: MoveStance = "stand";
  let dir: AttackDir = "neutral";
  let attack: AttackKind = "punch";

  if (nextRand(s) < heavyChance) {
    dir = "forward";
    // Against a crouch-blocker, the overhead punch beats the guard outright;
    // otherwise the mid forward kick is the reliable guard-breaker.
    attack = playerCrouchGuard ? "punch" : nextRand(s) < 0.5 ? "punch" : "kick";
  } else {
    const r = nextRand(s);
    if (r < 0.25) {
      stance = "crouch"; // low jab / sweep
      attack = nextRand(s) < 0.5 ? "kick" : "punch";
    } else {
      attack = r < 0.65 ? "punch" : "kick";
    }
  }

  boss.crouching = stance === "crouch";
  ctl.crouchHeld = stance === "crouch";
  ctl.dir = dir === "forward" ? boss.facing : 0;
  startMove(boss, ctl, resolveMove(stance, dir, attack));
}

// --- scoring ---------------------------------------------------------------

function liveScore(s: InternalState): number {
  const hpFrac = s.player.maxHp > 0 ? s.player.hp / s.player.maxHp : 0;
  const base =
    s.damageDealt +
    s.maxCombo * 20 +
    s.specialsUsed * 40 +
    hpFrac * 220 -
    s.hitsTaken * 15;
  return Math.max(0, Math.round(base * s.tier));
}

// --- effects + helpers -----------------------------------------------------

function spawnSpark(s: InternalState, x: number, y: number, kind: HitSpark["kind"]): void {
  if (s.hitSparks.length >= MAX_SPARKS) s.hitSparks.shift();
  const life = kind === "ko" || kind === "special" ? 0.5 : 0.28;
  const size = kind === "ko" ? 34 : kind === "special" ? 30 : kind === "block" ? 16 : 22;
  s.hitSparks.push({ x, y, life, maxLife: life, size, kind });
}

function setBanner(s: InternalState, text: string): void {
  s.banner = text;
  s.bannerTimer = BANNER_S;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Mulberry32: a fast, deterministic 32-bit PRNG. Advances state.rngState. */
function nextRand(s: InternalState): number {
  s.rngState = (s.rngState + 0x6d2b79f5) | 0;
  let t = s.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
