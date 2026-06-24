import { describe, expect, it } from "vitest";
import { course, getLesson, getNextLessonId } from "../course";
import { getCurve } from "../../lib/curves";
import { getPlotFn } from "../../lib/functions";
import { stepRequiresAnswer } from "../../components/steps/types";
import type {
  GraphConfig,
  GraphDragConfig,
  MultipleChoiceConfig,
  NumericConfig,
  PlotConfig,
  SortConfig,
} from "../../types/content";

describe("course structure", () => {
  it("has exactly 7 lessons with unique sequential orders", () => {
    expect(course.lessons).toHaveLength(7);
    const orders = course.lessons.map((l) => l.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("has globally unique lesson ids", () => {
    const ids = course.lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("links lessons in order and ends with null", () => {
    expect(getNextLessonId(course.lessons[0].id)).toBe(course.lessons[1].id);
    expect(getNextLessonId(course.lessons[6].id)).toBeNull();
  });

  it("lesson 1 is fully authored", () => {
    const l1 = getLesson("lesson-1-position-velocity");
    expect(l1).toBeDefined();
    expect(l1!.steps.length).toBeGreaterThanOrEqual(8);
  });

  it("all 7 lessons are fully authored", () => {
    for (const lesson of course.lessons) {
      expect(lesson.steps.length).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("step validity", () => {
  const allSteps = course.lessons.flatMap((l) =>
    l.steps.map((s) => ({ lessonId: l.id, step: s })),
  );

  it("every step has unique id within its lesson", () => {
    for (const lesson of course.lessons) {
      const ids = lesson.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("every step has a prompt and correct/incorrect feedback", () => {
    for (const { step } of allSteps) {
      expect(step.prompt.length).toBeGreaterThan(0);
      expect(step.feedback).toBeDefined();
      if (stepRequiresAnswer(step)) {
        expect(step.feedback.incorrect.length).toBeGreaterThan(0);
      }
    }
  });

  it("multipleChoice correct answers reference a real option", () => {
    for (const { step } of allSteps) {
      if (step.type !== "multipleChoice") continue;
      const cfg = step.interactionConfig as MultipleChoiceConfig;
      const answer = step.correctAnswer as { optionId: string };
      expect(cfg.options.map((o) => o.id)).toContain(answer.optionId);
    }
  });

  it("predict graphDrag answers reference a real region", () => {
    for (const { step } of allSteps) {
      if (step.type !== "graphDrag") continue;
      const cfg = step.interactionConfig as GraphDragConfig;
      if (cfg.mode !== "predict") {
        expect(step.correctAnswer).toBeNull();
        continue;
      }
      const answer = step.correctAnswer as { regionId: string };
      const regionIds = (cfg.graph.regions ?? []).map((r) => r.id);
      expect(regionIds).toContain(answer.regionId);
    }
  });

  it("sort answers map every item to a real bucket", () => {
    for (const { step } of allSteps) {
      if (step.type !== "sort") continue;
      const cfg = step.interactionConfig as SortConfig;
      const answer = step.correctAnswer as Record<string, string>;
      const itemIds = cfg.items.map((i) => i.id).sort();
      const bucketIds = cfg.buckets.map((b) => b.id);
      expect(Object.keys(answer).sort()).toEqual(itemIds);
      for (const bucketId of Object.values(answer)) {
        expect(bucketIds).toContain(bucketId);
      }
    }
  });

  it("numeric answers are numbers with a tolerance", () => {
    for (const { step } of allSteps) {
      if (step.type !== "numeric") continue;
      const cfg = step.interactionConfig as NumericConfig;
      const answer = step.correctAnswer as { value: number };
      expect(typeof answer.value).toBe("number");
      expect(cfg.tolerance).toBeGreaterThan(0);
    }
  });

  it("every referenced curve and plot preset resolves", () => {
    for (const { step } of allSteps) {
      const cfg = step.interactionConfig as Record<string, unknown>;
      const graph = cfg.graph as GraphConfig | undefined;
      if (graph) expect(getCurve(graph.curve)).toBeDefined();
      const plot = cfg.plot as PlotConfig | undefined;
      if (plot) expect(getPlotFn(plot.preset)).toBeDefined();
    }
  });
});
