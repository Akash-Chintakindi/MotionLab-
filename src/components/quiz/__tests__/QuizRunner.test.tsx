import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QuizRunner } from "../QuizRunner";
import type { Quiz } from "../../../types/content";

const quiz: Quiz = {
  lessonId: "test",
  questions: [
    {
      id: "q1",
      type: "multipleChoice",
      category: "conceptual",
      prompt: "Slope of x(t) is?",
      options: [
        { id: "a", label: "velocity" },
        { id: "b", label: "acceleration" },
      ],
      correctOptionId: "a",
      explanation: "Slope is velocity.",
    },
    {
      id: "q2",
      type: "numeric",
      category: "calculation",
      prompt: "2 + 2?",
      value: 4,
      tolerance: 0.1,
      explanation: "It is four.",
    },
  ],
};

function renderRunner(onComplete = vi.fn()) {
  render(
    <MemoryRouter>
      <QuizRunner quiz={quiz} onComplete={onComplete} />
    </MemoryRouter>,
  );
  return onComplete;
}

describe("QuizRunner", () => {
  it("runs answer -> feedback -> next -> score with immediate feedback", async () => {
    const onComplete = renderRunner();

    expect(screen.getByTestId("quiz-counter")).toHaveTextContent(
      "Question 1 of 2",
    );

    // Answer Q1 correctly.
    await userEvent.click(screen.getByText("velocity"));
    await userEvent.click(screen.getByTestId("quiz-submit"));
    expect(screen.getByText("Correct")).toBeInTheDocument();
    expect(screen.getByText("Slope is velocity.")).toBeInTheDocument();

    // Advance to Q2.
    await userEvent.click(screen.getByTestId("quiz-continue"));
    expect(screen.getByTestId("quiz-counter")).toHaveTextContent(
      "Question 2 of 2",
    );

    // Answer Q2 correctly.
    await userEvent.type(screen.getByLabelText("Numeric answer"), "4");
    await userEvent.click(screen.getByTestId("quiz-submit"));
    expect(screen.getByText("It is four.")).toBeInTheDocument();

    // Finish -> results.
    await userEvent.click(screen.getByTestId("quiz-continue"));
    const results = screen.getByTestId("quiz-results");
    expect(results).toHaveTextContent("100%");
    expect(onComplete).toHaveBeenCalledWith(100);
  });

  it("marks a wrong answer and still shows the explanation", async () => {
    renderRunner();
    await userEvent.click(screen.getByText("acceleration"));
    await userEvent.click(screen.getByTestId("quiz-submit"));
    expect(screen.getByText("Not quite")).toBeInTheDocument();
    expect(screen.getByText("Slope is velocity.")).toBeInTheDocument();
  });

  it("can retry from the score screen", async () => {
    const onComplete = renderRunner();
    // Fail both questions quickly.
    await userEvent.click(screen.getByText("acceleration"));
    await userEvent.click(screen.getByTestId("quiz-submit"));
    await userEvent.click(screen.getByTestId("quiz-continue"));
    await userEvent.type(screen.getByLabelText("Numeric answer"), "0");
    await userEvent.click(screen.getByTestId("quiz-submit"));
    await userEvent.click(screen.getByTestId("quiz-continue"));

    expect(screen.getByTestId("quiz-results")).toHaveTextContent("0%");
    expect(onComplete).toHaveBeenCalledWith(0);

    await userEvent.click(screen.getByTestId("quiz-retry"));
    expect(screen.getByTestId("quiz-counter")).toHaveTextContent(
      "Question 1 of 2",
    );
  });

  it("hides the next CTA and asks to retake below the pass threshold", async () => {
    render(
      <MemoryRouter>
        <QuizRunner
          quiz={quiz}
          next={{ href: "/next", label: "Next lesson" }}
          passThreshold={70}
        />
      </MemoryRouter>,
    );
    // Fail both questions (0%).
    await userEvent.click(screen.getByText("acceleration"));
    await userEvent.click(screen.getByTestId("quiz-submit"));
    await userEvent.click(screen.getByTestId("quiz-continue"));
    await userEvent.type(screen.getByLabelText("Numeric answer"), "0");
    await userEvent.click(screen.getByTestId("quiz-submit"));
    await userEvent.click(screen.getByTestId("quiz-continue"));

    expect(screen.getByTestId("quiz-results")).toHaveTextContent("0%");
    expect(screen.queryByTestId("next-step")).toBeNull();
    expect(screen.getByTestId("quiz-retry-notice")).toBeInTheDocument();
    expect(screen.getByTestId("quiz-retry")).toHaveTextContent("Retake quiz");
  });

  it("shows the next CTA when the pass threshold is met", async () => {
    render(
      <MemoryRouter>
        <QuizRunner
          quiz={quiz}
          next={{ href: "/next", label: "Next lesson" }}
          passThreshold={70}
        />
      </MemoryRouter>,
    );
    // Pass both questions (100%).
    await userEvent.click(screen.getByText("velocity"));
    await userEvent.click(screen.getByTestId("quiz-submit"));
    await userEvent.click(screen.getByTestId("quiz-continue"));
    await userEvent.type(screen.getByLabelText("Numeric answer"), "4");
    await userEvent.click(screen.getByTestId("quiz-submit"));
    await userEvent.click(screen.getByTestId("quiz-continue"));

    expect(screen.getByTestId("quiz-results")).toHaveTextContent("100%");
    expect(screen.getByTestId("next-step")).toHaveAttribute("href", "/next");
    expect(screen.queryByTestId("quiz-retry-notice")).toBeNull();
  });
});
