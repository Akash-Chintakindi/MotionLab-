import { describe, expect, it } from "vitest";

import {
  MAX_EASE,
  MIN_EASE,
  dueTopics,
  initialMastery,
  isDue,
  masteryTier,
  overdueDays,
  reviewMastery,
  type TopicMasteryEntry,
} from "../srs";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_000_000_000_000;

describe("initialMastery", () => {
  it("is a never-seen, due-now entry", () => {
    const e = initialMastery(NOW);
    expect(e.attempts).toBe(0);
    expect(e.correct).toBe(0);
    expect(e.mastery).toBe(0);
    expect(e.intervalDays).toBe(0);
    expect(e.dueAt).toBe(NOW);
    expect(e.lastResult).toBeNull();
  });

  it("is NOT due (review queue ignores never-practiced topics)", () => {
    expect(isDue(initialMastery(NOW), NOW)).toBe(false);
  });
});

describe("reviewMastery — correctness raises/lowers mastery", () => {
  it("a correct answer moves mastery toward 100", () => {
    const e = reviewMastery(initialMastery(NOW), true, "medium", NOW);
    expect(e.mastery).toBeGreaterThan(0);
    expect(e.attempts).toBe(1);
    expect(e.correct).toBe(1);
    expect(e.lastResult).toBe(true);
  });

  it("a wrong answer moves mastery toward 0", () => {
    const seed: TopicMasteryEntry = { ...initialMastery(NOW), mastery: 80 };
    const e = reviewMastery(seed, false, "medium", NOW);
    expect(e.mastery).toBeLessThan(80);
    expect(e.correct).toBe(0);
    expect(e.lastResult).toBe(false);
  });

  it("hard correct answers raise mastery faster than easy ones", () => {
    const base = initialMastery(NOW);
    const easy = reviewMastery(base, true, "easy", NOW);
    const hard = reviewMastery(base, true, "hard", NOW);
    expect(hard.mastery).toBeGreaterThan(easy.mastery);
  });

  it("keeps mastery within [0, 100]", () => {
    let e = initialMastery(NOW);
    for (let i = 0; i < 30; i++) e = reviewMastery(e, true, "hard", NOW);
    expect(e.mastery).toBeLessThanOrEqual(100);
    for (let i = 0; i < 30; i++) e = reviewMastery(e, false, "hard", NOW);
    expect(e.mastery).toBeGreaterThanOrEqual(0);
  });
});

describe("reviewMastery — scheduling", () => {
  it("first correct schedules 1 day out, second 3 days out", () => {
    const first = reviewMastery(initialMastery(NOW), true, "medium", NOW);
    expect(first.intervalDays).toBe(1);
    expect(first.dueAt).toBe(NOW + 1 * DAY);

    const second = reviewMastery(first, true, "medium", first.dueAt);
    expect(second.intervalDays).toBe(3);
    expect(second.dueAt).toBe(first.dueAt + 3 * DAY);
  });

  it("subsequent correct answers grow the interval by ease (>3 days)", () => {
    let e = reviewMastery(initialMastery(NOW), true, "medium", NOW); // 1
    e = reviewMastery(e, true, "medium", e.dueAt); // 3
    const grown = reviewMastery(e, true, "medium", e.dueAt);
    expect(grown.intervalDays).toBeGreaterThan(3);
  });

  it("a wrong answer resets the interval to 1 day and lowers ease", () => {
    let e = reviewMastery(initialMastery(NOW), true, "medium", NOW);
    e = reviewMastery(e, true, "medium", e.dueAt);
    e = reviewMastery(e, true, "medium", e.dueAt);
    const easeBefore = e.ease;
    const lapsed = reviewMastery(e, false, "medium", e.dueAt);
    expect(lapsed.intervalDays).toBe(1);
    expect(lapsed.ease).toBeLessThan(easeBefore);
  });

  it("clamps ease within [MIN_EASE, MAX_EASE]", () => {
    let e = initialMastery(NOW);
    for (let i = 0; i < 50; i++) e = reviewMastery(e, true, "hard", e.dueAt);
    expect(e.ease).toBeLessThanOrEqual(MAX_EASE);
    for (let i = 0; i < 50; i++) e = reviewMastery(e, false, "hard", e.dueAt);
    expect(e.ease).toBeGreaterThanOrEqual(MIN_EASE);
  });
});

describe("isDue / overdueDays", () => {
  it("is due once now passes dueAt", () => {
    const e = reviewMastery(initialMastery(NOW), true, "medium", NOW); // due +1d
    expect(isDue(e, NOW)).toBe(false);
    expect(isDue(e, NOW + 1 * DAY)).toBe(true);
    expect(isDue(e, NOW + 2 * DAY)).toBe(true);
  });

  it("overdueDays is positive when past due, negative before", () => {
    const e = reviewMastery(initialMastery(NOW), true, "medium", NOW);
    expect(overdueDays(e, NOW + 3 * DAY)).toBeCloseTo(2, 5);
    expect(overdueDays(e, NOW)).toBeCloseTo(-1, 5);
  });
});

describe("dueTopics ordering + filtering", () => {
  it("excludes never-practiced topics and orders most-overdue first", () => {
    const seen = (over: number, mastery: number): TopicMasteryEntry => ({
      ...initialMastery(NOW),
      attempts: 1,
      mastery,
      intervalDays: 1,
      dueAt: NOW - over * DAY,
    });
    const map: Record<string, TopicMasteryEntry> = {
      fresh: initialMastery(NOW), // attempts 0 → excluded
      a: seen(1, 50),
      b: seen(5, 50), // most overdue
      c: seen(5, 20), // same overdue as b, lower mastery → first
    };
    const due = dueTopics(map, NOW);
    expect(due).not.toContain("fresh");
    expect(due[0]).toBe("c");
    expect(due[1]).toBe("b");
    expect(due[2]).toBe("a");
  });

  it("returns nothing when no practiced topic is due", () => {
    const e = reviewMastery(initialMastery(NOW), true, "medium", NOW); // due +1d
    expect(dueTopics({ a: e }, NOW)).toEqual([]);
  });
});

describe("masteryTier", () => {
  it("buckets by mastery, with unseen → new", () => {
    expect(masteryTier(undefined)).toBe("new");
    expect(masteryTier(initialMastery(NOW))).toBe("new");
    const at = (m: number): TopicMasteryEntry => ({
      ...initialMastery(NOW),
      attempts: 3,
      mastery: m,
    });
    expect(masteryTier(at(10))).toBe("learning");
    expect(masteryTier(at(50))).toBe("familiar");
    expect(masteryTier(at(70))).toBe("strong");
    expect(masteryTier(at(95))).toBe("mastered");
  });
});
