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

  // Lesson 2 is now unlocked. Walk its 11-step mastery template end to end.
  await openLesson(page, /Velocity, Acceleration, and Changing Motion/);
  await expect(page.getByTestId("step-counter")).toContainText("Step 1");

  // Step 1: retrieval opener — the slope of a position–time graph (MC).
  await mcAnswer(page, /The velocity/);
  await continueStep(page);

  // Step 2: bridge to acceleration (concept, auto).
  await expect(page.getByTestId("step-counter")).toContainText("Step 2");
  await continueStep(page);

  // Step 3: acceleration is the derivative of velocity (concept, auto).
  await expect(page.getByTestId("step-counter")).toContainText("Step 3");
  await continueStep(page);

  // Step 4: motion simulation (auto).
  await expect(page.getByTestId("step-counter")).toContainText("Step 4");
  await continueStep(page);

  // Step 5: the sign rule (concept, auto).
  await expect(page.getByTestId("step-counter")).toContainText("Step 5");
  await continueStep(page);

  // Step 6: positive velocity + negative acceleration → slowing down (MC).
  await expect(page.getByTestId("step-counter")).toContainText("Step 6");
  await mcAnswer(page, /Slowing down/);
  await continueStep(page);

  // Step 7: sort scenarios by speeding up vs slowing down.
  await expect(page.getByTestId("step-counter")).toContainText("Step 7");
  await sortPick(page, "acceleration +2", "Speeding up");
  await sortPick(page, "acceleration -2", "Slowing down");
  await sortPick(page, "acceleration -1", "Speeding up");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page);

  // Step 8: worked example — a = Δv/Δt (auto teaching step).
  await expect(page.getByTestId("step-counter")).toContainText("Step 8");
  await continueStep(page);

  // Step 9: faded practice — compute acceleration (numeric).
  await expect(page.getByTestId("step-counter")).toContainText("Step 9");
  await page.getByLabel("Numeric answer").fill("5");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page);

  // Step 10: read acceleration from the velocity graph's slope (MC).
  await expect(page.getByTestId("step-counter")).toContainText("Step 10");
  await mcAnswer(page, /1\.5 m\/s/);
  await continueStep(page);

  // Step 11: independent challenge — signed acceleration (numeric).
  await expect(page.getByTestId("step-counter")).toContainText("Step 11");
  await page.getByLabel("Numeric answer").fill("-3");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page);

  // Completion chains onward. Practice is now woven into Learn, so the next
  // step is Lesson 2's Quiz.
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
  await expect(page.getByTestId("next-step")).toHaveAttribute(
    "href",
    "/lesson/lesson-2-velocity-acceleration/quiz",
  );
});
