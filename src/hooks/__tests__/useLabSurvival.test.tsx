import { describe, expect, it, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  useLabSurvival,
  type LabRunConfig,
  type UseLabSurvival,
} from "../useLabSurvival";
import type { AIPracticeQuestion } from "../../ai/practiceTypes";

// Mock the AI service so no real Gemini call is ever made; the hook then
// exercises either the resolved AI path or the static-bank fallback.
vi.mock("../../ai/practiceService", () => ({
  generatePracticeQuestion: vi.fn(),
}));

import { generatePracticeQuestion } from "../../ai/practiceService";
import { setAiEnabled } from "../../lib/aiSettings";

const mockGenerate = vi.mocked(generatePracticeQuestion);

/** A deterministic multiple-choice AI question whose correct option is "a". */
function mcQuestion(id: string): AIPracticeQuestion {
  return {
    id,
    type: "multipleChoice",
    prompt: `Prompt for ${id}?`,
    options: [
      { id: "a", label: "Right" },
      { id: "b", label: "Wrong" },
    ],
    correctOptionId: "a",
    explanation: `Explanation for ${id}.`,
  };
}

/** The correct answer string for whatever question is currently shown. */
function correct(r: { current: UseLabSurvival }): string {
  const q = r.current.question!;
  return q.type === "multipleChoice"
    ? (q.correctOptionId ?? "")
    : String(q.value ?? 0);
}

/** A definitely-wrong answer string for whatever question is currently shown. */
function wrong(r: { current: UseLabSurvival }): string {
  const q = r.current.question!;
  if (q.type === "multipleChoice") {
    return (q.options ?? []).find((o) => o.id !== q.correctOptionId)?.id ?? "zz";
  }
  return String((q.value ?? 0) + 100000);
}

/** Begins a run and waits for the first question to load. */
async function start(
  r: { current: UseLabSurvival },
  config: LabRunConfig = { mode: "survival" },
) {
  act(() => r.current.begin(config));
  await waitFor(() => expect(r.current.phase).toBe("question"));
}

/** Submit a correct/incorrect answer; optionally advance to the next question. */
async function answer(
  r: { current: UseLabSurvival },
  pick: "correct" | "wrong",
  advance: boolean,
) {
  const value = pick === "correct" ? correct(r) : wrong(r);
  act(() => r.current.submit(value));
  if (advance && r.current.phase === "feedback") {
    act(() => r.current.next());
    await waitFor(() => expect(r.current.phase).toBe("question"));
  }
}

beforeEach(() => {
  mockGenerate.mockReset();
  // These tests exercise the AI path (and its bank fallback), so turn AI on;
  // the AI-off gating is covered in practiceQuestion.test.ts.
  localStorage.clear();
  setAiEnabled(true);
});

describe("useLabSurvival", () => {
  it("starts on the mode menu and only loads a question once a run begins", async () => {
    mockGenerate.mockResolvedValue(mcQuestion("q1"));
    const { result } = renderHook(() => useLabSurvival());

    // No question is generated until the player picks a mode.
    expect(result.current.phase).toBe("menu");
    expect(result.current.mode).toBeNull();
    expect(mockGenerate).not.toHaveBeenCalled();

    await start(result, { mode: "survival" });

    expect(result.current.mode).toBe("survival");
    expect(result.current.question?.source).toBe("ai");
    expect(result.current.question?.id).toBe("q1");
    expect(result.current.difficulty).toBe("easy");
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ difficulty: "easy" }),
    );
  });

  it("scores correct answers and shows feedback with the explanation", async () => {
    mockGenerate.mockResolvedValue(mcQuestion("q1"));
    const { result } = renderHook(() => useLabSurvival());
    await start(result);

    await answer(result, "correct", false);

    expect(result.current.lastCorrect).toBe(true);
    expect(result.current.phase).toBe("feedback");
    expect(result.current.score).toBe(1);
    expect(result.current.strikes).toBe(0);
    expect(result.current.question?.explanation).toBe("Explanation for q1.");
  });

  it("accrues a strike on a wrong answer", async () => {
    mockGenerate.mockResolvedValue(mcQuestion("q1"));
    const { result } = renderHook(() => useLabSurvival());
    await start(result);

    await answer(result, "wrong", false);

    expect(result.current.lastCorrect).toBe(false);
    expect(result.current.score).toBe(0);
    expect(result.current.strikes).toBe(1);
  });

  it("ends the run after three total strikes (Survival)", async () => {
    mockGenerate.mockResolvedValue(mcQuestion("loop"));
    const { result } = renderHook(() => useLabSurvival());
    await start(result);

    // One correct (score = 1), then three wrong (strikes = 3 → over).
    await answer(result, "correct", true);
    await answer(result, "wrong", true);
    await answer(result, "wrong", true);
    await answer(result, "wrong", false); // 3rd strike ends the run

    expect(result.current.strikes).toBe(3);
    expect(result.current.score).toBe(1);
    expect(result.current.phase).toBe("over");
    // The final question is retained so its explanation can be shown.
    expect(result.current.question).not.toBeNull();
  });

  it("bumps difficulty up after two correct in a row", async () => {
    mockGenerate.mockImplementation((params) =>
      Promise.resolve(mcQuestion(`q-${params.difficulty}`)),
    );
    const { result } = renderHook(() => useLabSurvival());
    await start(result);

    await answer(result, "correct", true); // easy #1
    expect(result.current.difficulty).toBe("easy");
    await answer(result, "correct", true); // easy #2 → medium

    expect(result.current.difficulty).toBe("medium");
    expect(mockGenerate).toHaveBeenLastCalledWith(
      expect.objectContaining({ difficulty: "medium" }),
    );
  });

  it("surfaces a lesson-review nudge after two easy misses but keeps playing", async () => {
    mockGenerate.mockResolvedValue(mcQuestion("loop"));
    const { result } = renderHook(() => useLabSurvival());
    await start(result);

    await answer(result, "wrong", true);
    await answer(result, "wrong", false); // second easy miss

    expect(result.current.reviewTopicId).not.toBeNull();
    expect(result.current.difficulty).toBe("easy");
    expect(result.current.strikes).toBe(2);
    expect(result.current.phase).toBe("feedback");
  });

  it("falls back to the static bank when the AI call throws", async () => {
    mockGenerate.mockRejectedValue(new Error("AI Logic not enabled"));
    const { result } = renderHook(() => useLabSurvival());
    await start(result);

    expect(result.current.question?.source).toBe("bank");
    expect(result.current.question?.difficulty).toBe("easy");

    // The bank question still grades and scores normally.
    await answer(result, "correct", false);
    expect(result.current.score).toBe(1);
  });

  it("compiles a weak-areas report from the run", async () => {
    mockGenerate.mockResolvedValue(mcQuestion("loop"));
    const { result } = renderHook(() => useLabSurvival());
    await start(result);

    await answer(result, "wrong", true);
    await answer(result, "wrong", true);
    await answer(result, "wrong", false); // 3rd strike → over

    expect(result.current.phase).toBe("over");
    expect(result.current.report.length).toBeGreaterThan(0);
    expect(result.current.report[0].missed).toBeGreaterThan(0);
  });

  it("returns to the menu and starts a fresh run", async () => {
    mockGenerate.mockResolvedValue(mcQuestion("loop"));
    const { result } = renderHook(() => useLabSurvival());
    await start(result);

    await answer(result, "wrong", true);
    await answer(result, "wrong", true);
    await answer(result, "wrong", false);
    expect(result.current.phase).toBe("over");

    act(() => result.current.toMenu());
    expect(result.current.phase).toBe("menu");
    expect(result.current.mode).toBeNull();

    await start(result);
    expect(result.current.score).toBe(0);
    expect(result.current.strikes).toBe(0);
    expect(result.current.difficulty).toBe("easy");
    expect(result.current.records).toEqual([]);
  });

  describe("Time mode", () => {
    it("tracks a countdown and never strikes out on a wrong answer", async () => {
      mockGenerate.mockResolvedValue(mcQuestion("loop"));
      const { result } = renderHook(() => useLabSurvival());
      await start(result, { mode: "time", durationSec: 60 });

      expect(result.current.mode).toBe("time");
      expect(result.current.durationSec).toBe(60);
      expect(result.current.timeRemaining).toBe(60);

      // Multiple wrong answers in Time mode keep the run alive (no strike-out).
      await answer(result, "wrong", true);
      await answer(result, "wrong", true);
      await answer(result, "wrong", false);

      expect(result.current.strikes).toBe(0);
      expect(result.current.phase).not.toBe("over");
    });

    it("ends the run when the clock reaches zero", async () => {
      mockGenerate.mockResolvedValue(mcQuestion("loop"));
      const { result } = renderHook(() => useLabSurvival());
      await start(result, { mode: "time", durationSec: 1 });

      await waitFor(() => expect(result.current.phase).toBe("over"), {
        timeout: 3000,
      });
      expect(result.current.timeRemaining).toBe(0);
    });
  });
});
