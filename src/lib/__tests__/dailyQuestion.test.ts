import { describe, expect, it } from "vitest";
import { dailyQuestion } from "../dailyQuestion";
import { bankQuestions } from "../../content/practiceBank";

describe("dailyQuestion", () => {
  it("is deterministic: the same date always maps to the same question", () => {
    expect(dailyQuestion("2026-03-15").id).toBe(dailyQuestion("2026-03-15").id);
  });

  it("returns a real bank question", () => {
    const ids = new Set(bankQuestions().map((q) => q.id));
    expect(ids.has(dailyQuestion("2026-03-15").id)).toBe(true);
  });

  it("varies across dates (not always the same question)", () => {
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2026, 0, 1 + i);
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${m}-${day}`;
    });
    const unique = new Set(dates.map((d) => dailyQuestion(d).id));
    expect(unique.size).toBeGreaterThan(1);
  });
});
