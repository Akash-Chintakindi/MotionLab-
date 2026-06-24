import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConceptStep } from "../ConceptStep";
import type { LessonStep } from "../../../types/content";

const step: LessonStep = {
  id: "concept",
  type: "concept",
  prompt: "The derivative",
  interactionConfig: {
    formula: "v(t) = dx/dt",
    body: ["Velocity is the slope of position."],
  },
  correctAnswer: null,
  feedback: { correct: "", incorrect: "" },
};

describe("ConceptStep", () => {
  it("renders the formula and body", () => {
    render(<ConceptStep step={step} locked={false} onAnswer={vi.fn()} />);
    expect(screen.getByText("v(t) = dx/dt")).toBeInTheDocument();
    expect(
      screen.getByText("Velocity is the slope of position."),
    ).toBeInTheDocument();
  });
});
