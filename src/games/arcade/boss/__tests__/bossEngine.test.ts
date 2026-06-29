import { describe, expect, it } from "vitest";

import { difficultyFor } from "../bossDifficulty";
import {
  FIXED_DT,
  LEFT_WALL,
  RIGHT_WALL,
  ARENA_WIDTH,
  MOVES,
  applyIntent,
  attackDirOf,
  createCombat,
  defendOutcome,
  resolveMove,
  starsFor,
  stepCombat,
} from "../bossEngine";
import type { BossAIProfile, BossConfig, CombatState, WeaponConfig } from "../bossTypes";

const DT = FIXED_DT;

// --- fixtures --------------------------------------------------------------

function makeWeapon(overrides: Partial<WeaponConfig> = {}): WeaponConfig {
  return {
    id: "test-weapon",
    lessonId: "test-lesson",
    name: "Test Weapon",
    archetype: "balanced",
    special: "Test Nova",
    baseLightDamage: 10,
    baseHeavyDamage: 25,
    baseReachPx: 50,
    ...overrides,
  };
}

function makeAi(overrides: Partial<BossAIProfile> = {}): BossAIProfile {
  return {
    aggression: 0.5,
    reactionMs: 280,
    blockChance: 0.25,
    jumpChance: 0.1,
    preferredRangePx: 110,
    comboLength: 2,
    moveSpeedMult: 1,
    ...overrides,
  };
}

function makeConfig(opts: { hp?: number; index?: number; ai?: Partial<BossAIProfile> } = {}): BossConfig {
  return {
    id: "test-boss",
    lessonId: "test-lesson",
    index: opts.index ?? 1,
    name: "Testor",
    title: "the Test",
    taunt: "test",
    visual: { shape: "slopeWraith", primary: "#fff", secondary: "#000", accent: "#aaa" },
    phases: [{ hp: opts.hp ?? 200, ai: makeAi(opts.ai) }],
    musicTrack: "boss",
  };
}

// --- helpers ---------------------------------------------------------------

function step(state: CombatState, frames: number): void {
  for (let i = 0; i < frames; i++) stepCombat(state, DT);
}

function stepUntil(state: CombatState, pred: (s: CombatState) => boolean, maxSteps = 8000): void {
  for (let i = 0; i < maxSteps; i++) {
    if (pred(state)) return;
    stepCombat(state, DT);
  }
  if (!pred(state)) {
    throw new Error(`stepUntil exhausted ${maxSteps} steps in phase ${state.combatPhase}`);
  }
}

function enterFight(state: CombatState): void {
  stepUntil(state, (s) => s.combatPhase === "fighting");
}

/** Park the two fighters adjacent and in striking range, AI-off only. */
function face(state: CombatState, gap = 60): void {
  state.player.x = 320;
  state.boss.x = 320 + gap;
  state.player.facing = 1;
  state.boss.facing = -1;
  state.player.vx = 0;
  state.boss.vx = 0;
}

/** Wait until the player has actually committed a move, and return its id. */
function startedMoveId(state: CombatState): string {
  stepUntil(state, (s) => s.player.action === "attack" && s.player.move !== null, 40);
  return state.player.move!.id;
}

// --- exports / arena contract ----------------------------------------------

describe("bossEngine arena contract", () => {
  it("keeps the LEFT_WALL / RIGHT_WALL / ARENA_WIDTH exports stable", () => {
    expect(ARENA_WIDTH).toBeGreaterThan(0);
    expect(LEFT_WALL).toBeGreaterThanOrEqual(0);
    expect(RIGHT_WALL).toBeGreaterThan(LEFT_WALL);
    expect(RIGHT_WALL).toBeLessThan(ARENA_WIDTH);
  });
});

// --- directional resolver (pure) -------------------------------------------

describe("attackDirOf", () => {
  it("maps the held direction relative to facing", () => {
    expect(attackDirOf(0, 1)).toBe("neutral");
    expect(attackDirOf(1, 1)).toBe("forward"); // holding toward (facing right)
    expect(attackDirOf(-1, 1)).toBe("back"); // holding away
    expect(attackDirOf(-1, -1)).toBe("forward"); // toward (facing left)
    expect(attackDirOf(1, -1)).toBe("back");
  });
});

describe("resolveMove", () => {
  it("neutral standing = light: punch is a high jab, kick is a mid", () => {
    const p = resolveMove("stand", "neutral", "punch");
    expect(p.id).toBe("punchLight");
    expect(p.strength).toBe("light");
    expect(p.height).toBe("high");

    const k = resolveMove("stand", "neutral", "kick");
    expect(k.id).toBe("kickLight");
    expect(k.strength).toBe("light");
    expect(k.height).toBe("mid");
  });

  it("holding TOWARD = heavy guard-breaking forward variants", () => {
    const p = resolveMove("stand", "forward", "punch");
    expect(p.id).toBe("punchHeavy");
    expect(p.strength).toBe("heavy");
    expect(p.height).toBe("overhead"); // beats a crouch guard / breaks a stand guard

    const k = resolveMove("stand", "forward", "kick");
    expect(k.id).toBe("kickHeavy");
    expect(k.strength).toBe("heavy");
    expect(k.height).toBe("mid"); // covered by both guards => reliable guard-break
    expect(k.knockdown).toBe(true);
  });

  it("holding AWAY = longer-reach light pokes", () => {
    const p = resolveMove("stand", "back", "punch");
    expect(p.id).toBe("punchPoke");
    expect(p.strength).toBe("light");

    const k = resolveMove("stand", "back", "kick");
    expect(k.id).toBe("kickPoke");
    expect(k.strength).toBe("light");
    // The teep is the longest-reaching poke.
    expect(k.baseReachPx).toBeGreaterThan(MOVES.kickLight.baseReachPx);
  });

  it("crouch = lows (dir ignored); kick sweep knocks down", () => {
    for (const dir of ["neutral", "forward", "back"] as const) {
      expect(resolveMove("crouch", dir, "punch").id).toBe("crouchPunch");
      expect(resolveMove("crouch", dir, "kick").id).toBe("crouchKick");
    }
    expect(resolveMove("crouch", "neutral", "punch").height).toBe("low");
    expect(resolveMove("crouch", "neutral", "kick").height).toBe("low");
    expect(resolveMove("crouch", "neutral", "kick").knockdown).toBe(true);
  });

  it("airborne = overheads (dir ignored)", () => {
    for (const dir of ["neutral", "forward", "back"] as const) {
      expect(resolveMove("air", dir, "punch").height).toBe("overhead");
      expect(resolveMove("air", dir, "kick").height).toBe("overhead");
    }
    expect(resolveMove("air", "neutral", "punch").id).toBe("airPunch");
    expect(resolveMove("air", "neutral", "kick").id).toBe("airKick");
  });
});

// --- defendOutcome (pure block/height read) --------------------------------

describe("defendOutcome", () => {
  it("standing guard stops high/mid/overhead but loses to lows", () => {
    expect(defendOutcome("high", true, false, false)).toBe("block");
    expect(defendOutcome("mid", true, false, false)).toBe("block");
    expect(defendOutcome("overhead", true, false, false)).toBe("block");
    expect(defendOutcome("low", true, false, false)).toBe("hit");
  });

  it("crouch guard stops low/mid, loses to overhead, and ducks highs", () => {
    expect(defendOutcome("low", true, true, false)).toBe("block");
    expect(defendOutcome("mid", true, true, false)).toBe("block");
    expect(defendOutcome("overhead", true, true, false)).toBe("hit");
    expect(defendOutcome("high", true, true, false)).toBe("whiff");
  });

  it("airborne victims float over lows and mids", () => {
    expect(defendOutcome("low", false, false, true)).toBe("whiff");
    expect(defendOutcome("mid", false, false, true)).toBe("whiff");
    expect(defendOutcome("overhead", false, false, true)).toBe("hit");
  });

  it("an unguarded standing victim eats everything", () => {
    expect(defendOutcome("high", false, false, false)).toBe("hit");
    expect(defendOutcome("low", false, false, false)).toBe("hit");
  });
});

// --- directional moves through applyIntent ---------------------------------

describe("applyIntent directional moves", () => {
  it("neutral + punch resolves to a light high jab", () => {
    const state = createCombat({ config: makeConfig(), weapon: makeWeapon(), tier: 1, aiEnabled: false });
    enterFight(state);
    face(state);
    applyIntent(state, { kind: "move", dir: 0 });
    applyIntent(state, { kind: "attack", attack: "punch" });
    expect(startedMoveId(state)).toBe("punchLight");
    expect(state.player.move!.height).toBe("high");
    expect(state.player.move!.strength).toBe("light");
  });

  it("holding toward the opponent + punch resolves to the heavy overhead", () => {
    const state = createCombat({ config: makeConfig(), weapon: makeWeapon(), tier: 1, aiEnabled: false });
    enterFight(state);
    face(state);
    applyIntent(state, { kind: "move", dir: 1 }); // toward the boss (facing right)
    applyIntent(state, { kind: "attack", attack: "punch" });
    expect(startedMoveId(state)).toBe("punchHeavy");
    expect(state.player.move!.strength).toBe("heavy");
    expect(state.player.move!.height).toBe("overhead");
  });

  it("crouch + kick resolves to the low sweep and knocks an open boss down", () => {
    const state = createCombat({ config: makeConfig(), weapon: makeWeapon(), tier: 1, aiEnabled: false });
    enterFight(state);
    face(state);
    state.boss.blocking = false;
    applyIntent(state, { kind: "crouch", pressed: true });
    step(state, 3); // let the crouch stance settle
    expect(state.player.crouching).toBe(true);

    const before = state.boss.hp;
    applyIntent(state, { kind: "attack", attack: "kick" });
    expect(startedMoveId(state)).toBe("crouchKick");
    expect(state.player.move!.height).toBe("low");

    stepUntil(state, (s) => s.boss.hp < before, 80);
    expect(before - state.boss.hp).toBeGreaterThan(5);
    expect(state.boss.action).toBe("knockdown");
  });

  it("airborne + attack resolves to an overhead air strike", () => {
    const state = createCombat({ config: makeConfig(), weapon: makeWeapon(), tier: 1, aiEnabled: false });
    enterFight(state);
    face(state);
    applyIntent(state, { kind: "jump" });
    stepUntil(state, (s) => !s.player.onGround && s.player.y > 8, 20);
    applyIntent(state, { kind: "attack", attack: "kick" });
    expect(startedMoveId(state)).toBe("airKick");
    expect(state.player.move!.height).toBe("overhead");
    expect(state.player.onGround).toBe(false);
  });
});

// --- hitting / blocking + guard break --------------------------------------

describe("bossEngine strikes", () => {
  it("a light attack in range damages an unguarded boss and builds combo + meter", () => {
    const state = createCombat({ config: makeConfig(), weapon: makeWeapon(), tier: 1, aiEnabled: false });
    enterFight(state);
    face(state);
    state.boss.blocking = false;

    const before = state.boss.hp;
    applyIntent(state, { kind: "attack", attack: "punch" });
    stepUntil(state, (s) => s.boss.hp < before || s.player.combo > 0, 60);

    expect(state.boss.hp).toBeLessThan(before);
    expect(state.player.combo).toBeGreaterThanOrEqual(1);
    expect(state.player.meter).toBeGreaterThan(0);
    expect(state.maxCombo).toBeGreaterThanOrEqual(1);
    expect(state.hitsLanded).toBeGreaterThanOrEqual(1);
  });

  it("a LIGHT attack into a standing block chips + blockstuns, leaving the guard up", () => {
    const state = createCombat({ config: makeConfig(), weapon: makeWeapon(), tier: 1, aiEnabled: false });
    enterFight(state);
    face(state);
    state.boss.blocking = true; // standing guard
    state.boss.crouching = false;

    const before = state.boss.hp;
    // Neutral punch = light high; standing guard covers it.
    applyIntent(state, { kind: "move", dir: 0 });
    applyIntent(state, { kind: "attack", attack: "punch" });
    stepUntil(state, (s) => s.boss.action === "blockstun", 60);

    expect(state.boss.action).toBe("blockstun");
    expect(before - state.boss.hp).toBeLessThanOrEqual(2); // chip only
    expect(state.boss.blocking).toBe(true); // a light does NOT break the guard
  });

  it("a HEAVY/forward attack into a standing block is a GUARD BREAK", () => {
    const state = createCombat({ config: makeConfig(), weapon: makeWeapon(), tier: 1, aiEnabled: false });
    enterFight(state);
    face(state);
    state.boss.blocking = true; // standing guard covers the overhead...
    state.boss.crouching = false;

    const before = state.boss.hp;
    applyIntent(state, { kind: "move", dir: 1 }); // toward => heavy overhead
    applyIntent(state, { kind: "attack", attack: "punch" });
    stepUntil(state, (s) => s.boss.action === "blockstun", 80);

    // Real (reduced) damage — far more than a chip.
    expect(before - state.boss.hp).toBeGreaterThan(5);
    // ...but the guard is smashed open and the victim is staggered.
    expect(state.boss.blocking).toBe(false);
    expect(state.boss.action).toBe("blockstun");
    expect(state.boss.stunTimer).toBeGreaterThan(MOVES.punchHeavy.blockstunMs);
  });

  it("a low attack beats a standing guard", () => {
    const state = createCombat({ config: makeConfig(), weapon: makeWeapon(), tier: 1, aiEnabled: false });
    enterFight(state);
    face(state);
    state.boss.blocking = true;
    state.boss.crouching = false; // standing

    const before = state.boss.hp;
    applyIntent(state, { kind: "crouch", pressed: true });
    step(state, 3);
    applyIntent(state, { kind: "attack", attack: "kick" }); // crouch low sweep
    stepUntil(state, (s) => s.boss.hp < before, 80);

    expect(before - state.boss.hp).toBeGreaterThan(5); // full hit, not chip
    expect(state.boss.action).toBe("knockdown");
  });

  it("an overhead beats a crouch guard", () => {
    const state = createCombat({ config: makeConfig(), weapon: makeWeapon(), tier: 1, aiEnabled: false });
    enterFight(state);
    face(state);
    state.boss.blocking = true;
    state.boss.crouching = true; // crouch guard

    const before = state.boss.hp;
    applyIntent(state, { kind: "move", dir: 1 }); // toward => heavy overhead
    applyIntent(state, { kind: "attack", attack: "punch" });
    stepUntil(state, (s) => s.boss.hp < before, 80);

    expect(before - state.boss.hp).toBeGreaterThan(5); // full overhead, not chip
  });
});

// --- physics ---------------------------------------------------------------

describe("bossEngine physics", () => {
  it("gravity carries a jumper up and back down to the ground", () => {
    const state = createCombat({ config: makeConfig(), weapon: makeWeapon(), tier: 1, aiEnabled: false });
    enterFight(state);
    applyIntent(state, { kind: "jump" });
    step(state, 8);
    expect(state.player.y).toBeGreaterThan(0);
    expect(state.player.onGround).toBe(false);

    stepUntil(state, (s) => s.player.onGround, 200);
    expect(state.player.y).toBe(0);
    expect(state.player.onGround).toBe(true);
  });

  it("clamps fighters inside the arena walls", () => {
    const state = createCombat({ config: makeConfig(), weapon: makeWeapon(), tier: 1, aiEnabled: false });
    enterFight(state);
    state.player.x = LEFT_WALL - 200;
    state.boss.x = RIGHT_WALL + 200;
    step(state, 2);
    expect(state.player.x).toBeGreaterThanOrEqual(LEFT_WALL);
    expect(state.player.x).toBeLessThanOrEqual(RIGHT_WALL);
    expect(state.boss.x).toBeLessThanOrEqual(RIGHT_WALL);
  });

  it("pushes overlapping bodies apart", () => {
    const state = createCombat({ config: makeConfig(), weapon: makeWeapon(), tier: 1, aiEnabled: false });
    enterFight(state);
    state.player.x = 360;
    state.boss.x = 366; // heavily overlapped
    step(state, 2);
    expect(Math.abs(state.boss.x - state.player.x)).toBeGreaterThanOrEqual(50);
  });
});

// --- meter + special -------------------------------------------------------

describe("bossEngine special", () => {
  it("fills the meter, fires the special once, and consumes it", () => {
    const state = createCombat({
      config: makeConfig({ hp: 6000 }),
      weapon: makeWeapon({ baseHeavyDamage: 26 }),
      tier: 3, // special unlocked
      aiEnabled: false,
    });
    enterFight(state);

    for (let i = 0; i < 80 && state.player.meter < 1; i++) {
      face(state);
      state.boss.blocking = false;
      applyIntent(state, { kind: "move", dir: 0 });
      applyIntent(state, { kind: "attack", attack: "punch" });
      step(state, 20);
    }
    expect(state.player.meter).toBeGreaterThanOrEqual(1);

    face(state);
    state.boss.blocking = false;
    const beforeSpecial = state.boss.hp;
    applyIntent(state, { kind: "special" });
    stepUntil(state, (s) => s.boss.hp < beforeSpecial, 60);
    const afterSpecial = state.boss.hp;

    expect(state.player.meter).toBe(0);
    expect(beforeSpecial - afterSpecial).toBeGreaterThan(30); // big hit

    // A second special with no meter does nothing.
    applyIntent(state, { kind: "special" });
    step(state, 30);
    expect(state.boss.hp).toBe(afterSpecial);
  });
});

// --- win / lose ------------------------------------------------------------

describe("bossEngine outcomes", () => {
  it("draining the boss to 0 HP wins", () => {
    const state = createCombat({
      config: makeConfig({ hp: 24 }),
      weapon: makeWeapon(),
      tier: 5,
      aiEnabled: false,
    });
    enterFight(state);
    for (let i = 0; i < 16 && state.result === null; i++) {
      face(state);
      state.boss.blocking = false;
      applyIntent(state, { kind: "move", dir: 0 });
      applyIntent(state, { kind: "attack", attack: "kick" });
      step(state, 22);
    }
    expect(state.result).toBe("win");
    expect(state.combatPhase).toBe("victory");
    expect(state.boss.hp).toBe(0);
    expect([1, 2, 3]).toContain(starsFor(state));
  });

  it("losing all player HP to an aggressive boss loses", () => {
    const state = createCombat({
      config: makeConfig({ hp: 4000, index: 10, ai: { aggression: 0.9, reactionMs: 160, blockChance: 0 } }),
      weapon: makeWeapon(),
      tier: 1,
    });
    // The player does nothing; the boss closes in and pummels.
    stepUntil(state, (s) => s.result !== null, 12000);
    expect(state.result).toBe("lose");
    expect(state.combatPhase).toBe("defeat");
    expect(state.player.hp).toBe(0);
  });
});

// --- harder AI -------------------------------------------------------------

describe("bossEngine AI activity", () => {
  it("a Boss 1 (default curve) presses attacks within a short window and lands on an idle player", () => {
    const d = difficultyFor(1);
    const state = createCombat({
      config: makeConfig({ hp: 4000, index: 1, ai: d.ai }),
      weapon: makeWeapon(),
      tier: 1,
      seed: 4242,
    });
    enterFight(state);

    let bossAttacked = false;
    // ~6 seconds is plenty for even the tutorial boss to engage.
    for (let i = 0; i < 360 && !state.result; i++) {
      if (state.boss.action === "attack") bossAttacked = true;
      stepCombat(state, DT);
    }

    expect(bossAttacked).toBe(true);
    // An idle, non-blocking player should be taking damage.
    expect(state.player.hp).toBeLessThan(state.player.maxHp);
    expect(state.hitsTaken).toBeGreaterThanOrEqual(1);
  });

  it("a heavier, blockier boss eventually guard-breaks a turtling player", () => {
    const d = difficultyFor(8);
    const state = createCombat({
      config: makeConfig({ hp: 6000, index: 8, ai: d.ai }),
      weapon: makeWeapon(),
      tier: 1,
      seed: 13,
    });
    enterFight(state);

    // The player just holds a standing guard the whole fight.
    applyIntent(state, { kind: "block", pressed: true });
    const before = state.player.hp;
    for (let i = 0; i < 1600 && !state.result; i++) {
      applyIntent(state, { kind: "block", pressed: true });
      stepCombat(state, DT);
    }
    // Heavies break the guard, so a pure turtle still bleeds real HP.
    expect(state.player.hp).toBeLessThan(before);
  });
});

// --- determinism -----------------------------------------------------------

describe("bossEngine determinism", () => {
  function runScripted(seed: number): CombatState {
    const state = createCombat({
      config: makeConfig({ hp: 320, index: 6, ai: { aggression: 0.6, blockChance: 0.3 } }),
      weapon: makeWeapon(),
      tier: 4,
      seed,
    });
    for (let frame = 0; frame < 2400; frame++) {
      if (state.result) break;
      if (state.combatPhase === "fighting") {
        const dist = Math.abs(state.boss.x - state.player.x);
        const idle = state.player.action === "idle" || state.player.action === "walk";
        if (dist > 120) {
          applyIntent(state, { kind: "move", dir: state.boss.x >= state.player.x ? 1 : -1 });
        } else if (idle) {
          applyIntent(state, { kind: "move", dir: 0 });
          applyIntent(state, { kind: "attack", attack: "punch" });
        }
      }
      stepCombat(state, DT);
    }
    return state;
  }

  it("same seed + scripted intents end identically", () => {
    const a = runScripted(1234);
    const b = runScripted(1234);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.boss.hp).toBe(b.boss.hp);
    expect(a.player.hp).toBe(b.player.hp);
    expect(a.rngState).toBe(b.rngState);
    expect(a.result).toBe(b.result);
    expect(a.score).toBe(b.score);
  });

  it("different seeds can diverge", () => {
    const a = runScripted(7);
    const b = runScripted(987654);
    expect(
      a.boss.hp !== b.boss.hp ||
        a.player.hp !== b.player.hp ||
        a.rngState !== b.rngState ||
        a.boss.x !== b.boss.x ||
        a.elapsed !== b.elapsed,
    ).toBe(true);
  });
});
