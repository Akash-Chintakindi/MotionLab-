import { describe, expect, it } from "vitest";

import {
  BASE_METER_PER_HIT,
  TIER_DAMAGE_MULT,
  TIER_METER_BONUS,
  TIER_REACH_MULT,
  TIER_SPEED_MULT,
  allWeapons,
  weaponForLesson,
  weaponStats,
} from "../weapons";
import type { WeaponTier } from "../bossTypes";

const TIERS: WeaponTier[] = [1, 2, 3, 4, 5];

describe("weaponStats", () => {
  it("applies the PRD 6.2 multipliers at every tier", () => {
    const weapon = weaponForLesson("lesson-1-position-velocity");
    for (const tier of TIERS) {
      const i = tier - 1;
      const stats = weaponStats(weapon, tier);
      expect(stats.damageMult).toBeCloseTo(TIER_DAMAGE_MULT[i], 6);
      expect(stats.lightDamage).toBeCloseTo(weapon.baseLightDamage * TIER_DAMAGE_MULT[i], 6);
      expect(stats.heavyDamage).toBeCloseTo(weapon.baseHeavyDamage * TIER_DAMAGE_MULT[i], 6);
      expect(stats.attackSpeed).toBeCloseTo(TIER_SPEED_MULT[i], 6);
      expect(stats.reachPx).toBeCloseTo(weapon.baseReachPx * TIER_REACH_MULT[i], 6);
      expect(stats.meterPerHit).toBeCloseTo(BASE_METER_PER_HIT * (1 + TIER_METER_BONUS[i]), 6);
    }
  });

  it("matches the explicit PRD table values", () => {
    expect([...TIER_DAMAGE_MULT]).toEqual([1.0, 1.12, 1.24, 1.38, 1.55]);
    expect([...TIER_SPEED_MULT]).toEqual([1.0, 1.06, 1.12, 1.2, 1.3]);
    expect([...TIER_METER_BONUS]).toEqual([0.0, 0.1, 0.2, 0.3, 0.4]);
  });

  it("gates the Special at tier 3 and upgrades it at tier 5", () => {
    const weapon = allWeapons[0];
    expect(weaponStats(weapon, 1).specialUnlocked).toBe(false);
    expect(weaponStats(weapon, 2).specialUnlocked).toBe(false);
    expect(weaponStats(weapon, 3).specialUnlocked).toBe(true);
    expect(weaponStats(weapon, 4).specialUnlocked).toBe(true);
    expect(weaponStats(weapon, 5).specialUnlocked).toBe(true);

    expect(weaponStats(weapon, 3).specialUpgraded).toBe(false);
    expect(weaponStats(weapon, 4).specialUpgraded).toBe(false);
    expect(weaponStats(weapon, 5).specialUpgraded).toBe(true);
  });

  it("scales stats monotonically up the tiers", () => {
    const weapon = weaponForLesson("lesson-3-displacement-area");
    for (let tier = 2 as WeaponTier; tier <= 5; tier++) {
      const lo = weaponStats(weapon, (tier - 1) as WeaponTier);
      const hi = weaponStats(weapon, tier as WeaponTier);
      expect(hi.damageMult).toBeGreaterThan(lo.damageMult);
      expect(hi.lightDamage).toBeGreaterThan(lo.lightDamage);
      expect(hi.heavyDamage).toBeGreaterThan(lo.heavyDamage);
      expect(hi.attackSpeed).toBeGreaterThan(lo.attackSpeed);
      expect(hi.reachPx).toBeGreaterThan(lo.reachPx);
      expect(hi.meterPerHit).toBeGreaterThan(lo.meterPerHit);
    }
  });
});

describe("weaponForLesson", () => {
  it("returns the correct archetype per lesson (course order 1..10)", () => {
    const expected: Record<string, string> = {
      "lesson-1-position-velocity": "fastBlade",
      "lesson-2-velocity-acceleration": "fastFists",
      "lesson-3-displacement-area": "heavyHammer",
      "lesson-4-acceleration-to-position": "midThrow",
      "lesson-5-two-dimensions": "dualFast",
      "lesson-6-projectile-motion": "rangedArc",
      "lesson-8-free-fall": "slowHeavy",
      "lesson-9-relative-motion": "counter",
      "lesson-10-oscillations": "rhythm",
      "lesson-7-mastery-challenge": "balanced",
    };
    for (const [lessonId, archetype] of Object.entries(expected)) {
      expect(weaponForLesson(lessonId).archetype).toBe(archetype);
    }
  });

  it("returns the named weapons (Frame Blades for relative motion, etc.)", () => {
    expect(weaponForLesson("lesson-9-relative-motion").name).toBe("Frame Blades");
    expect(weaponForLesson("lesson-10-oscillations").name).toBe("Resonance Whip");
    expect(weaponForLesson("lesson-7-mastery-challenge").name).toBe("Apex Edge");
  });

  it("gives every weapon a reach in the 40-90px band, heavier weapons longer", () => {
    for (const w of allWeapons) {
      expect(w.baseReachPx).toBeGreaterThanOrEqual(40);
      expect(w.baseReachPx).toBeLessThanOrEqual(90);
    }
    expect(weaponForLesson("lesson-8-free-fall").baseReachPx).toBeGreaterThan(
      weaponForLesson("lesson-2-velocity-acceleration").baseReachPx,
    );
  });

  it("has exactly 10 weapons with unique lessonIds", () => {
    expect(allWeapons).toHaveLength(10);
    const lessonIds = new Set(allWeapons.map((w) => w.lessonId));
    expect(lessonIds.size).toBe(10);
  });

  it("throws for an unknown lesson", () => {
    expect(() => weaponForLesson("no-such-lesson")).toThrow();
  });
});
