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
  it("is collapsed by default and expands to show three modes", async () => {
    renderCard();
    expect(screen.queryByRole("link", { name: "Learn" })).toBeNull();

    await userEvent.click(
      screen.getByRole("button", { name: /Position, Velocity, and Slope/ }),
    );

    const learn = screen.getByRole("link", { name: "Learn" });
    const practice = screen.getByRole("link", { name: "Practice" });
    const quiz = screen.getByRole("link", { name: "Quiz" });
    expect(learn).toHaveAttribute("href", "/lesson/lesson-1-position-velocity");
    expect(practice).toHaveAttribute(
      "href",
      "/lesson/lesson-1-position-velocity/practice",
    );
    expect(quiz).toHaveAttribute(
      "href",
      "/lesson/lesson-1-position-velocity/quiz",
    );
  });

  it("surfaces best quiz and practice scores when present", async () => {
    renderCard({ quizBest: 90, practiceBest: 75 });
    await userEvent.click(
      screen.getByRole("button", { name: /Position, Velocity, and Slope/ }),
    );
    expect(screen.getByText("Best 90%")).toBeInTheDocument();
    expect(screen.getByText("Best 75%")).toBeInTheDocument();
  });

  it("does not expand when locked", () => {
    renderCard({ unlocked: false, prerequisiteTitle: "Intro" });
    expect(
      screen.queryByRole("button", { name: /Position, Velocity, and Slope/ }),
    ).toBeNull();
  });

  it("locks Practice and Quiz until the lesson is mastered (80%)", async () => {
    renderCard({ status: "in_progress", mastery: 0.6 });
    await userEvent.click(
      screen.getByRole("button", { name: /Position, Velocity, and Slope/ }),
    );

    // Learn stays available; Practice/Quiz are not navigable links yet.
    expect(screen.getByRole("link", { name: "Learn" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Practice" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Quiz" })).toBeNull();
    expect(screen.getAllByText("🔒 Master Learn (80%)")).toHaveLength(2);
  });
});
