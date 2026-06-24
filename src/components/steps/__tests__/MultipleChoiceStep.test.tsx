import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MultipleChoiceStep } from "../MultipleChoiceStep";
import type { LessonStep } from "../../../types/content";

const step: LessonStep = {
  id: "mc-test",
  type: "multipleChoice",
  prompt: "Pick the right one",
  interactionConfig: {
    options: [
      { id: "a", label: "Option A" },
      { id: "b", label: "Option B" },
    ],
  },
  correctAnswer: { optionId: "b" },
  feedback: { correct: "Yes", incorrect: "No" },
};

describe("MultipleChoiceStep", () => {
  it("only grades after Submit, reporting wrong then right", async () => {
    const onAnswer = vi.fn();
    render(<MultipleChoiceStep step={step} locked={false} onAnswer={onAnswer} />);

    // Selecting an option does not grade yet.
    await userEvent.click(screen.getByText("Option A"));
    expect(onAnswer).not.toHaveBeenCalled();

    // Submitting grades the current selection.
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onAnswer).toHaveBeenLastCalledWith(false);

    // Re-select and submit again.
    await userEvent.click(screen.getByText("Option B"));
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onAnswer).toHaveBeenLastCalledWith(true);
  });

  it("requires a selection before Submit is enabled", async () => {
    const onAnswer = vi.fn();
    render(<MultipleChoiceStep step={step} locked={false} onAnswer={onAnswer} />);
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("disables options and hides Submit when locked", async () => {
    const onAnswer = vi.fn();
    render(<MultipleChoiceStep step={step} locked onAnswer={onAnswer} />);
    await userEvent.click(screen.getByText("Option B"));
    expect(onAnswer).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /submit/i })).toBeNull();
  });
});
