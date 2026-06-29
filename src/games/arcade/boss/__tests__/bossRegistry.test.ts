import { describe, expect, it } from "vitest";

import { course } from "../../../../content/course";
import { allBosses, bossById, finale, miniBosses } from "../bossRegistry";
import type { BossShape } from "../bossTypes";

const VALID_SHAPES: BossShape[] = [
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

describe("bossRegistry", () => {
  it("has exactly one mini-boss per course lesson, plus the finale", () => {
    expect(miniBosses).toHaveLength(course.lessons.length);
    expect(miniBosses).toHaveLength(10);
    expect(allBosses).toHaveLength(course.lessons.length + 1);
    expect(allBosses[allBosses.length - 1]).toBe(finale);
  });

  it("keys each mini-boss to its lessonId and indexes them 1..10", () => {
    const sorted = [...course.lessons].sort((a, b) => a.order - b.order);
    miniBosses.forEach((boss, i) => {
      expect(boss.id).toBe(sorted[i].id);
      expect(boss.lessonId).toBe(sorted[i].id);
      expect(boss.index).toBe(i + 1);
      expect(boss.musicTrack).toBe("boss");
      expect(boss.phases).toHaveLength(1);
    });
  });

  it("uses a unique, valid BossShape for every boss", () => {
    for (const boss of allBosses) {
      expect(VALID_SHAPES).toContain(boss.visual.shape);
    }
    const shapes = allBosses.map((b) => b.visual.shape);
    expect(new Set(shapes).size).toBe(allBosses.length);
  });

  it("configures the finale as index 11 with three escalating phases", () => {
    expect(finale.id).toBe("finale");
    expect(finale.lessonId).toBeNull();
    expect(finale.index).toBe(11);
    expect(finale.musicTrack).toBe("finale");
    expect(finale.visual.shape).toBe("singularity");
    expect(finale.phases).toHaveLength(3);

    const hps = finale.phases.map((p) => p.hp);
    expect(hps[0]).toBeLessThan(hps[1]);
    expect(hps[1]).toBeLessThan(hps[2]);
  });

  it("gives every phase a positive HP pool and a complete AI profile", () => {
    for (const boss of allBosses) {
      for (const phase of boss.phases) {
        expect(phase.hp).toBeGreaterThan(0);
        const ai = phase.ai;
        expect(ai.aggression).toBeGreaterThan(0);
        expect(ai.reactionMs).toBeGreaterThan(0);
        expect(ai.blockChance).toBeGreaterThanOrEqual(0);
        expect(ai.jumpChance).toBeGreaterThanOrEqual(0);
        expect(ai.preferredRangePx).toBeGreaterThan(0);
        expect(ai.comboLength).toBeGreaterThanOrEqual(1);
        expect(ai.moveSpeedMult).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("resolves bosses by id", () => {
    expect(bossById("finale")).toBe(finale);
    expect(bossById(miniBosses[0].id)).toBe(miniBosses[0]);
    expect(bossById("nope")).toBeUndefined();
  });
});
