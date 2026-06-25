import { describe, expect, it } from "vitest";
import {
  applyAnswer,
  weakAreas,
  aiToLabQuestion,
  bankToLabQuestion,
  defaultNumericTolerance,
  INITIAL_ADAPTIVE,
  LEVEL_STREAK,
  type AdaptiveState,
  type AnswerRecord,
} from "../labAdaptive";
import type { AIPracticeQuestion } from "../../ai/practiceTypes";
import type { BankQuestion } from "../../content/practiceBank/types";

/** Fold a sequence of correct/incorrect answers through the controller. */
function run(
  start: AdaptiveState,
  results: boolean[],
): { state: AdaptiveState; reviews: number } {
  let state = start;
  let reviews = 0;
  for (const correct of results) {
    const res = applyAnswer(state, correct);
    state = res.next;
    if (res.reviewLesson) reviews += 1;
  }
  return { state, reviews };
}

describe("labAdaptive: applyAnswer", () => {
  it("uses the documented defaults", () => {
    expect(LEVEL_STREAK).toBe(2);
    expect(INITIAL_ADAPTIVE).toEqual({
      difficulty: "easy",
      correctStreak: 0,
      wrongStreak: 0,
    });
  });

  it("levels up after two correct in a row and resets streaks", () => {
    const r1 = applyAnswer(INITIAL_ADAPTIVE, true);
    expect(r1.next.correctStreak).toBe(1);
    expect(r1.next.difficulty).toBe("easy");

    const r2 = applyAnswer(r1.next, true);
    expect(r2.next).toEqual({
      difficulty: "medium",
      correctStreak: 0,
      wrongStreak: 0,
    });
    expect(r2.reviewLesson).toBe(false);
  });

  it("climbs easy → medium → hard and never past hard", () => {
    const { state } = run(INITIAL_ADAPTIVE, [
      true,
      true, // → medium
      true,
      true, // → hard
      true,
      true, // stays hard
    ]);
    expect(state.difficulty).toBe("hard");
  });

  it("levels down after two wrong in a row above easy", () => {
    const start: AdaptiveState = {
      difficulty: "hard",
      correctStreak: 0,
      wrongStreak: 0,
    };
    const r1 = applyAnswer(start, false);
    expect(r1.next.wrongStreak).toBe(1);
    const r2 = applyAnswer(r1.next, false);
    expect(r2.next).toEqual({
      difficulty: "medium",
      correctStreak: 0,
      wrongStreak: 0,
    });
    expect(r2.reviewLesson).toBe(false);
  });

  it("flags a lesson review (not a level change) on two easy misses", () => {
    const r1 = applyAnswer(INITIAL_ADAPTIVE, false);
    expect(r1.reviewLesson).toBe(false);
    const r2 = applyAnswer(r1.next, false);
    expect(r2.reviewLesson).toBe(true);
    expect(r2.next.difficulty).toBe("easy");
    expect(r2.next.wrongStreak).toBe(0);
  });

  it("re-flags review after another pair of easy misses", () => {
    const { reviews, state } = run(INITIAL_ADAPTIVE, [
      false,
      false, // review 1
      false,
      false, // review 2
    ]);
    expect(reviews).toBe(2);
    expect(state.difficulty).toBe("easy");
  });

  it("a correct answer breaks a wrong streak", () => {
    const { state } = run(INITIAL_ADAPTIVE, [false, true]);
    expect(state.wrongStreak).toBe(0);
    expect(state.correctStreak).toBe(1);
  });

  it("honors a custom streak threshold", () => {
    const r = applyAnswer(INITIAL_ADAPTIVE, true, 1);
    expect(r.next.difficulty).toBe("medium");
  });
});

describe("labAdaptive: weakAreas", () => {
  const rec = (
    topicId: string,
    correct: boolean,
    difficulty: AnswerRecord["difficulty"] = "easy",
  ): AnswerRecord => ({ topicId, difficulty, correct });

  it("is empty when nothing was missed", () => {
    expect(weakAreas([rec("a", true), rec("b", true)])).toEqual([]);
  });

  it("groups misses by topic, most missed first", () => {
    const report = weakAreas([
      rec("a", false, "easy"),
      rec("a", false, "medium"),
      rec("b", false, "hard"),
      rec("b", true),
      rec("c", true),
    ]);
    expect(report.map((w) => w.topicId)).toEqual(["a", "b"]);
    expect(report[0]).toMatchObject({
      topicId: "a",
      missed: 2,
      total: 2,
      difficulties: ["easy", "medium"],
    });
    expect(report[1]).toMatchObject({
      topicId: "b",
      missed: 1,
      total: 2,
      difficulties: ["hard"],
    });
  });

  it("orders struggled difficulties easy → hard", () => {
    const report = weakAreas([rec("a", false, "hard"), rec("a", false, "easy")]);
    expect(report[0].difficulties).toEqual(["easy", "hard"]);
  });
});

describe("labAdaptive: question adapters", () => {
  it("adapts a bank question, tagging its source", () => {
    const bank: BankQuestion = {
      id: "bank-1-easy-1",
      topicId: "lesson-1-position-velocity",
      difficulty: "easy",
      type: "numeric",
      category: "calculation",
      prompt: "v?",
      value: 4,
      tolerance: 0.1,
      unit: "m/s",
      explanation: "because",
    };
    const lab = bankToLabQuestion(bank);
    expect(lab.source).toBe("bank");
    expect(lab.topicId).toBe("lesson-1-position-velocity");
    expect(lab.value).toBe(4);
  });

  it("adapts an AI multiple-choice question", () => {
    const ai: AIPracticeQuestion = {
      id: "ai-1",
      type: "multipleChoice",
      prompt: "Which?",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      correctOptionId: "b",
      explanation: "B is right",
    };
    const lab = aiToLabQuestion(ai, "lesson-2-velocity-acceleration", "medium");
    expect(lab).toMatchObject({
      source: "ai",
      type: "multipleChoice",
      topicId: "lesson-2-velocity-acceleration",
      difficulty: "medium",
      correctOptionId: "b",
    });
    expect(lab.options).toHaveLength(2);
  });

  it("adapts an AI numeric question and fills a default tolerance", () => {
    const ai: AIPracticeQuestion = {
      id: "ai-2",
      type: "numeric",
      prompt: "How far?",
      value: 50,
      explanation: "x = 50 m",
    };
    const lab = aiToLabQuestion(ai, "lesson-4-acceleration-to-position", "hard");
    expect(lab.type).toBe("numeric");
    expect(lab.value).toBe(50);
    expect(lab.tolerance).toBe(defaultNumericTolerance(50));
  });
});
