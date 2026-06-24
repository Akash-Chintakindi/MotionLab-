import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SortStep } from "../SortStep";
import type { LessonStep } from "../../../types/content";

const step: LessonStep = {
  id: "sort-test",
  type: "sort",
  prompt: "Sort the points",
  interactionConfig: {
    buckets: [
      { id: "positive", label: "Positive" },
      { id: "negative", label: "Negative" },
    ],
    items: [
      { id: "A", label: "Point A" },
      { id: "B", label: "Point B" },
    ],
  },
  correctAnswer: { A: "positive", B: "negative" },
  feedback: { correct: "Nice", incorrect: "Try again" },
};

function pick(itemLabel: string, bucketLabel: string) {
  const row = screen.getByText(itemLabel).closest("div")!.parentElement!;
  return userEvent.click(
    Array.from(row.querySelectorAll("button")).find(
      (b) => b.textContent === bucketLabel,
    )!,
  );
}

describe("SortStep", () => {
  it("grades correct when all items are placed correctly", async () => {
    const onAnswer = vi.fn();
    render(<SortStep step={step} locked={false} onAnswer={onAnswer} />);

    await pick("Point A", "Positive");
    await pick("Point B", "Negative");
    await userEvent.click(screen.getByText("Check answer"));

    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it("grades incorrect when an item is misplaced", async () => {
    const onAnswer = vi.fn();
    render(<SortStep step={step} locked={false} onAnswer={onAnswer} />);

    await pick("Point A", "Negative");
    await pick("Point B", "Negative");
    await userEvent.click(screen.getByText("Check answer"));

    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});
