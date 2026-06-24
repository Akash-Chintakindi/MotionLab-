import { test, expect } from "@playwright/test";
import { signUp, completeLesson1, backToCourse } from "./helpers";

test("finishing a lesson updates the streak and awards a milestone", async ({
  page,
}) => {
  await signUp(page);
  await completeLesson1(page);

  // Completion celebration shows the day streak and the new milestone.
  await expect(page.getByTestId("streak-count")).toHaveText("1");
  await expect(page.getByTestId("earned-milestones")).toContainText(
    "First lesson complete",
  );

  // Dashboard reflects the streak and milestone badge persistently.
  await backToCourse(page);
  await expect(page.getByTestId("streak-count")).toHaveText("1");
  await expect(page.getByTestId("milestones")).toContainText(
    "First lesson complete",
  );
});
