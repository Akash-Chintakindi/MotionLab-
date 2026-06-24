import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphDragStep } from "../GraphDragStep";
import type { LessonStep } from "../../../types/content";

const predictStep: LessonStep = {
  id: "gd-predict",
  type: "graphDrag",
  prompt: "Tap the fastest region",
  interactionConfig: {
    mode: "predict",
    graph: {
      curve: "scurveSin",
      tMin: 0,
      tMax: 6,
      xMin: 0,
      xMax: 9,
      regions: [
        { id: "early", tStart: 0, tEnd: 2, label: "Early" },
        { id: "middle", tStart: 2, tEnd: 4, label: "Middle" },
        { id: "late", tStart: 4, tEnd: 6, label: "Late" },
      ],
    },
  },
  correctAnswer: { regionId: "middle" },
  feedback: { correct: "Yes", incorrect: "No" },
};

describe("GraphDragStep (predict)", () => {
  it("grades the selected region", async () => {
    const onAnswer = vi.fn();
    render(
      <GraphDragStep step={predictStep} locked={false} onAnswer={onAnswer} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Select Early region" }),
    );
    expect(onAnswer).toHaveBeenLastCalledWith(false);

    await userEvent.click(
      screen.getByRole("button", { name: "Select Middle region" }),
    );
    expect(onAnswer).toHaveBeenLastCalledWith(true);
  });
});
