import { describe, it, expect } from "vitest";

import { drawScene } from "../bossRender";
import { allBosses } from "../bossRegistry";
import { makeLayout } from "../bossScene";
import type { BossScene, BossSceneParticle, BossScreen, FighterPose } from "../bossScene";
import type {
  AttackKind,
  AttackStrength,
  BossShape,
  FighterAction,
  HitHeight,
  HitSpark,
  MovePhase,
} from "../bossTypes";

// Faithful-enough CanvasRenderingContext2D stub: methods are no-ops and gradient
// factories return a stub gradient, BUT — like a real browser — any malformed
// color string (e.g. "rgb(NaN,…)") passed to addColorStop or assigned to a
// color property throws. This is what makes color-composition bugs (a double
// shade() producing NaN) surface in tests instead of only crashing in-browser.
function assertValidColor(where: string, value: unknown): void {
  if (typeof value !== "string") return; // gradients / patterns are objects
  if (value.length === 0 || value.includes("NaN") || value.includes("undefined")) {
    throw new SyntaxError(`Invalid color passed to ${where}: "${String(value)}"`);
  }
}

const COLOR_PROPS = new Set(["fillStyle", "strokeStyle", "shadowColor"]);

function makeCtx(): CanvasRenderingContext2D {
  const gradient = {
    addColorStop(_offset: number, color: string) {
      assertValidColor("addColorStop", color);
    },
  };
  const target: Record<string, unknown> = {
    canvas: { width: 390, height: 720 },
    globalAlpha: 1,
  };
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(t, prop: string) {
      if (
        prop === "createLinearGradient" ||
        prop === "createRadialGradient" ||
        prop === "createConicGradient"
      ) {
        return () => gradient;
      }
      if (prop === "measureText") return () => ({ width: 24 });
      if (prop in t) return t[prop];
      return () => {};
    },
    set(t, prop: string, value) {
      if (COLOR_PROPS.has(prop)) assertValidColor(prop, value);
      t[prop] = value;
      return true;
    },
  };
  return new Proxy(target, handler) as unknown as CanvasRenderingContext2D;
}

const ALL_SHAPES: BossShape[] = [
  "slopeWraith",
  "accelArrow",
  "riemannTower",
  "ringCore",
  "componentCross",
  "arcComet",
  "gravityOrb",
  "framePrism",
  "sineSerpent",
  "mirror",
  "singularity",
];

const ALL_SCREENS: BossScreen[] = ["intro", "fighting", "victory", "defeat"];

const ALL_ACTIONS: FighterAction[] = [
  "idle",
  "walk",
  "jump",
  "crouch",
  "block",
  "attack",
  "hitstun",
  "blockstun",
  "knockdown",
  "ko",
];

const ALL_KINDS: AttackKind[] = ["punch", "kick"];
const ALL_STRENGTHS: AttackStrength[] = ["light", "heavy"];
const ALL_PHASES: MovePhase[] = ["startup", "active", "recovery"];
const ALL_HEIGHTS: HitHeight[] = ["high", "mid", "low", "overhead"];

function makePose(side: "player" | "boss", overrides: Partial<FighterPose> = {}): FighterPose {
  const base: FighterPose = {
    side,
    x: side === "player" ? 150 : 540,
    y: 0,
    facing: side === "player" ? 1 : -1,
    action: "idle",
    crouching: false,
    blocking: false,
    airborne: false,
    stunned: false,
    attackKind: null,
    attackStrength: null,
    movePhase: null,
    moveHeight: null,
    hp: 0.8,
    meter: 0.4,
    combo: 0,
  };
  return { ...base, ...overrides };
}

function sampleParticles(): BossSceneParticle[] {
  return [
    { x: 100, y: 200, vx: 10, vy: -5, life: 0.5, maxLife: 1, size: 4, color: "#fff", gravity: 600 },
    { x: 200, y: 300, vx: -8, vy: 2, life: 0.9, maxLife: 1, size: 6, color: "#ffd23f", gravity: 0, spin: 1.2 },
    { x: 50, y: 50, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: "#38e1ff", gravity: 0 },
  ];
}

function sampleSparks(): HitSpark[] {
  return [
    { x: 300, y: 400, life: 0.6, maxLife: 1, size: 18, kind: "hit" },
    { x: 320, y: 380, life: 0.9, maxLife: 1, size: 16, kind: "block" },
    { x: 280, y: 420, life: 0.4, maxLife: 1, size: 26, kind: "ko" },
    { x: 310, y: 360, life: 1, maxLife: 1, size: 22, kind: "special" },
    { x: 0, y: 0, life: 0, maxLife: 1, size: 10, kind: "hit" },
  ];
}

function baseScene(overrides: Partial<BossScene> = {}): BossScene {
  const scene: BossScene = {
    layout: makeLayout(390, 720),
    time: 1.234,
    reduced: false,
    screen: "fighting",

    bossShape: "slopeWraith",
    bossPrimary: "#38e1ff",
    bossSecondary: "#0a6c8a",
    bossAccent: "#d6f9ff",
    bossName: "Gradient",
    bossTitle: "the Slope Wraith",
    phaseIndex: 0,
    phaseCount: 1,

    player: makePose("player"),
    boss: makePose("boss"),

    score: 1200,
    highScore: 5000,
    maxCombo: 4,
    banner: null,

    shake: 0,
    flash: 0,
    hitSparks: [],
    particles: [],
  };
  return { ...scene, ...overrides };
}

describe("drawScene", () => {
  it("renders every boss shape without throwing", () => {
    const ctx = makeCtx();
    for (const shape of ALL_SHAPES) {
      expect(() =>
        drawScene(ctx, baseScene({ bossShape: shape, phaseCount: 3, phaseIndex: 1 })),
      ).not.toThrow();
    }
  });

  it("renders both fighters across every action without throwing", () => {
    const ctx = makeCtx();
    for (const action of ALL_ACTIONS) {
      expect(() =>
        drawScene(
          ctx,
          baseScene({
            player: makePose("player", { action }),
            boss: makePose("boss", { action }),
          }),
        ),
      ).not.toThrow();
    }
  });

  it("renders every screen layer without throwing", () => {
    const ctx = makeCtx();
    for (const screen of ALL_SCREENS) {
      expect(() => drawScene(ctx, baseScene({ screen }))).not.toThrow();
    }
  });

  it("renders all attack descriptors (kind x strength x phase x height)", () => {
    const ctx = makeCtx();
    for (const attackKind of ALL_KINDS) {
      for (const attackStrength of ALL_STRENGTHS) {
        for (const movePhase of ALL_PHASES) {
          for (const moveHeight of ALL_HEIGHTS) {
            const attack: Partial<FighterPose> = {
              action: "attack",
              attackKind,
              attackStrength,
              movePhase,
              moveHeight,
            };
            expect(() =>
              drawScene(
                ctx,
                baseScene({
                  player: makePose("player", attack),
                  boss: makePose("boss", attack),
                }),
              ),
            ).not.toThrow();
          }
        }
      }
    }
  });

  it("renders crouching / blocking / stunned modifier combinations", () => {
    const ctx = makeCtx();
    const combos: Partial<FighterPose>[] = [
      { crouching: true },
      { blocking: true },
      { blocking: true, crouching: true },
      { blocking: true, action: "block", moveHeight: "low" },
      { stunned: true, action: "hitstun" },
      { stunned: true, action: "blockstun" },
      { action: "knockdown" },
      { action: "ko", hp: 0 },
    ];
    for (const c of combos) {
      expect(() =>
        drawScene(ctx, baseScene({ player: makePose("player", c), boss: makePose("boss", c) })),
      ).not.toThrow();
    }
  });

  it("renders airborne fighters at a positive hip height", () => {
    const ctx = makeCtx();
    for (const y of [40, 120, 260]) {
      expect(() =>
        drawScene(
          ctx,
          baseScene({
            player: makePose("player", { airborne: true, action: "jump", y }),
            boss: makePose("boss", {
              airborne: true,
              action: "attack",
              attackKind: "kick",
              attackStrength: "heavy",
              movePhase: "active",
              moveHeight: "mid",
              y,
            }),
          }),
        ),
      ).not.toThrow();
    }
  });

  it("renders hitSparks of each kind", () => {
    const ctx = makeCtx();
    expect(() => drawScene(ctx, baseScene({ hitSparks: sampleSparks() }))).not.toThrow();
  });

  it("renders particles, shake, flash, banner and full meters", () => {
    const ctx = makeCtx();
    expect(() =>
      drawScene(
        ctx,
        baseScene({
          particles: sampleParticles(),
          hitSparks: sampleSparks(),
          shake: 0.6,
          flash: 0.4,
          banner: "K.O.!",
          player: makePose("player", { combo: 12, meter: 1 }),
          boss: makePose("boss", { meter: 1, hp: 0.1 }),
        }),
      ),
    ).not.toThrow();
  });

  it("handles reduced motion true and false", () => {
    const ctx = makeCtx();
    for (const reduced of [true, false]) {
      expect(() =>
        drawScene(
          ctx,
          baseScene({
            reduced,
            shake: 0.8,
            flash: 0.5,
            particles: sampleParticles(),
            hitSparks: sampleSparks(),
            player: makePose("player", { combo: 7, meter: 1, action: "walk" }),
          }),
        ),
      ).not.toThrow();
    }
  });

  it("renders the finale (multi-phase singularity) across phases", () => {
    const ctx = makeCtx();
    for (let phaseIndex = 0; phaseIndex < 3; phaseIndex++) {
      expect(() =>
        drawScene(
          ctx,
          baseScene({
            bossShape: "singularity",
            bossName: "The Singularity",
            bossTitle: "the End of Motion",
            phaseIndex,
            phaseCount: 3,
            boss: makePose("boss", { action: "attack", attackKind: "punch", movePhase: "active", moveHeight: "overhead" }),
          }),
        ),
      ).not.toThrow();
    }
  });

  it("renders across a range of canvas sizes", () => {
    const ctx = makeCtx();
    for (const [w, h] of [
      [320, 568],
      [390, 720],
      [768, 1024],
      [1280, 720],
    ] as const) {
      expect(() => drawScene(ctx, baseScene({ layout: makeLayout(w, h) }))).not.toThrow();
    }
  });

  // --- per-boss identity coverage (skins: heads, auras, idle behaviours) ----

  it("renders each boss skin's distinct head + aura + idle for every action", () => {
    const ctx = makeCtx();
    for (const shape of ALL_SHAPES) {
      for (const action of ALL_ACTIONS) {
        // Two time samples so oscillating idle/aura math is exercised on both
        // phases (hover up/down, sway left/right, metronome tick, etc.).
        for (const time of [0.0, 0.83, 2.6]) {
          expect(() =>
            drawScene(
              ctx,
              baseScene({
                time,
                bossShape: shape,
                boss: makePose("boss", { action }),
                player: makePose("player", { action }),
              }),
            ),
          ).not.toThrow();
        }
      }
    }
  });

  it("renders swing trails for every boss across the full attack matrix", () => {
    const ctx = makeCtx();
    for (const shape of ALL_SHAPES) {
      for (const attackKind of ALL_KINDS) {
        for (const attackStrength of ALL_STRENGTHS) {
          for (const movePhase of ALL_PHASES) {
            for (const moveHeight of ALL_HEIGHTS) {
              const attack: Partial<FighterPose> = {
                action: "attack",
                attackKind,
                attackStrength,
                movePhase,
                moveHeight,
              };
              expect(() =>
                drawScene(
                  ctx,
                  baseScene({
                    bossShape: shape,
                    boss: makePose("boss", attack),
                    player: makePose("player", attack),
                  }),
                ),
              ).not.toThrow();
            }
          }
        }
      }
    }
  });

  it("renders every boss skin under reduced motion (idle/walk/airborne)", () => {
    const ctx = makeCtx();
    for (const shape of ALL_SHAPES) {
      for (const variant of [
        { action: "idle" as FighterAction },
        { action: "walk" as FighterAction },
        { action: "jump" as FighterAction, airborne: true, y: 140 },
      ]) {
        expect(() =>
          drawScene(
            ctx,
            baseScene({
              reduced: true,
              bossShape: shape,
              boss: makePose("boss", variant),
              player: makePose("player", variant),
            }),
          ),
        ).not.toThrow();
      }
    }
  });

  // Regression: the real palettes from the boss registry must produce only
  // valid colors. The Gradient boss (slopeWraith) re-shaded an already-shaded
  // body color, yielding "rgb(NaN,…)" which crashed the canvas in-browser; this
  // drives every registered boss's actual palette through the renderer.
  it("renders every registered boss's real palette without emitting invalid colors", () => {
    const ctx = makeCtx();
    for (const boss of allBosses) {
      for (const action of ["idle", "attack", "block", "hitstun"] as FighterAction[]) {
        expect(() =>
          drawScene(
            ctx,
            baseScene({
              bossShape: boss.visual.shape,
              bossPrimary: boss.visual.primary,
              bossSecondary: boss.visual.secondary,
              bossAccent: boss.visual.accent,
              bossName: boss.name,
              bossTitle: boss.title,
              boss: makePose("boss", {
                action,
                attackKind: "punch",
                attackStrength: "heavy",
                movePhase: "active",
                moveHeight: "overhead",
              }),
            }),
          ),
        ).not.toThrow();
      }
    }
  });

  it("renders the mirror boss as a dark echo without throwing", () => {
    const ctx = makeCtx();
    expect(() =>
      drawScene(
        ctx,
        baseScene({
          bossShape: "mirror",
          bossName: "Apex",
          bossTitle: "the Mirror",
          bossPrimary: "#8a8f9c",
          bossSecondary: "#2a2e38",
          bossAccent: "#5cc8ff",
          boss: makePose("boss", { action: "attack", attackKind: "kick", attackStrength: "heavy", movePhase: "active", moveHeight: "low" }),
        }),
      ),
    ).not.toThrow();
  });
});
