import { describe, expect, it } from "vitest";
import {
  accuracyMilestonesFor,
  courseMilestonesFor,
  getMilestone,
  masteryMilestonesFor,
  milestoneCatalog,
  quizMilestonesFor,
  streakMilestonesFor,
  tripleThreatMilestonesFor,
} from "../milestones";

describe("streakMilestonesFor", () => {
  it("awards nothing below the first tier", () => {
    expect(streakMilestonesFor(2)).toEqual([]);
  });
  it("awards cumulative tiers as the streak grows", () => {
    expect(streakMilestonesFor(3)).toEqual(["streak-3"]);
    expect(streakMilestonesFor(7)).toEqual(["streak-3", "streak-7"]);
    expect(streakMilestonesFor(60)).toEqual([
      "streak-3",
      "streak-7",
      "streak-14",
      "streak-30",
      "streak-60",
    ]);
  });
});

describe("courseMilestonesFor", () => {
  it("awards first-lesson after one lesson", () => {
    expect(courseMilestonesFor(1)).toEqual(["first-lesson"]);
  });
  it("awards halfway and complete at the right counts", () => {
    expect(courseMilestonesFor(4)).toContain("halfway");
    expect(courseMilestonesFor(7)).toContain("course-complete");
  });
});

describe("masteryMilestonesFor", () => {
  it("awards nothing below 80%", () => {
    expect(masteryMilestonesFor(0.79)).toEqual([]);
  });
  it("awards the sharp badge at 80%+", () => {
    expect(masteryMilestonesFor(0.8)).toEqual(["sharp"]);
  });
  it("awards both sharp and flawless at 100%", () => {
    expect(masteryMilestonesFor(1)).toEqual(["sharp", "flawless"]);
  });
});

describe("accuracyMilestonesFor", () => {
  it("awards per-lesson badges from the best lesson", () => {
    expect(accuracyMilestonesFor({ a: 0.85, b: 0.5 }, 7)).toEqual(["sharp"]);
    expect(accuracyMilestonesFor({ a: 1, b: 0.5 }, 7)).toEqual([
      "sharp",
      "flawless",
    ]);
  });
  it("awards triple-ace at three perfect lessons", () => {
    expect(
      accuracyMilestonesFor({ a: 1, b: 1, c: 1 }, 7),
    ).toContain("triple-ace");
  });
  it("awards honor-roll and perfectionist only when all lessons qualify", () => {
    const partial = accuracyMilestonesFor({ a: 1, b: 0.9 }, 7);
    expect(partial).not.toContain("honor-roll");
    expect(partial).not.toContain("perfectionist");

    const allEighty = accuracyMilestonesFor(
      { a: 0.8, b: 0.9, c: 0.85, d: 1, e: 0.8, f: 0.95, g: 0.82 },
      7,
    );
    expect(allEighty).toContain("honor-roll");
    expect(allEighty).not.toContain("perfectionist");

    const allPerfect = accuracyMilestonesFor(
      { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1, g: 1 },
      7,
    );
    expect(allPerfect).toContain("perfectionist");
    expect(allPerfect).toContain("honor-roll");
  });
});

describe("quizMilestonesFor", () => {
  it("awards nothing when no quizzes are finished", () => {
    expect(quizMilestonesFor({}, 7)).toEqual([]);
  });
  it("awards Sharp Mind at 80%+ and Quiz Ace at 100% on any quiz", () => {
    expect(quizMilestonesFor({ a: 80 }, 7)).toEqual(["quiz-sharp"]);
    expect(quizMilestonesFor({ a: 100, b: 30 }, 7)).toEqual([
      "quiz-sharp",
      "quiz-ace",
    ]);
    expect(quizMilestonesFor({ a: 79 }, 7)).toEqual([]);
  });
  it("awards Hat Trick at three perfect quizzes", () => {
    expect(quizMilestonesFor({ a: 100, b: 100, c: 100 }, 7)).toContain(
      "quiz-hat-trick",
    );
    expect(quizMilestonesFor({ a: 100, b: 100 }, 7)).not.toContain(
      "quiz-hat-trick",
    );
  });
  it("awards champion/honor-roll/perfectionist only when all quizzes qualify", () => {
    const partial = quizMilestonesFor({ a: 100, b: 90 }, 7);
    expect(partial).not.toContain("quiz-champion");

    const allDone = quizMilestonesFor(
      { a: 70, b: 90, c: 85, d: 100, e: 80, f: 95, g: 60 },
      7,
    );
    expect(allDone).toContain("quiz-champion");
    expect(allDone).not.toContain("quiz-honor-roll"); // a 70 & g 60 below 80

    const allEighty = quizMilestonesFor(
      { a: 80, b: 90, c: 85, d: 100, e: 80, f: 95, g: 82 },
      7,
    );
    expect(allEighty).toContain("quiz-honor-roll");
    expect(allEighty).not.toContain("quiz-perfectionist");

    const allPerfect = quizMilestonesFor(
      { a: 100, b: 100, c: 100, d: 100, e: 100, f: 100, g: 100 },
      7,
    );
    expect(allPerfect).toContain("quiz-perfectionist");
    expect(allPerfect).toContain("quiz-honor-roll");
  });
});

describe("tripleThreatMilestonesFor", () => {
  it("awards nothing until one lesson has Learn + Practice + Quiz", () => {
    expect(tripleThreatMilestonesFor(["a"], {}, {})).toEqual([]);
    expect(tripleThreatMilestonesFor(["a"], { a: 50 }, {})).toEqual([]);
    expect(tripleThreatMilestonesFor([], { a: 50 }, { a: 90 })).toEqual([]);
  });
  it("awards when the same lesson clears all three modes", () => {
    expect(
      tripleThreatMilestonesFor(["a", "b"], { a: 0 }, { a: 100 }),
    ).toEqual(["triple-threat"]);
  });
});

describe("getMilestone", () => {
  it("resolves known ids and returns undefined otherwise", () => {
    expect(getMilestone("first-lesson")?.label).toMatch(/First lesson/);
    expect(getMilestone("flawless")?.rarity).toBe("rare");
    expect(getMilestone("perfectionist")?.rarity).toBe("legendary");
    expect(getMilestone("quiz-ace")?.rarity).toBe("rare");
    expect(getMilestone("quiz-perfectionist")?.rarity).toBe("legendary");
    expect(getMilestone("triple-threat")?.label).toBe("Triple Threat");
    expect(getMilestone("nope")).toBeUndefined();
  });
});

describe("milestoneCatalog", () => {
  it("groups every badge for display", () => {
    const groups = milestoneCatalog();
    const total = groups.reduce((n, g) => n + g.milestones.length, 0);
    expect(groups.map((g) => g.title)).toEqual([
      "Accuracy",
      "Quizzes",
      "Course progress",
      "Streaks",
      "Challenges",
    ]);
    expect(total).toBe(21);
  });
});
