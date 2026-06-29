import { describe, expect, it } from "vitest";
import {
  allMiniBossesDefeated,
  bossUnlocked,
  finaleUnlocked,
  weaponTierFor,
} from "../gating";
import type { CourseProgress } from "../../types/progress";

type BossEntry = NonNullable<CourseProgress["bossDefeats"]>[string];

const defeated = (overrides: Partial<BossEntry> = {}): BossEntry => ({
  defeated: true,
  bestScore: 100,
  ...overrides,
});

describe("weaponTierFor", () => {
  it("returns null below the 70% pass bar", () => {
    expect(weaponTierFor(0)).toBeNull();
    expect(weaponTierFor(69)).toBeNull();
  });

  it("returns tier 1 for the 70-79 band", () => {
    expect(weaponTierFor(70)).toBe(1);
    expect(weaponTierFor(79)).toBe(1);
  });

  it("returns tier 2 for the 80-84 band", () => {
    expect(weaponTierFor(80)).toBe(2);
    expect(weaponTierFor(84)).toBe(2);
  });

  it("returns tier 3 for the 85-89 band", () => {
    expect(weaponTierFor(85)).toBe(3);
    expect(weaponTierFor(89)).toBe(3);
  });

  it("returns tier 4 for the 90-99 band", () => {
    expect(weaponTierFor(90)).toBe(4);
    expect(weaponTierFor(99)).toBe(4);
  });

  it("returns tier 5 at a perfect 100", () => {
    expect(weaponTierFor(100)).toBe(5);
  });
});

describe("bossUnlocked", () => {
  it("locks the boss when no quiz score is recorded", () => {
    expect(bossUnlocked(null, "l1")).toBe(false);
    expect(bossUnlocked({ quizScores: {} }, "l1")).toBe(false);
  });

  it("locks the boss below the 70% pass bar", () => {
    expect(bossUnlocked({ quizScores: { l1: 69 } }, "l1")).toBe(false);
  });

  it("unlocks the boss at exactly 70% and above", () => {
    expect(bossUnlocked({ quizScores: { l1: 70 } }, "l1")).toBe(true);
    expect(bossUnlocked({ quizScores: { l1: 100 } }, "l1")).toBe(true);
  });
});

describe("allMiniBossesDefeated", () => {
  const ids = ["l1", "l2", "l3"];

  it("is false with an empty boss list", () => {
    expect(allMiniBossesDefeated({ bossDefeats: {} }, [])).toBe(false);
  });

  it("is false when no progress is recorded", () => {
    expect(allMiniBossesDefeated(null, ids)).toBe(false);
  });

  it("is false when some bosses are still undefeated", () => {
    const cp = {
      bossDefeats: {
        l1: defeated(),
        l2: defeated({ defeated: false }),
        l3: defeated(),
      },
    };
    expect(allMiniBossesDefeated(cp, ids)).toBe(false);
  });

  it("is false when a boss has no entry at all", () => {
    const cp = { bossDefeats: { l1: defeated(), l2: defeated() } };
    expect(allMiniBossesDefeated(cp, ids)).toBe(false);
  });

  it("is true once every mini-boss is defeated", () => {
    const cp = {
      bossDefeats: { l1: defeated(), l2: defeated(), l3: defeated() },
    };
    expect(allMiniBossesDefeated(cp, ids)).toBe(true);
  });
});

describe("finaleUnlocked", () => {
  const ids = ["l1", "l2"];

  it("stays locked until all mini-bosses are defeated", () => {
    expect(finaleUnlocked(null, ids)).toBe(false);
    expect(
      finaleUnlocked({ bossDefeats: { l1: defeated() } }, ids),
    ).toBe(false);
  });

  it("unlocks once all mini-bosses are defeated", () => {
    const cp = { bossDefeats: { l1: defeated(), l2: defeated() } };
    expect(finaleUnlocked(cp, ids)).toBe(true);
  });
});
