import { describe, expect, it } from "vitest";
import { computeStreak, EMPTY_STREAK, todayISO } from "../streak";

describe("computeStreak", () => {
  it("starts a streak at 1 on first activity", () => {
    const next = computeStreak(EMPTY_STREAK, "2026-01-01");
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(1);
    expect(next.lastActivityDate).toBe("2026-01-01");
  });

  it("increments on consecutive days", () => {
    let s = computeStreak(EMPTY_STREAK, "2026-01-01");
    s = computeStreak(s, "2026-01-02");
    s = computeStreak(s, "2026-01-03");
    expect(s.currentStreak).toBe(3);
    expect(s.longestStreak).toBe(3);
  });

  it("does not double-count the same day", () => {
    let s = computeStreak(EMPTY_STREAK, "2026-01-01");
    s = computeStreak(s, "2026-01-01");
    expect(s.currentStreak).toBe(1);
  });

  it("resets after a missed day but keeps longest", () => {
    let s = computeStreak(EMPTY_STREAK, "2026-01-01");
    s = computeStreak(s, "2026-01-02");
    s = computeStreak(s, "2026-01-05"); // gap of 3
    expect(s.currentStreak).toBe(1);
    expect(s.longestStreak).toBe(2);
  });

  it("awards a streak milestone at 3 consecutive days", () => {
    let s = computeStreak(EMPTY_STREAK, "2026-01-01");
    expect(s.milestoneIds).not.toContain("streak-3");
    s = computeStreak(s, "2026-01-02");
    s = computeStreak(s, "2026-01-03");
    expect(s.milestoneIds).toContain("streak-3");
  });
});

describe("todayISO", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
