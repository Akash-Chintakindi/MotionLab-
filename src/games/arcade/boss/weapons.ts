// ---------------------------------------------------------------------------
// The 10 themed weapons (one per lesson, PRD 6.3) and the 5-tier stat scaling
// (PRD 6.2) for the Shadow Fight-style brawler. The mini-boss a player faces is
// locked to its lesson's weapon; the tier is the player's best quiz score band.
// Higher tier => more damage, faster strikes, longer reach, more meter per hit,
// and the Special (tier 3+) / upgraded Special (tier 5). The engine receives the
// resolved WeaponStats, never a quiz score, so this module is gating-agnostic.
//
// A weapon adds a flat REACH (px) to every move's hitbox: heavy / ranged
// weapons swing long, fast fist weapons stay short. The engine multiplies a
// move's base damage by `damageMult`, divides its startup/recovery by
// `attackSpeed`, and adds `reachPx` to its reach.
// ---------------------------------------------------------------------------

import type { WeaponConfig, WeaponStats, WeaponTier } from "./bossTypes";

// PRD 6.2 multipliers, indexed by (tier - 1).
export const TIER_DAMAGE_MULT = [1.0, 1.12, 1.24, 1.38, 1.55] as const;
export const TIER_SPEED_MULT = [1.0, 1.06, 1.12, 1.2, 1.3] as const;
/** Mild reach growth up the tiers (a sharper, longer-reaching weapon). */
export const TIER_REACH_MULT = [1.0, 1.04, 1.08, 1.13, 1.18] as const;
/** Meter/hit BONUS over the tier-1 base, as a fraction (PRD: +0..+40%). */
export const TIER_METER_BONUS = [0.0, 0.1, 0.2, 0.3, 0.4] as const;

/** Tier-1 meter gained per landed light hit (the meter is 0..1). */
export const BASE_METER_PER_HIT = 0.1;

/**
 * Resolve a weapon's per-fight stats at a given tier using the PRD 6.2 table.
 * Damage, attack speed, and reach scale by their multipliers; meter scales off
 * the base unit by the tier bonus; the Special unlocks at tier 3 and upgrades
 * at tier 5. `lightDamage` / `heavyDamage` are reference numbers for the loadout
 * HUD and tests (the engine's MOVES table carries the real per-move base).
 */
export function weaponStats(weapon: WeaponConfig, tier: WeaponTier): WeaponStats {
  const i = tier - 1;
  const damageMult = TIER_DAMAGE_MULT[i];
  return {
    damageMult,
    lightDamage: weapon.baseLightDamage * damageMult,
    heavyDamage: weapon.baseHeavyDamage * damageMult,
    attackSpeed: TIER_SPEED_MULT[i],
    reachPx: weapon.baseReachPx * TIER_REACH_MULT[i],
    meterPerHit: BASE_METER_PER_HIT * (1 + TIER_METER_BONUS[i]),
    specialUnlocked: tier >= 3,
    specialUpgraded: tier === 5,
  };
}

// The roster, in course order. Light/heavy base damage and reach are tuned per
// archetype: fast weapons hit often for less at short range; heavy / ranged
// weapons hit slow for more at long range.
export const allWeapons: WeaponConfig[] = [
  {
    id: "slope-saber",
    lessonId: "lesson-1-position-velocity",
    name: "Slope Saber",
    archetype: "fastBlade",
    special: "Tangent Slash",
    baseLightDamage: 6,
    baseHeavyDamage: 13,
    baseReachPx: 58,
  },
  {
    id: "accel-gauntlets",
    lessonId: "lesson-2-velocity-acceleration",
    name: "Accel Gauntlets",
    archetype: "fastFists",
    special: "Ramp",
    baseLightDamage: 5,
    baseHeavyDamage: 11,
    baseReachPx: 44,
  },
  {
    id: "riemann-maul",
    lessonId: "lesson-3-displacement-area",
    name: "Riemann Maul",
    archetype: "heavyHammer",
    special: "Area Slam",
    baseLightDamage: 9,
    baseHeavyDamage: 20,
    baseReachPx: 84,
  },
  {
    id: "kinematic-chakrams",
    lessonId: "lesson-4-acceleration-to-position",
    name: "Kinematic Chakrams",
    archetype: "midThrow",
    special: "Triple Integral",
    baseLightDamage: 7,
    baseHeavyDamage: 14,
    baseReachPx: 66,
  },
  {
    id: "vector-twin-daggers",
    lessonId: "lesson-5-two-dimensions",
    name: "Vector Twin Daggers",
    archetype: "dualFast",
    special: "Component Cross",
    baseLightDamage: 5,
    baseHeavyDamage: 10,
    baseReachPx: 42,
  },
  {
    id: "parabola-bow",
    lessonId: "lesson-6-projectile-motion",
    name: "Parabola Bow",
    archetype: "rangedArc",
    special: "Trajectory",
    baseLightDamage: 7,
    baseHeavyDamage: 15,
    baseReachPx: 88,
  },
  {
    id: "gravity-hammer",
    lessonId: "lesson-8-free-fall",
    name: "Gravity Hammer",
    archetype: "slowHeavy",
    special: "Free Fall",
    baseLightDamage: 10,
    baseHeavyDamage: 24,
    baseReachPx: 90,
  },
  {
    id: "frame-blades",
    lessonId: "lesson-9-relative-motion",
    name: "Frame Blades",
    archetype: "counter",
    special: "Parallax",
    baseLightDamage: 7,
    baseHeavyDamage: 16,
    baseReachPx: 60,
  },
  {
    id: "resonance-whip",
    lessonId: "lesson-10-oscillations",
    name: "Resonance Whip",
    archetype: "rhythm",
    special: "Harmonic",
    baseLightDamage: 6,
    baseHeavyDamage: 13,
    baseReachPx: 78,
  },
  {
    id: "apex-edge",
    lessonId: "lesson-7-mastery-challenge",
    name: "Apex Edge",
    archetype: "balanced",
    special: "Mastery",
    baseLightDamage: 8,
    baseHeavyDamage: 16,
    baseReachPx: 64,
  },
];

const byLessonId: ReadonlyMap<string, WeaponConfig> = new Map(
  allWeapons.map((w) => [w.lessonId, w]),
);

/** The themed weapon awarded by a lesson. Throws if the lesson has none. */
export function weaponForLesson(lessonId: string): WeaponConfig {
  const weapon = byLessonId.get(lessonId);
  if (!weapon) {
    throw new Error(`No weapon defined for lesson "${lessonId}"`);
  }
  return weapon;
}
