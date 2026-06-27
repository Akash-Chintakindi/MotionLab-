import { describe, expect, it } from "vitest";
import {
  computeStreak,
  dailyCountFor,
  dailyQuestionAnswered,
  DAILY_GOAL,
  EMPTY_STREAK,
  MAX_FREEZES,
  recordDailyQuestion,
  recordProblem,
  todayISO,
} from "../streak";

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

  it("spends a freeze to bridge a single missed day", () => {
    let s = computeStreak({ ...EMPTY_STREAK, freezes: 1 }, "2026-01-01");
    s = computeStreak(s, "2026-01-02"); // streak 2, still 1 freeze
    s = computeStreak(s, "2026-01-04"); // missed the 3rd → freeze bridges
    expect(s.currentStreak).toBe(3);
    expect(s.freezes).toBe(0);
  });

  it("still resets when no freeze is available for a missed day", () => {
    let s = computeStreak(EMPTY_STREAK, "2026-01-01");
    s = computeStreak(s, "2026-01-03"); // gap of 2, no freeze
    expect(s.currentStreak).toBe(1);
  });
});

describe("recordProblem (daily goal)", () => {
  it("counts problems for the day and resets on a new day", () => {
    let s = recordProblem(EMPTY_STREAK, "2026-01-01");
    s = recordProblem(s, "2026-01-01");
    expect(s.dailyCount).toBe(2);
    expect(dailyCountFor(s, "2026-01-01")).toBe(2);

    s = recordProblem(s, "2026-01-02");
    expect(s.dailyCount).toBe(1);
    expect(dailyCountFor(s, "2026-01-02")).toBe(1);
  });

  it("ignores a stale count from a previous day", () => {
    const s = recordProblem(EMPTY_STREAK, "2026-01-01");
    expect(dailyCountFor(s, "2026-01-02")).toBe(0);
  });

  it("banks exactly one freeze when the daily goal is reached", () => {
    let s = EMPTY_STREAK;
    for (let i = 0; i < DAILY_GOAL; i += 1) {
      s = recordProblem(s, "2026-01-01");
    }
    expect(s.dailyCount).toBe(DAILY_GOAL);
    expect(s.freezes).toBe(1);

    // Extra problems the same day don't keep awarding freezes.
    s = recordProblem(s, "2026-01-01");
    expect(s.freezes).toBe(1);
  });

  it("caps banked freezes at MAX_FREEZES", () => {
    let s: typeof EMPTY_STREAK = { ...EMPTY_STREAK };
    for (let day = 1; day <= MAX_FREEZES + 2; day += 1) {
      const date = `2026-01-${String(day).padStart(2, "0")}`;
      for (let i = 0; i < DAILY_GOAL; i += 1) s = recordProblem(s, date);
    }
    expect(s.freezes).toBe(MAX_FREEZES);
  });
});

describe("recordDailyQuestion", () => {
  it("starts the daily-question streak at 1 and stores correctness", () => {
    const s = recordDailyQuestion(EMPTY_STREAK, "2026-02-01", true);
    expect(s.dailyQuestionStreak).toBe(1);
    expect(s.dailyQuestionDate).toBe("2026-02-01");
    expect(s.dailyQuestionCorrect).toBe(true);
  });

  it("increments on consecutive days regardless of correctness", () => {
    let s = recordDailyQuestion(EMPTY_STREAK, "2026-02-01", true);
    s = recordDailyQuestion(s, "2026-02-02", false);
    expect(s.dailyQuestionStreak).toBe(2);
    expect(s.dailyQuestionCorrect).toBe(false);
  });

  it("does not double-count the same day", () => {
    let s = recordDailyQuestion(EMPTY_STREAK, "2026-02-01", true);
    s = recordDailyQuestion(s, "2026-02-01", false);
    expect(s.dailyQuestionStreak).toBe(1);
    expect(s.dailyQuestionCorrect).toBe(true); // unchanged
  });

  it("resets after a missed day", () => {
    let s = recordDailyQuestion(EMPTY_STREAK, "2026-02-01", true);
    s = recordDailyQuestion(s, "2026-02-03", true); // skipped the 2nd
    expect(s.dailyQuestionStreak).toBe(1);
  });

  it("dailyQuestionAnswered reflects today's answer", () => {
    const s = recordDailyQuestion(EMPTY_STREAK, "2026-02-01", true);
    expect(dailyQuestionAnswered(s, "2026-02-01")).toBe(true);
    expect(dailyQuestionAnswered(s, "2026-02-02")).toBe(false);
  });
});

describe("todayISO", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
