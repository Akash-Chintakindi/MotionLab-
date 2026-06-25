import { describe, expect, it, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAdaptivePractice } from "../useAdaptivePractice";
import type {
  AIPracticeQuestion,
  PracticeTopic,
} from "../../ai/practiceTypes";

vi.mock("../../ai/practiceService", () => ({
  generatePracticeQuestion: vi.fn(),
}));

import { generatePracticeQuestion } from "../../ai/practiceService";

const mockGenerate = vi.mocked(generatePracticeQuestion);

const topic: PracticeTopic = {
  id: "lesson-1-position-velocity",
  title: "Position & Velocity",
  blurb: "Slope of position is velocity.",
};

function mcQuestion(id: string): AIPracticeQuestion {
  return {
    id,
    type: "multipleChoice",
    prompt: `What is the velocity in ${id}?`,
    options: [
      { id: "a", label: "Correct one" },
      { id: "b", label: "Wrong one" },
    ],
    correctOptionId: "a",
    explanation: `Explanation for ${id}.`,
  };
}

beforeEach(() => {
  mockGenerate.mockReset();
});

describe("useAdaptivePractice", () => {
  it("loads a question when the session starts", async () => {
    mockGenerate.mockResolvedValueOnce(mcQuestion("q1"));

    const { result } = renderHook(() => useAdaptivePractice(topic, "easy"));

    expect(result.current.phase).toBe("loading");
    await waitFor(() => expect(result.current.phase).toBe("question"));
    expect(result.current.question?.id).toBe("q1");
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ topic, difficulty: "easy" }),
    );
  });

  it("marks a correct MC answer, exposes feedback, and advances to next", async () => {
    mockGenerate.mockResolvedValueOnce(mcQuestion("q1"));

    const { result } = renderHook(() => useAdaptivePractice(topic, "easy"));
    await waitFor(() => expect(result.current.phase).toBe("question"));

    act(() => result.current.submit("a"));

    expect(result.current.lastCorrect).toBe(true);
    expect(result.current.phase).toBe("feedback");
    expect(result.current.results).toEqual([true]);
    expect(result.current.question?.explanation).toBe("Explanation for q1.");

    mockGenerate.mockResolvedValueOnce(mcQuestion("q2"));
    act(() => result.current.next());

    await waitFor(() => expect(result.current.phase).toBe("question"));
    expect(result.current.question?.id).toBe("q2");
    expect(result.current.lastCorrect).toBeNull();
  });

  it("marks a wrong MC answer as incorrect", async () => {
    mockGenerate.mockResolvedValueOnce(mcQuestion("q1"));

    const { result } = renderHook(() => useAdaptivePractice(topic, "easy"));
    await waitFor(() => expect(result.current.phase).toBe("question"));

    act(() => result.current.submit("b"));

    expect(result.current.lastCorrect).toBe(false);
    expect(result.current.results).toEqual([false]);
  });

  it("suggests leveling up after a streak of correct answers", async () => {
    mockGenerate.mockResolvedValue(mcQuestion("loop"));

    const { result } = renderHook(() => useAdaptivePractice(topic, "easy"));
    await waitFor(() => expect(result.current.phase).toBe("question"));

    for (let i = 0; i < 3; i++) {
      act(() => result.current.submit("a"));
      if (i < 2) {
        act(() => result.current.next());
        await waitFor(() => expect(result.current.phase).toBe("question"));
      }
    }

    expect(result.current.results).toEqual([true, true, true]);
    expect(result.current.suggestion).toEqual({ kind: "levelUp", to: "medium" });
  });

  it("surfaces a friendly error when generation rejects", async () => {
    mockGenerate.mockRejectedValueOnce(new Error("model unavailable"));

    const { result } = renderHook(() => useAdaptivePractice(topic, "medium"));

    await waitFor(() => expect(result.current.phase).toBe("error"));
    expect(result.current.error).toBe("model unavailable");

    mockGenerate.mockResolvedValueOnce(mcQuestion("recovered"));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.phase).toBe("question"));
    expect(result.current.question?.id).toBe("recovered");
  });
});
