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
  completeLesson8,
  completeLesson9,
  completeLesson10,
} from "./helpers";

test("a learner can complete the entire 10-lesson course in order", async ({
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

  // Order 7: Free Fall (new kinematics lesson).
  await openLesson(page, /Free Fall and Motion Under Gravity/);
  await completeLesson8(page);
  await backToCourse(page);
  await openQuiz(page, /Free Fall and Motion Under Gravity/);
  await passQuiz(page, "lesson-8-free-fall");
  await backToCourse(page);

  // Order 8: Relative Motion (new kinematics lesson).
  await openLesson(page, /Relative Motion and Reference Frames/);
  await completeLesson9(page);
  await backToCourse(page);
  await openQuiz(page, /Relative Motion and Reference Frames/);
  await passQuiz(page, "lesson-9-relative-motion");
  await backToCourse(page);

  // Order 9: the Oscillations bridge lesson (a forward-looking detour).
  await openLesson(page, /Oscillations: Motion That Repeats/);
  await completeLesson10(page);
  await backToCourse(page);
  await openQuiz(page, /Oscillations: Motion That Repeats/);
  await passQuiz(page, "lesson-10-oscillations");
  await backToCourse(page);

  // Order 10: the Kinematics Mastery Challenge capstone — the finale.
  await openLesson(page, /Kinematics Mastery Challenge/);
  await completeLesson7(page);

  // Final lesson: completion chains into its own Quiz (practice is woven into
  // Learn now; there is no further lesson after the quiz).
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
  await expect(page.getByTestId("next-step")).toHaveAttribute(
    "href",
    "/lesson/lesson-7-mastery-challenge/quiz",
  );
});
