import { test, expect } from "@playwright/test";
import {
  signUp,
  continueStep,
  sortPick,
  mcAnswer,
  completeLesson1,
  openLesson,
  openQuiz,
  passQuiz,
  backToCourse,
} from "./helpers";

test("completing Lesson 1 unlocks and allows Lesson 2 (sim + sort + plot)", async ({
  page,
}) => {
  await signUp(page);
  await completeLesson1(page);

  // Finishing Learn alone no longer unlocks Lesson 2 — its quiz must be done.
  await backToCourse(page);
  await openQuiz(page, /Position, Velocity, and Slope/);
  await passQuiz(page, "lesson-1-position-velocity");
  await backToCourse(page);

  // Lesson 2 is now unlocked.
  await openLesson(page, /Velocity, Acceleration, and Changing Motion/);
  await expect(page.getByTestId("step-counter")).toContainText("Step 1");

  // Step 1: read acceleration sign from velocity graph.
  await mcAnswer(page, /negative the whole time/);
  await continueStep(page);

  // Step 2: motion simulation (auto).
  await expect(page.getByTestId("motion-state")).toBeVisible();
  await continueStep(page);

  // Step 3: speeding up vs slowing down.
  await mcAnswer(page, /Slowing down/);
  await continueStep(page);

  // Step 4: concept (auto).
  await continueStep(page);

  // Step 5: sort scenarios.
  await sortPick(page, "acceleration +2", "Speeding up");
  await sortPick(page, "acceleration -2", "Slowing down");
  await sortPick(page, "acceleration -1", "Speeding up");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page);

  // Step 6: read acceleration value from the slope.
  await mcAnswer(page, /1\.5 m\/s/);
  await continueStep(page);

  // Completion chains onward. Practice is now woven into Learn, so the next
  // step is Lesson 2's Quiz.
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
  await expect(page.getByTestId("next-step")).toHaveAttribute(
    "href",
    "/lesson/lesson-2-velocity-acceleration/quiz",
  );
});
