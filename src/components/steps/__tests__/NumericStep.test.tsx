import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumericStep } from "../NumericStep";
import type { LessonStep } from "../../../types/content";

const step: LessonStep = {
  id: "num",
  type: "numeric",
  prompt: "What is the velocity?",
  interactionConfig: { tolerance: 0.5, unit: "m/s" },
  correctAnswer: { value: 4 },
  feedback: { correct: "Yes", incorrect: "No" },
};

describe("NumericStep", () => {
  it("accepts values within tolerance", async () => {
    const onAnswer = vi.fn();
    render(<NumericStep step={step} locked={false} onAnswer={onAnswer} />);
    await userEvent.type(screen.getByLabelText("Numeric answer"), "4.3");
    await userEvent.click(screen.getByText("Check answer"));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it("rejects values outside tolerance", async () => {
    const onAnswer = vi.fn();
    render(<NumericStep step={step} locked={false} onAnswer={onAnswer} />);
    await userEvent.type(screen.getByLabelText("Numeric answer"), "6");
    await userEvent.click(screen.getByText("Check answer"));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});
