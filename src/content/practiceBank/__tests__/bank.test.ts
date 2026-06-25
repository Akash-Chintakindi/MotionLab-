import { describe, expect, it } from "vitest";

import { gradeQuestion } from "../../../lib/quiz";
import {
  bankQuestions,
  getRandomQuestion,
  questionsByDifficulty,
} from "../index";
import type { BankDifficulty } from "../types";

const TOPIC_IDS = [
  "lesson-1-position-velocity",
  "lesson-2-velocity-acceleration",
  "lesson-3-displacement-area",
  "lesson-4-acceleration-to-position",
  "lesson-5-two-dimensions",
  "lesson-6-projectile-motion",
  "lesson-7-mastery-challenge",
] as const;

const DIFFICULTIES: BankDifficulty[] = ["easy", "medium", "hard"];

/** Deterministic linear-congruential rng returning values in [0, 1). */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const bank = bankQuestions();

describe("practice bank — integrity", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(bank)).toBe(true);
    expect(bank.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = bank.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every item has a non-empty prompt and explanation", () => {
    for (const q of bank) {
      expect(typeof q.prompt).toBe("string");
      expect(q.prompt.trim().length).toBeGreaterThan(0);
      expect(typeof q.explanation).toBe("string");
      expect(q.explanation.trim().length).toBeGreaterThan(0);
    }
  });

  it("every item has a valid topicId", () => {
    for (const q of bank) {
      expect(TOPIC_IDS).toContain(q.topicId as (typeof TOPIC_IDS)[number]);
    }
  });

  it("every item has a valid difficulty", () => {
    for (const q of bank) {
      expect(DIFFICULTIES).toContain(q.difficulty);
    }
  });

  it("every item has a valid type and category", () => {
    for (const q of bank) {
      expect(["multipleChoice", "numeric"]).toContain(q.type);
      expect(["conceptual", "calculation"]).toContain(q.category);
    }
  });
});

describe("practice bank — multiple choice items", () => {
  const mcItems = bank.filter((q) => q.type === "multipleChoice");

  it("contains multiple-choice items", () => {
    expect(mcItems.length).toBeGreaterThan(0);
  });

  it("each MC item has >=2 options with unique ids", () => {
    for (const q of mcItems) {
      expect(q.options).toBeDefined();
      const options = q.options!;
      expect(options.length).toBeGreaterThanOrEqual(2);
      const optionIds = options.map((o) => o.id);
      expect(new Set(optionIds).size).toBe(optionIds.length);
      for (const o of options) {
        expect(typeof o.label).toBe("string");
        expect(o.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("each MC item ideally has exactly 4 options with ids a..d", () => {
    for (const q of mcItems) {
      const optionIds = (q.options ?? []).map((o) => o.id);
      expect(optionIds).toEqual(["a", "b", "c", "d"]);
    }
  });

  it("each MC item has a correctOptionId present in its options", () => {
    for (const q of mcItems) {
      expect(q.correctOptionId).toBeDefined();
      const optionIds = (q.options ?? []).map((o) => o.id);
      expect(optionIds).toContain(q.correctOptionId);
    }
  });
});

describe("practice bank — numeric items", () => {
  const numericItems = bank.filter((q) => q.type === "numeric");

  it("contains numeric items", () => {
    expect(numericItems.length).toBeGreaterThan(0);
  });

  it("each numeric item has a finite value and positive tolerance", () => {
    for (const q of numericItems) {
      expect(typeof q.value).toBe("number");
      expect(Number.isFinite(q.value)).toBe(true);
      expect(typeof q.tolerance).toBe("number");
      expect(q.tolerance!).toBeGreaterThan(0);
    }
  });

  it("each numeric item has a non-empty unit", () => {
    for (const q of numericItems) {
      expect(typeof q.unit).toBe("string");
      expect(q.unit!.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("practice bank — distribution", () => {
  it("has at least 15 items per difficulty", () => {
    for (const d of DIFFICULTIES) {
      expect(questionsByDifficulty(d).length).toBeGreaterThanOrEqual(15);
    }
  });

  it("includes all 7 topics", () => {
    const present = new Set(bank.map((q) => q.topicId));
    for (const t of TOPIC_IDS) {
      expect(present.has(t)).toBe(true);
    }
  });

  it("spreads multiple topics across each difficulty", () => {
    for (const d of DIFFICULTIES) {
      const topics = new Set(questionsByDifficulty(d).map((q) => q.topicId));
      expect(topics.size).toBeGreaterThanOrEqual(5);
    }
  });

  it("has both question types and both categories", () => {
    const types = new Set(bank.map((q) => q.type));
    const categories = new Set(bank.map((q) => q.category));
    expect(types.has("multipleChoice")).toBe(true);
    expect(types.has("numeric")).toBe(true);
    expect(categories.has("conceptual")).toBe(true);
    expect(categories.has("calculation")).toBe(true);
  });
});

describe("questionsByDifficulty", () => {
  it("returns only items of the requested difficulty", () => {
    for (const d of DIFFICULTIES) {
      const items = questionsByDifficulty(d);
      expect(items.length).toBeGreaterThan(0);
      for (const q of items) {
        expect(q.difficulty).toBe(d);
      }
    }
  });
});

describe("getRandomQuestion", () => {
  it("returns an item of the requested difficulty", () => {
    for (const d of DIFFICULTIES) {
      const rng = makeRng(42);
      for (let i = 0; i < 50; i++) {
        const q = getRandomQuestion(d, [], rng);
        expect(q).toBeDefined();
        expect(q!.difficulty).toBe(d);
      }
    }
  });

  it("respects the exclude list when other items are available", () => {
    const easy = questionsByDifficulty("easy");
    const exclude = easy.slice(0, easy.length - 1).map((q) => q.id);
    const rng = makeRng(7);
    for (let i = 0; i < 50; i++) {
      const q = getRandomQuestion("easy", exclude, rng);
      expect(q).toBeDefined();
      expect(exclude).not.toContain(q!.id);
    }
  });

  it("falls back to the full pool when everything is excluded", () => {
    const medium = questionsByDifficulty("medium");
    const excludeAll = medium.map((q) => q.id);
    const rng = makeRng(99);
    const q = getRandomQuestion("medium", excludeAll, rng);
    expect(q).toBeDefined();
    expect(q!.difficulty).toBe("medium");
  });

  it("is deterministic for a fixed seed", () => {
    const a = getRandomQuestion("hard", [], makeRng(123));
    const b = getRandomQuestion("hard", [], makeRng(123));
    expect(a?.id).toBe(b?.id);
  });
});

describe("gradeQuestion integration (spot checks)", () => {
  function byId(id: string) {
    const q = bank.find((item) => item.id === id);
    if (!q) throw new Error(`Missing expected question: ${id}`);
    return q;
  }

  it("grades correct multiple-choice answers as correct", () => {
    const q = byId("bank-1-easy-2");
    expect(
      gradeQuestion(q, { kind: "option", optionId: q.correctOptionId! }),
    ).toBe(true);
    const wrong = (q.options ?? []).find((o) => o.id !== q.correctOptionId)!;
    expect(gradeQuestion(q, { kind: "option", optionId: wrong.id })).toBe(false);
  });

  it("grades correct numeric answers within tolerance", () => {
    const q = byId("bank-1-easy-1");
    expect(gradeQuestion(q, { kind: "numeric", value: String(q.value) })).toBe(
      true,
    );
    const farOff = String((q.value ?? 0) + (q.tolerance ?? 0) + 5);
    expect(gradeQuestion(q, { kind: "numeric", value: farOff })).toBe(false);
  });

  it("grades every numeric item correct at its own value", () => {
    for (const q of bank.filter((item) => item.type === "numeric")) {
      expect(
        gradeQuestion(q, { kind: "numeric", value: String(q.value) }),
      ).toBe(true);
    }
  });

  it("grades every MC item correct at its correctOptionId", () => {
    for (const q of bank.filter((item) => item.type === "multipleChoice")) {
      expect(
        gradeQuestion(q, { kind: "option", optionId: q.correctOptionId! }),
      ).toBe(true);
    }
  });
});
