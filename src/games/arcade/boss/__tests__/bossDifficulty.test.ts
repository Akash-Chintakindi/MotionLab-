import { describe, expect, it } from "vitest";

import { difficultyFor } from "../bossDifficulty";

describe("difficultyFor", () => {
  it("anchors HP and damage to the PRD curve at the endpoints", () => {
    const first = difficultyFor(1);
    expect(first.hp).toBe(100);
    expect(first.bossDamageMult).toBeCloseTo(1, 6);

    const tenth = difficultyFor(10);
    expect(tenth.hp).toBe(100 + 22 * 9);
    expect(tenth.bossDamageMult).toBeCloseTo(1 + 0.05 * 9, 6);
  });

  it("makes the AI meaner with index in the intended direction", () => {
    for (let n = 2; n <= 13; n++) {
      const prev = difficultyFor(n - 1);
      const cur = difficultyFor(n);
      expect(cur.hp).toBeGreaterThan(prev.hp);
      expect(cur.bossDamageMult).toBeGreaterThan(prev.bossDamageMult);
      expect(cur.ai.aggression).toBeGreaterThanOrEqual(prev.ai.aggression);
      expect(cur.ai.reactionMs).toBeLessThanOrEqual(prev.ai.reactionMs);
      expect(cur.ai.blockChance).toBeGreaterThanOrEqual(prev.ai.blockChance);
      expect(cur.ai.jumpChance).toBeGreaterThanOrEqual(prev.ai.jumpChance);
      expect(cur.ai.comboLength).toBeGreaterThanOrEqual(prev.ai.comboLength);
      expect(cur.ai.moveSpeedMult).toBeGreaterThanOrEqual(prev.ai.moveSpeedMult);
      expect(cur.ai.preferredRangePx).toBeLessThanOrEqual(prev.ai.preferredRangePx);
    }
  });

  it("respects the fairness clamps even far past the finale", () => {
    const far = difficultyFor(50);
    expect(far.ai.aggression).toBeLessThanOrEqual(0.95);
    expect(far.ai.reactionMs).toBe(130);
    expect(far.ai.blockChance).toBeLessThanOrEqual(0.85);
    expect(far.ai.jumpChance).toBeLessThanOrEqual(0.55);
    expect(far.ai.comboLength).toBeLessThanOrEqual(6);
    expect(far.ai.preferredRangePx).toBeGreaterThanOrEqual(64);
  });

  it("clamps a degenerate index up to 1", () => {
    expect(difficultyFor(0)).toEqual(difficultyFor(1));
    expect(difficultyFor(-5)).toEqual(difficultyFor(1));
  });

  it("starts active even at Boss 1 and ends clearly threatening at the finale", () => {
    const first = difficultyFor(1).ai;
    // Boss 1 attacks and blocks reads regularly (no longer a passive dummy).
    expect(first.aggression).toBeGreaterThanOrEqual(0.55);
    expect(first.blockChance).toBeGreaterThanOrEqual(0.3);
    expect(first.comboLength).toBeGreaterThanOrEqual(2);
    expect(first.reactionMs).toBeLessThanOrEqual(440);

    const last = difficultyFor(13).ai; // finale phase 3
    expect(last.aggression).toBeGreaterThanOrEqual(0.9);
    expect(last.blockChance).toBeGreaterThanOrEqual(0.7);
    expect(last.reactionMs).toBeLessThanOrEqual(150);
    expect(last.comboLength).toBeGreaterThanOrEqual(5);
    // Strictly meaner than Boss 1 on every activity axis.
    expect(last.aggression).toBeGreaterThan(first.aggression);
    expect(last.blockChance).toBeGreaterThan(first.blockChance);
    expect(last.reactionMs).toBeLessThan(first.reactionMs);
  });
});
