import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GetPracticeParams } from "../practiceQuestion";

// Mock only the AI network call; the bank and the toggle store are real.
vi.mock("../practiceService", () => ({
  generatePracticeQuestion: vi.fn(),
}));

import { generatePracticeQuestion } from "../practiceService";
import { getPracticeQuestion } from "../practiceQuestion";
import { setAiEnabled } from "../../lib/aiSettings";

const mockGenerate = vi.mocked(generatePracticeQuestion);

const params: GetPracticeParams = {
  topic: {
    id: "lesson-1-position-velocity",
    title: "Position & Velocity",
    blurb: "Relating position, velocity, and time.",
  },
  difficulty: "easy",
};

beforeEach(() => {
  localStorage.clear();
  mockGenerate.mockReset();
});

describe("getPracticeQuestion", () => {
  it("uses the bank and makes NO callable call when AI is off (default)", async () => {
    const res = await getPracticeQuestion(params);

    expect(res.source).toBe("bank");
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(res.question.prompt).toBeTruthy();
  });

  it("calls the AI service and returns its question when AI is on", async () => {
    setAiEnabled(true);
    mockGenerate.mockResolvedValueOnce({
      id: "ai-1",
      type: "numeric",
      prompt: "What is v?",
      value: 4,
      tolerance: 0.1,
      unit: "m/s",
      explanation: "v = 4 m/s.",
    });

    const res = await getPracticeQuestion(params);

    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ topic: params.topic, difficulty: "easy" }),
    );
    expect(res.source).toBe("ai");
    expect(res.question.id).toBe("ai-1");
  });

  it("falls back to the bank when AI is on but the call fails", async () => {
    setAiEnabled(true);
    mockGenerate.mockRejectedValueOnce(new Error("model unavailable"));

    const res = await getPracticeQuestion(params);

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(res.source).toBe("bank");
    if (res.source === "bank") {
      expect(res.question.difficulty).toBe("easy");
    }
  });

  it("avoids excluded bank ids when drawing from the bank", async () => {
    // Deterministic rng picks the first item in the filtered pool.
    const res = await getPracticeQuestion({
      ...params,
      excludeBankIds: ["bank-1-easy-1"],
      rng: () => 0,
    });

    expect(res.source).toBe("bank");
    expect(res.question.id).not.toBe("bank-1-easy-1");
  });
});
