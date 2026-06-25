import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerateParams } from "../practiceTypes";

// Mock the Firebase app instance so no real app is initialized.
vi.mock("../lib/firebase", () => ({ app: {} }));

// Holds the next mocked generateContent behavior; controllable per test.
const generateContent = vi.fn();

vi.mock("firebase/ai", () => {
  const passthrough = () => ({});
  return {
    getAI: vi.fn(() => ({})),
    GoogleAIBackend: class GoogleAIBackend {},
    getGenerativeModel: vi.fn(() => ({ generateContent })),
    Schema: {
      object: passthrough,
      array: passthrough,
      string: passthrough,
      number: passthrough,
      enumString: passthrough,
    },
  };
});

import { generatePracticeQuestion } from "../practiceService";

const params: GenerateParams = {
  topic: {
    id: "lesson-1",
    title: "Position & Velocity",
    blurb: "Relating position, velocity, and time.",
  },
  difficulty: "medium",
};

/** Make generateContent resolve with a model response wrapping `obj`. */
function resolveWith(obj: unknown) {
  generateContent.mockResolvedValueOnce({
    response: { text: () => JSON.stringify(obj) },
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

beforeEach(() => {
  generateContent.mockReset();
});

describe("generatePracticeQuestion", () => {
  it("normalizes a valid multipleChoice response", async () => {
    resolveWith({
      id: "model-supplied-id",
      type: "multipleChoice",
      prompt: "Which has the greater speed?",
      options: [
        { id: "a", label: "Car A" },
        { id: "b", label: "Car B" },
        { id: "c", label: "Car C" },
        { id: "d", label: "Car D" },
      ],
      correctOptionId: "c",
      explanation: "Because slope of x-t graph is largest.",
    });

    const q = await generatePracticeQuestion(params);

    expect(q.type).toBe("multipleChoice");
    expect(q.options).toHaveLength(4);
    expect(q.correctOptionId).toBe("c");
    expect(q.id).toMatch(UUID_RE);
    expect(q.id).not.toBe("model-supplied-id");
    expect(q.prompt).toBeTruthy();
    expect(q.explanation).toBeTruthy();
    // MC should not carry numeric-only fields.
    expect(q.value).toBeUndefined();
    expect(q.tolerance).toBeUndefined();
    expect(q.unit).toBeUndefined();
  });

  it("normalizes a valid numeric response and keeps explicit tolerance/unit", async () => {
    resolveWith({
      type: "numeric",
      prompt: "Final velocity after 3 s?",
      value: 29.4,
      tolerance: 0.5,
      unit: "m/s",
      explanation: "v = g t = 9.8 * 3.",
    });

    const q = await generatePracticeQuestion(params);

    expect(q.type).toBe("numeric");
    expect(q.value).toBe(29.4);
    expect(q.tolerance).toBe(0.5);
    expect(q.unit).toBe("m/s");
    expect(q.id).toMatch(UUID_RE);
    // numeric should not carry MC-only fields.
    expect(q.options).toBeUndefined();
    expect(q.correctOptionId).toBeUndefined();
  });

  it("applies a default tolerance when numeric tolerance is omitted", async () => {
    resolveWith({
      type: "numeric",
      prompt: "Displacement?",
      value: 100,
      unit: "m",
      explanation: "x = 100 m.",
    });

    const q = await generatePracticeQuestion(params);

    // Math.max(0.01, |value| * 0.02) = max(0.01, 2) = 2.
    expect(q.tolerance).toBe(2);
  });

  it("throws when correctOptionId matches no option", async () => {
    resolveWith({
      type: "multipleChoice",
      prompt: "Pick one.",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
        { id: "d", label: "D" },
      ],
      correctOptionId: "z",
      explanation: "Explanation.",
    });

    await expect(generatePracticeQuestion(params)).rejects.toThrow(
      /Please try again/i,
    );
  });

  it("throws when explanation is missing", async () => {
    resolveWith({
      type: "numeric",
      prompt: "Value?",
      value: 5,
      unit: "m",
    });

    await expect(generatePracticeQuestion(params)).rejects.toThrow(
      /Please try again/i,
    );
  });

  it("surfaces a friendly error when generateContent rejects", async () => {
    generateContent.mockRejectedValueOnce(new Error("network blew up"));

    await expect(generatePracticeQuestion(params)).rejects.toThrow(
      /Couldn't generate a practice problem\. Please try again\./,
    );
  });

  it("explains provisioning when the AI service is not enabled", async () => {
    generateContent.mockRejectedValueOnce(
      new Error("PERMISSION_DENIED: API has not been used"),
    );

    await expect(generatePracticeQuestion(params)).rejects.toThrow(
      /firebase init ailogic/,
    );
  });
});
