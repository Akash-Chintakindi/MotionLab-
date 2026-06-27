import { beforeEach, describe, expect, it, vi } from "vitest";

const getCourseProgress = vi.fn<(uid: string) => Promise<unknown>>();
const persistTopicMastery =
  vi.fn<(uid: string, topicId: string, entry: unknown) => Promise<void>>();

vi.mock("../progressService", () => ({
  getCourseProgress: (uid: string) => getCourseProgress(uid),
  persistTopicMastery: (uid: string, topicId: string, entry: unknown) =>
    persistTopicMastery(uid, topicId, entry),
}));

import {
  getDueTopicIds,
  getMasteryMap,
  loadMastery,
  recordTopicResult,
  resetMastery,
} from "../masteryStore";

beforeEach(() => {
  resetMastery();
  getCourseProgress.mockReset();
  persistTopicMastery.mockReset();
  persistTopicMastery.mockResolvedValue(undefined);
});

describe("masteryStore", () => {
  it("loads an existing map once and caches it", async () => {
    getCourseProgress.mockResolvedValue({
      topicMastery: { "lesson-1-position-velocity": { attempts: 2 } },
    });
    await loadMastery("u1");
    expect(getMasteryMap()["lesson-1-position-velocity"]?.attempts).toBe(2);

    // Second load for the same uid does not re-read.
    await loadMastery("u1");
    expect(getCourseProgress).toHaveBeenCalledTimes(1);
  });

  it("records a result, updates the map, and persists it", async () => {
    getCourseProgress.mockResolvedValue({ topicMastery: {} });
    await loadMastery("u1");

    await recordTopicResult("u1", "lesson-2-velocity-acceleration", true, "medium");

    const entry = getMasteryMap()["lesson-2-velocity-acceleration"];
    expect(entry?.attempts).toBe(1);
    expect(entry?.correct).toBe(1);
    expect(entry?.mastery).toBeGreaterThan(0);
    expect(persistTopicMastery).toHaveBeenCalledWith(
      "u1",
      "lesson-2-velocity-acceleration",
      expect.objectContaining({ attempts: 1 }),
    );
  });

  it("does not overwrite existing Firestore state when recording before an explicit load", async () => {
    // The user already has 5 attempts on this topic in Firestore.
    getCourseProgress.mockResolvedValue({
      topicMastery: {
        "lesson-3-displacement-area": {
          attempts: 5,
          correct: 5,
          mastery: 90,
          ease: 2.6,
          intervalDays: 10,
          dueAt: 0,
          lastSeenAt: 0,
          lastResult: true,
        },
      },
    });

    // Record without calling loadMastery first — it must self-load.
    await recordTopicResult("u1", "lesson-3-displacement-area", true, "hard");

    expect(getCourseProgress).toHaveBeenCalled();
    const entry = getMasteryMap()["lesson-3-displacement-area"];
    expect(entry?.attempts).toBe(6); // 5 + 1, not reset to 1
  });

  it("computes the due queue from recorded results", async () => {
    getCourseProgress.mockResolvedValue({ topicMastery: {} });
    await loadMastery("u1");

    const longAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    await recordTopicResult("u1", "lesson-1-position-velocity", true, "easy", longAgo);

    // Recorded a month ago with a 1-day interval → now overdue.
    expect(getDueTopicIds()).toContain("lesson-1-position-velocity");
  });

  it("resets state on sign-out", async () => {
    getCourseProgress.mockResolvedValue({
      topicMastery: { "lesson-1-position-velocity": { attempts: 1 } },
    });
    await loadMastery("u1");
    expect(Object.keys(getMasteryMap())).toHaveLength(1);
    resetMastery();
    expect(Object.keys(getMasteryMap())).toHaveLength(0);
  });
});
