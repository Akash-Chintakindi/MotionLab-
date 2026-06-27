import { describe, expect, it } from "vitest";
import {
  computeLayout,
  cannonBodyCenter,
  cannonPivot,
  generateTerrain,
  SEGMENTS,
  TERRAIN_STYLES,
  type Terrain,
  type Layout,
} from "../cannonLayout";
import {
  aiAim,
  aiCanHit,
  applyReward,
  applyWrongAnswer,
  computeScore,
  freshMatch,
  generateSolvableTerrain,
  idealSpeed,
  isTerrainSolvable,
  launchVelocity,
  MAX_AI_SHIELDS,
  MAX_PLAYER_SHIELDS,
  playerCanHit,
  powerToSpeed,
  previewArc,
  questionDifficulty,
  resolveHit,
  simulateShot,
  speedToPower,
} from "../cannonPhysics";
import type { Vec2 } from "../../types";

const lay: Layout = computeLayout(480, 360);

/** A deterministic PRNG so terrain + AI noise are reproducible in tests. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A flat, low battlefield so lobs between the cannons never clip the ground. */
function flatTerrain(): Terrain {
  return { heights: new Array(SEGMENTS + 1).fill(0.82), style: "rollingHills" };
}

function muzzle(lay: Layout, pivot: Vec2, dir: number): Vec2 {
  return {
    x: pivot.x + Math.cos(dir) * lay.muzzleLen,
    y: pivot.y - Math.sin(dir) * lay.muzzleLen,
  };
}

function polylineLength(pts: Vec2[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

describe("launchVelocity", () => {
  it("points up-right for a player launch (negative screen vy)", () => {
    const v = launchVelocity(Math.PI / 4, 100);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeLessThan(0); // up is negative in screen space
  });
  it("points up-left for an AI launch", () => {
    const v = launchVelocity(Math.PI - 0.5, 100);
    expect(v.x).toBeLessThan(0);
    expect(v.y).toBeLessThan(0);
  });
});

describe("projectile integrates under gravity", () => {
  it("arcs up then falls back down", () => {
    const terrain = flatTerrain();
    const from = { x: lay.w * 0.2, y: lay.h * 0.4 };
    const target = { x: -9999, y: -9999 }; // unreachable so it flies freely
    const sim = simulateShot(lay, terrain, from, 1.0, lay.speedMax, target, 1);
    // The apex must be ABOVE (smaller y) than the launch point.
    expect(sim.apex.y).toBeLessThan(from.y);
    // It eventually comes back down and resolves on the terrain or off-screen.
    expect(["hitTerrain", "offscreen"]).toContain(sim.outcome);
    expect(sim.points.length).toBeGreaterThan(2);
    expect(sim.points[0]).toEqual(from);
  });

  it("a weak, shallow shot buries into the terrain", () => {
    const terrain = flatTerrain();
    const pivot = cannonPivot(lay, terrain, lay.playerX);
    const from = muzzle(lay, pivot, 0.3);
    const target = cannonBodyCenter(lay, terrain, lay.aiX);
    const sim = simulateShot(lay, terrain, from, 0.3, lay.speedMin, target, lay.hitR);
    expect(sim.outcome).toBe("hitTerrain");
    // Impact lands on (not under) the ground line.
    expect(sim.impact.y).toBeGreaterThan(from.y);
  });
});

describe("idealSpeed solver actually lands on the target", () => {
  it("hits the rival within the hit radius for a lobbed direction", () => {
    const terrain = flatTerrain();
    const dir = 1.0;
    const pivot = cannonPivot(lay, terrain, lay.playerX);
    const from = muzzle(lay, pivot, dir);
    const target = cannonBodyCenter(lay, terrain, lay.aiX);
    const speed = idealSpeed(from, target, dir, lay.gravity);
    expect(speed).not.toBeNull();
    const sim = simulateShot(lay, terrain, from, dir, speed!, target, lay.hitR);
    expect(sim.outcome).toBe("hitTarget");
    expect(sim.closest).toBeLessThanOrEqual(lay.hitR);
  });

  it("returns null for a direction that points away from the target", () => {
    const from = { x: lay.w * 0.2, y: lay.h * 0.5 };
    const target = { x: lay.w * 0.8, y: lay.h * 0.5 };
    // Firing LEFT (toward π) cannot reach a target on the right.
    expect(idealSpeed(from, target, Math.PI - 0.3, lay.gravity)).toBeNull();
  });
});

describe("previewArc length scales with power and is capped", () => {
  const terrain = flatTerrain();
  const pivot = cannonPivot(lay, terrain, lay.playerX);
  const dir = 0.9;
  const from = muzzle(lay, pivot, dir);

  it("is longer at higher power", () => {
    const low = polylineLength(
      previewArc(lay, terrain, from, dir, powerToSpeed(0.25, lay)),
    );
    const high = polylineLength(
      previewArc(lay, terrain, from, dir, powerToSpeed(0.75, lay)),
    );
    expect(high).toBeGreaterThan(low);
  });

  it("never exceeds the max preview length at full power", () => {
    const full = polylineLength(
      previewArc(lay, terrain, from, dir, powerToSpeed(1, lay)),
    );
    // Allow a single integration step of overshoot past the budget.
    expect(full).toBeLessThanOrEqual(lay.maxPreview * 1.15);
    // And it should genuinely use most of the budget (not stop early).
    expect(full).toBeGreaterThan(lay.maxPreview * 0.7);
  });
});

describe("aiAim accuracy increases with difficulty", () => {
  function meanClosest(
    difficulty: "easy" | "medium" | "hard",
    terrain: Terrain,
  ): number {
    const rng = mulberry32(12345); // same seed across difficulties = fair test
    const pivot = cannonPivot(lay, terrain, lay.aiX);
    const from = muzzle(lay, pivot, Math.PI - 0.85);
    const target = cannonBodyCenter(lay, terrain, lay.playerX);
    const samples = 140;
    let total = 0;
    for (let i = 0; i < samples; i++) {
      const shot = aiAim(lay, terrain, from, target, lay.hitR, difficulty, rng);
      const sim = simulateShot(
        lay,
        terrain,
        from,
        shot.dir,
        shot.speed,
        target,
        lay.hitR,
      );
      total += sim.closest;
    }
    return total / samples;
  }

  it("hard aims tighter than medium, which aims tighter than easy", () => {
    const terrain = generateTerrain(lay, mulberry32(99), "rollingHills");
    const easy = meanClosest("easy", terrain);
    const medium = meanClosest("medium", terrain);
    const hard = meanClosest("hard", terrain);
    expect(hard).toBeLessThan(medium);
    expect(medium).toBeLessThan(easy);
  });
});

describe("terrain generation", () => {
  it("is deterministic for a given seed", () => {
    const a = generateTerrain(lay, mulberry32(7));
    const b = generateTerrain(lay, mulberry32(7));
    expect(a.style).toBe(b.style);
    expect(a.heights).toEqual(b.heights);
  });

  it("keeps every height within the canvas bounds", () => {
    for (let seed = 0; seed < 8; seed++) {
      const t = generateTerrain(lay, mulberry32(seed));
      for (const hf of t.heights) {
        expect(hf).toBeGreaterThanOrEqual(0);
        expect(hf).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("generateSolvableTerrain is always playable from both sides", () => {
  // Test across several layouts so the guarantee isn't tuned to one canvas.
  const layouts: Layout[] = [
    computeLayout(480, 360),
    computeLayout(640, 480),
    computeLayout(800, 600),
    computeLayout(1024, 768),
  ];

  it("produces a solvable field for 240 deterministic seeds", () => {
    for (const layout of layouts) {
      for (let seed = 0; seed < 240; seed++) {
        const terrain = generateSolvableTerrain(layout, mulberry32(seed));
        expect(
          playerCanHit(layout, terrain),
          `player blocked: layout ${layout.w}x${layout.h}, seed ${seed}, style ${terrain.style}`,
        ).toBe(true);
        expect(
          aiCanHit(layout, terrain),
          `ai blocked: layout ${layout.w}x${layout.h}, seed ${seed}, style ${terrain.style}`,
        ).toBe(true);
      }
    }
  });

  it("is solvable for EVERY terrain style across many seeds", () => {
    for (const style of TERRAIN_STYLES) {
      for (let seed = 0; seed < 60; seed++) {
        const terrain = generateSolvableTerrain(lay, mulberry32(seed), style);
        expect(terrain.style).toBe(style);
        expect(
          isTerrainSolvable(lay, terrain),
          `unsolvable: style ${style}, seed ${seed}`,
        ).toBe(true);
      }
    }
  });

  it("is deterministic for a given seed", () => {
    const a = generateSolvableTerrain(lay, mulberry32(42));
    const b = generateSolvableTerrain(lay, mulberry32(42));
    expect(a.style).toBe(b.style);
    expect(a.heights).toEqual(b.heights);
  });

  it("keeps every solvable height within the canvas bounds", () => {
    for (let seed = 0; seed < 30; seed++) {
      const t = generateSolvableTerrain(lay, mulberry32(seed));
      for (const hf of t.heights) {
        expect(hf).toBeGreaterThanOrEqual(0);
        expect(hf).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("power <-> speed mapping", () => {
  it("round-trips", () => {
    const s = powerToSpeed(0.5, lay);
    expect(speedToPower(s, lay)).toBeCloseTo(0.5);
  });
});

describe("ammo + shield economy", () => {
  it("a correct answer can add ammo or a shield (player shield capped at 1)", () => {
    let m = freshMatch();
    m = applyReward(m, "ammo");
    expect(m.ammo).toBe(4);
    m = applyReward(m, "shield");
    expect(m.playerShields).toBe(1);
    m = applyReward(m, "shield");
    expect(m.playerShields).toBe(MAX_PLAYER_SHIELDS); // still 1
  });

  it("a wrong answer hands the AI a shield, capped at 3", () => {
    let m = freshMatch();
    for (let i = 0; i < 5; i++) m = applyWrongAnswer(m);
    expect(m.aiShields).toBe(MAX_AI_SHIELDS);
  });

  it("a shield absorbs a hit before a heart is lost", () => {
    let m = freshMatch();
    m = applyReward(m, "shield");
    const shielded = resolveHit(m, "player");
    expect(shielded.result).toBe("shielded");
    expect(shielded.state.playerShields).toBe(0);
    expect(shielded.state.playerHearts).toBe(3);

    const hurt = resolveHit(shielded.state, "player");
    expect(hurt.result).toBe("heart");
    expect(hurt.state.playerHearts).toBe(2);
  });

  it("reports a defeat when the last heart is lost", () => {
    let m = freshMatch();
    m = { ...m, aiHearts: 1, aiShields: 0 };
    const r = resolveHit(m, "ai");
    expect(r.result).toBe("defeated");
    expect(r.state.aiHearts).toBe(0);
  });
});

describe("question difficulty adapts to closeness", () => {
  it("eases up when the player is well ahead", () => {
    expect(questionDifficulty(3, 1)).toBe("easy");
  });
  it("toughens up when the player is behind", () => {
    expect(questionDifficulty(1, 3)).toBe("hard");
  });
  it("toughens up in a tense late game", () => {
    expect(questionDifficulty(1, 1)).toBe("hard");
  });
  it("stays moderate when even mid-match", () => {
    expect(questionDifficulty(3, 3)).toBe("medium");
    expect(questionDifficulty(3, 2)).toBe("medium");
  });
});

describe("computeScore", () => {
  it("rewards a win and scales with survivors + difficulty", () => {
    const win = computeScore({
      won: true,
      hitsDealt: 3,
      playerHearts: 2,
      ammo: 1,
      playerShields: 1,
      difficulty: "hard",
    });
    const loss = computeScore({
      won: false,
      hitsDealt: 1,
      playerHearts: 0,
      ammo: 0,
      playerShields: 0,
      difficulty: "easy",
    });
    expect(win).toBeGreaterThan(loss);
    expect(win).toBeGreaterThan(1000);
  });
});
