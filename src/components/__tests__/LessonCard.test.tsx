import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LessonCard } from "../LessonCard";
import { getLesson } from "../../content/course";

const lesson1 = getLesson("lesson-1-position-velocity")!;

function renderCard(props: Partial<Parameters<typeof LessonCard>[0]> = {}) {
  render(
    <MemoryRouter>
      <LessonCard
        lesson={lesson1}
        status="completed"
        unlocked
        mastery={1}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("LessonCard dropdown", () => {
  it("is collapsed by default and expands to show Learn + Quiz", async () => {
    renderCard();
    expect(screen.queryByRole("link", { name: "Learn" })).toBeNull();

    await userEvent.click(
      screen.getByRole("button", { name: /Position, Velocity, and Slope/ }),
    );

    const learn = screen.getByRole("link", { name: "Learn" });
    const quiz = screen.getByRole("link", { name: "Quiz" });
    expect(learn).toHaveAttribute("href", "/lesson/lesson-1-position-velocity");
    expect(screen.queryByRole("link", { name: "Practice" })).toBeNull();
    expect(quiz).toHaveAttribute(
      "href",
      "/lesson/lesson-1-position-velocity/quiz",
    );
  });

  it("surfaces the best quiz score when present", async () => {
    renderCard({ quizBest: 90 });
    await userEvent.click(
      screen.getByRole("button", { name: /Position, Velocity, and Slope/ }),
    );
    expect(screen.getByText("Best 90%")).toBeInTheDocument();
  });

  it("does not expand when locked", () => {
    renderCard({ unlocked: false, prerequisiteTitle: "Intro" });
    expect(
      screen.queryByRole("button", { name: /Position, Velocity, and Slope/ }),
    ).toBeNull();
  });

  it("locks the Quiz until the lesson is mastered (80%)", async () => {
    renderCard({ status: "in_progress", mastery: 0.6 });
    await userEvent.click(
      screen.getByRole("button", { name: /Position, Velocity, and Slope/ }),
    );

    // Learn stays available; the Quiz is not a navigable link yet.
    expect(screen.getByRole("link", { name: "Learn" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Quiz" })).toBeNull();
    expect(screen.getByText("🔒 Master Learn (80%)")).toBeInTheDocument();
  });
});
