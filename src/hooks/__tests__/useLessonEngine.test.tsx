import { describe, expect, it, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import type { Lesson } from "../../types/content";

// The engine only writes progress through progressService; mock it so we can
// drive the state machine without Firebase and assert purely on the feedback
// message that a given wrong choice surfaces.
vi.mock("../../services/progressService", () => ({
  awardCourseMilestones: vi.fn().mockResolvedValue(undefined),
  awardMilestones: vi.fn().mockResolvedValue(undefined),
  completeLesson: vi.fn().mockResolvedValue({ unlockedLessonId: null }),
  getCourseProgress: vi.fn().mockResolvedValue({
    unlockedLessonIds: ["test-lesson"],
    completedLessonIds: [],
    masteryByLesson: {},
  }),
  getLessonProgress: vi.fn().mockResolvedValue(null),
  getStreak: vi.fn().mockResolvedValue({ milestoneIds: [] }),
  recordDailyActivity: vi
    .fn()
    .mockResolvedValue({ currentStreak: 1, milestoneIds: [] }),
  recordStepAttempt: vi.fn().mockResolvedValue(undefined),
  recordStepResult: vi.fn().mockResolvedValue(undefined),
  resetLessonProgress: vi.fn().mockResolvedValue(undefined),
  startLesson: vi.fn().mockResolvedValue(undefined),
}));

import { useLessonEngine } from "../useLessonEngine";

const lesson: Lesson = {
  id: "test-lesson",
  title: "Test",
  order: 1,
  estimatedMinutes: 1,
  coreIdea: "test",
  steps: [
    {
      id: "mc",
      type: "multipleChoice",
      prompt: "Pick one",
      interactionConfig: {
        options: [
          { id: "right", label: "Right" },
          { id: "tooEarly", label: "Too early" },
          { id: "tooHigh", label: "Too high" },
        ],
      },
      correctAnswer: { optionId: "right" },
      feedback: {
        correct: "Nice.",
        incorrect: "Generic fallback.",
        incorrectByOption: {
          tooEarly: "Tailored: the curve is still shallow there.",
          tooHigh: "Tailored: height is not speed.",
        },
      },
    },
  ],
};

const user = { uid: "u1" } as User;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useLessonEngine wrong-answer feedback", () => {
  it("surfaces the tailored message for the specific wrong option", async () => {
    const { result } = renderHook(() => useLessonEngine(user, lesson));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.authorized).toBe(true);

    await act(async () => {
      await result.current.onAnswer(false, "tooEarly");
    });

    expect(result.current.feedback.state).toBe("incorrect");
    expect(result.current.feedback.message).toBe(
      "Tailored: the curve is still shallow there.",
    );
  });

  it("falls back to the generic incorrect message for an unmapped option", async () => {
    const { result } = renderHook(() => useLessonEngine(user, lesson));
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      // No tailored entry exists for this id, nor for a missing id.
      await result.current.onAnswer(false, "unmapped");
    });

    expect(result.current.feedback.message).toBe("Generic fallback.");
  });

  it("falls back to the generic message when no option id is provided", async () => {
    const { result } = renderHook(() => useLessonEngine(user, lesson));
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.onAnswer(false);
    });

    expect(result.current.feedback.message).toBe("Generic fallback.");
  });
});
