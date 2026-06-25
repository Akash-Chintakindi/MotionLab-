import { test, expect } from "@playwright/test";
import {
  signUp,
  openLesson,
  openQuiz,
  passQuiz,
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

  // Each lesson now unlocks the next only after its quiz is finished, so we
  // finish the quiz between completing one lesson's Learn step and opening the
  // next lesson.
  await completeLesson1(page);
  await backToCourse(page);
  await openQuiz(page, /Position, Velocity, and Slope/);
  await passQuiz(page, "lesson-1-position-velocity");
  await backToCourse(page);

  await openLesson(page, /Velocity, Acceleration, and Changing Motion/);
  await completeLesson2(page);
  await backToCourse(page);
  await openQuiz(page, /Velocity, Acceleration, and Changing Motion/);
  await passQuiz(page, "lesson-2-velocity-acceleration");
  await backToCourse(page);

  await openLesson(page, /Displacement from Area Under Velocity/);
  await completeLesson3(page);
  await backToCourse(page);
  await openQuiz(page, /Displacement from Area Under Velocity/);
  await passQuiz(page, "lesson-3-displacement-area");
  await backToCourse(page);

  await openLesson(page, /From Acceleration to Velocity and Position/);
  await completeLesson4(page);
  await backToCourse(page);
  await openQuiz(page, /From Acceleration to Velocity and Position/);
  await passQuiz(page, "lesson-4-acceleration-to-position");
  await backToCourse(page);

  await openLesson(page, /Motion in Two Dimensions/);
  await completeLesson5(page);
  await backToCourse(page);
  await openQuiz(page, /Motion in Two Dimensions/);
  await passQuiz(page, "lesson-5-two-dimensions");
  await backToCourse(page);

  await openLesson(page, /Projectile Motion/);
  await completeLesson6(page);
  await backToCourse(page);
  await openQuiz(page, /Projectile Motion/);
  await passQuiz(page, "lesson-6-projectile-motion");
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
