import { test, expect } from "@playwright/test";
import {
  signUp,
  openLesson,
  backToCourse,
  completeLesson1,
  completeLesson2,
  completeLesson3,
  completeLesson4,
  completeLesson5,
  completeLesson6,
  completeLesson7,
} from "./helpers";

test("a learner can complete the entire 7-lesson course in order", async ({
  page,
}) => {
  test.slow(); // long sequential journey

  await signUp(page);

  await completeLesson1(page);
  await backToCourse(page);

  await openLesson(page, /Velocity, Acceleration, and Changing Motion/);
  await completeLesson2(page);
  await backToCourse(page);

  await openLesson(page, /Displacement from Area Under Velocity/);
  await completeLesson3(page);
  await backToCourse(page);

  await openLesson(page, /From Acceleration to Velocity and Position/);
  await completeLesson4(page);
  await backToCourse(page);

  await openLesson(page, /Motion in Two Dimensions/);
  await completeLesson5(page);
  await backToCourse(page);

  await openLesson(page, /Projectile Motion/);
  await completeLesson6(page);
  await backToCourse(page);

  await openLesson(page, /Kinematics Mastery Challenge/);
  await completeLesson7(page);

  // Final lesson: completion chains into Lesson 7's own Practice game (the last
  // lesson now has practice + quiz; there is no further lesson after those).
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
  await expect(page.getByTestId("next-step")).toHaveAttribute(
    "href",
    "/lesson/lesson-7-mastery-challenge/practice",
  );
});
