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

  // Final lesson: completion shows, but there is no next lesson to unlock.
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
  await expect(page.getByTestId("unlock-next")).toHaveCount(0);
});
