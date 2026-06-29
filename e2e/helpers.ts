import { expect, type Page } from "@playwright/test";
import { getQuiz } from "../src/content/quizzes";

export function uniqueEmail() {
  return `bob_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
}

export async function signUp(page: Page, displayName = "Bob") {
  await page.goto("/signup");
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(`Welcome back, ${displayName}`) }),
  ).toBeVisible();
}

export async function continueStep(page: Page) {
  await page.getByTestId("continue-button").click();
}

/** Selects a multiple-choice option and submits it for grading. */
export async function mcAnswer(page: Page, name: RegExp) {
  await page.getByRole("radio", { name }).click();
  await page.getByRole("button", { name: "Submit" }).click();
}

export async function sortPick(
  page: Page,
  itemText: string,
  bucketLabel: string,
) {
  const row = page
    .locator("div", { hasText: itemText })
    .filter({ has: page.getByRole("button", { name: bucketLabel }) })
    .last();
  await row.getByRole("button", { name: bucketLabel }).click();
}

/** Expands a lesson's dropdown card and opens its "Learn" mode. */
export async function openLesson(page: Page, name: RegExp) {
  await page.getByRole("button", { name }).click();
  await page.getByRole("link", { name: "Learn" }).click();
  await expect(page.getByTestId("step-counter")).toBeVisible();
}

/** Expands a lesson's dropdown card and opens its "Quiz" mode. */
export async function openQuiz(page: Page, name: RegExp) {
  await page.getByRole("button", { name }).click();
  await page.getByRole("link", { name: "Quiz" }).click();
  await expect(page.getByTestId("quiz-counter")).toBeVisible();
}

/**
 * Waits until traffic to the Firestore emulator (port 8080) has been quiet for
 * `quietMs`. Used to let the quiz's onComplete writes (score, streak, and the
 * next-lesson unlock) fully commit before the caller navigates away — a reload
 * or navigation mid-write would abort the in-flight unlock. We track response
 * events rather than in-flight requests so a long-lived WebChannel (which never
 * lets the page reach `networkidle`) doesn't keep us waiting forever.
 */
async function waitForFirestoreQuiet(page: Page, quietMs = 800, timeoutMs = 15000) {
  let lastActivity = Date.now();
  const handler = (resp: { url(): string }) => {
    if (resp.url().includes(":8080")) lastActivity = Date.now();
  };
  page.on("response", handler);
  try {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (Date.now() - lastActivity >= quietMs) return;
      await page.waitForTimeout(100);
    }
  } finally {
    page.off("response", handler);
  }
}

/**
 * Finishes an OPEN quiz (quiz-counter visible) by answering every question
 * CORRECTLY using the canonical quiz content. This clears the 70% pass bar, so
 * the next topic unlocks. Waits for the resulting progress writes to settle.
 */
export async function passQuiz(page: Page, lessonId: string) {
  const quiz = getQuiz(lessonId);
  if (!quiz) throw new Error(`No quiz content for lesson ${lessonId}`);

  await expect(page.getByTestId("quiz-counter")).toBeVisible();

  for (const question of quiz.questions) {
    const submit = page.getByTestId("quiz-submit");
    await expect(submit).toBeVisible();

    if (question.type === "multipleChoice") {
      const correct = question.options!.find(
        (o) => o.id === question.correctOptionId,
      )!;
      await page
        .getByRole("radio", { name: correct.label, exact: true })
        .click();
    } else {
      await page.getByLabel("Numeric answer").fill(String(question.value));
    }
    await submit.click();
    await page.getByTestId("quiz-continue").click();
  }

  await expect(page.getByTestId("quiz-results")).toBeVisible();
  await waitForFirestoreQuiet(page);
}

export async function backToCourse(page: Page) {
  await page.getByRole("link", { name: "Back to course" }).click();
}

export async function numericAnswer(page: Page, value: number) {
  await page.getByLabel("Numeric answer").fill(String(value));
  await page.getByRole("button", { name: "Check answer" }).click();
}

/**
 * Plays Lesson 1 from the dashboard through to its completion screen.
 *
 * All lessons now follow the mastery template: a retrieval opener (MC), a
 * bridge + interactive teaching steps (auto), then worked example -> faded ->
 * independent practice. These walkthroughs answer every graded step correctly
 * so the learner finishes at 100% mastery (unlocking the Quiz).
 */
export async function completeLesson1(page: Page) {
  await openLesson(page, /Position, Velocity, and Slope/);
  await mcAnswer(page, /In the middle/);
  await continueStep(page); // 1 retrieval opener
  await continueStep(page); // 2 bridge
  await continueStep(page); // 3 explore
  await page.getByRole("button", { name: "Select Middle region" }).click();
  await continueStep(page); // 4 predict
  await continueStep(page); // 5 average (secant)
  await continueStep(page); // 6 instant (secant)
  await continueStep(page); // 7 derivative concept
  await continueStep(page); // 8 calc concept
  await continueStep(page); // 9 worked example
  await numericAnswer(page, 4);
  await continueStep(page); // 10 faded practice
  await sortPick(page, "Point A", "Positive velocity");
  await sortPick(page, "Point B", "Zero velocity");
  await sortPick(page, "Point C", "Negative velocity");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page); // 11 sort
  await mcAnswer(page, /Moving backward/);
  await continueStep(page); // 12 application
  await numericAnswer(page, -4);
  await continueStep(page); // 13 independent -> finish
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

/** The following helpers assume the lesson page is already open at step 1. */

export async function completeLesson2(page: Page) {
  await mcAnswer(page, /The velocity/);
  await continueStep(page); // 1 retrieval opener
  await continueStep(page); // 2 bridge
  await continueStep(page); // 3 concept
  await continueStep(page); // 4 motion sim
  await continueStep(page); // 5 sign concept
  await mcAnswer(page, /Slowing down/);
  await continueStep(page); // 6 faded sign-rule MC
  await sortPick(page, "acceleration +2", "Speeding up");
  await sortPick(page, "acceleration -2", "Slowing down");
  await sortPick(page, "acceleration -1", "Speeding up");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page); // 7 sort
  await continueStep(page); // 8 worked example
  await numericAnswer(page, 5);
  await continueStep(page); // 9 faded practice
  await mcAnswer(page, /1\.5 m\/s/);
  await continueStep(page); // 10 read accel off graph
  await numericAnswer(page, -3);
  await continueStep(page); // 11 independent -> finish
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson3(page: Page) {
  await mcAnswer(page, /The acceleration/);
  await continueStep(page); // 1 retrieval opener
  await continueStep(page); // 2 bridge
  await continueStep(page); // 3 concept
  await continueStep(page); // 4 area sim
  await continueStep(page); // 5 signed concept
  await continueStep(page); // 6 worked example
  await numericAnswer(page, 9);
  await continueStep(page); // 7 faded practice
  await numericAnswer(page, 16);
  await continueStep(page); // 8 net displacement
  await mcAnswer(page, /less than total distance/);
  await continueStep(page); // 9 compare
  await numericAnswer(page, 20);
  await continueStep(page); // 10 total distance
  await mcAnswer(page, /moving backward/);
  await continueStep(page); // 11 sign of area
  await numericAnswer(page, 12);
  await continueStep(page); // 12 independent -> finish
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson4(page: Page) {
  await mcAnswer(page, /area under the velocity/);
  await continueStep(page); // 1 retrieval opener
  await continueStep(page); // 2 bridge
  await continueStep(page); // 3 concept (velocity)
  await continueStep(page); // 4 concept (position)
  await continueStep(page); // 5 kinematics sim
  await continueStep(page); // 6 worked example
  await numericAnswer(page, 10);
  await continueStep(page); // 7 final velocity
  await numericAnswer(page, 14);
  await continueStep(page); // 8 faded practice
  await numericAnswer(page, 25);
  await continueStep(page); // 9 displacement
  await numericAnswer(page, 33);
  await continueStep(page); // 10 independent (position)
  await mcAnswer(page, /shifts upward/);
  await continueStep(page); // 11 initial conditions
  await mcAnswer(page, /A parabola/);
  await continueStep(page); // 12 apply -> finish
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson5(page: Page) {
  await mcAnswer(page, /v₀/);
  await continueStep(page); // 1 retrieval opener
  await continueStep(page); // 2 bridge
  await continueStep(page); // 3 concept
  await continueStep(page); // 4 vectors sim
  await continueStep(page); // 5 centripetal concept
  await mcAnswer(page, /analyzed independently/);
  await continueStep(page); // 6 key idea
  await continueStep(page); // 7 worked example
  await numericAnswer(page, 5);
  await continueStep(page); // 8 speed (faded)
  await mcAnswer(page, /Toward the center/);
  await continueStep(page); // 9 centripetal
  await mcAnswer(page, /Purely vertical/);
  await continueStep(page); // 10 apply
  await numericAnswer(page, 13);
  await continueStep(page); // 11 independent -> finish
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson6(page: Page) {
  await mcAnswer(page, /two separate 1D motions/);
  await continueStep(page); // 1 retrieval opener
  await continueStep(page); // 2 bridge
  await continueStep(page); // 3 concept
  await continueStep(page); // 4 vertical concept
  await continueStep(page); // 5 projectile sim
  await mcAnswer(page, /Stays constant/);
  await continueStep(page); // 6 horizontal velocity
  await mcAnswer(page, /^Zero$/);
  await continueStep(page); // 7 peak
  await numericAnswer(page, 10);
  await continueStep(page); // 8 component
  await continueStep(page); // 9 worked example
  await numericAnswer(page, 1.5);
  await continueStep(page); // 10 faded practice
  await mcAnswer(page, /45/);
  await continueStep(page); // 11 range angle
  await numericAnswer(page, 6);
  await continueStep(page); // 12 independent -> finish
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson7(page: Page) {
  await mcAnswer(page, /Differentiate once to get/);
  await continueStep(page); // 1 retrieval opener
  await continueStep(page); // 2 bridge
  await continueStep(page); // 3 synthesis concept
  await continueStep(page); // 4 kinematics sim
  await continueStep(page); // 5 worked example
  await numericAnswer(page, 24);
  await continueStep(page); // 6 faded practice
  await mcAnswer(page, /straight line starting positive/);
  await continueStep(page); // 7 x -> v
  await mcAnswer(page, /constant negative value/);
  await continueStep(page); // 8 v -> a
  await numericAnswer(page, 16);
  await continueStep(page); // 9 area
  await sortPick(page, "Position to velocity", "Derivative");
  await sortPick(page, "Velocity to acceleration", "Derivative");
  await sortPick(page, "Acceleration to velocity", "Integral");
  await sortPick(page, "Velocity to position", "Integral");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page); // 10 derivative/integral sort
  await mcAnswer(page, /Independent of each other/);
  await continueStep(page); // 11 2D independence
  await numericAnswer(page, 60);
  await continueStep(page); // 12 independent challenge
  await mcAnswer(page, /^Constant$/);
  await continueStep(page); // 13 final -> finish
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson8(page: Page) {
  await mcAnswer(page, /directed downward/);
  await continueStep(page); // 1 retrieval opener
  await continueStep(page); // 2 bridge
  await continueStep(page); // 3 concept
  await continueStep(page); // 4 kinematics sim
  await continueStep(page); // 5 peak concept
  await mcAnswer(page, /Velocity zero/);
  await continueStep(page); // 6 peak misconception
  await continueStep(page); // 7 worked example
  await numericAnswer(page, 29.4);
  await continueStep(page); // 8 faded speed
  await numericAnswer(page, 19.6);
  await continueStep(page); // 9 faded distance
  await sortPick(page, "The velocity", "Becomes zero");
  await sortPick(page, "The speed", "Becomes zero");
  await sortPick(page, "The acceleration", "Stays nonzero");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page); // 10 sort
  await mcAnswer(page, /They are equal/);
  await continueStep(page); // 11 symmetry
  await numericAnswer(page, 19.6);
  await continueStep(page); // 12 independent -> finish
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson9(page: Page) {
  await mcAnswer(page, /√/);
  await continueStep(page); // 1 retrieval opener
  await continueStep(page); // 2 bridge
  await continueStep(page); // 3 concept
  await continueStep(page); // 4 vectors sim
  await continueStep(page); // 5 frame concept
  await mcAnswer(page, /\+10 m\/s/);
  await continueStep(page); // 6 1D relative velocity
  await continueStep(page); // 7 worked example
  await numericAnswer(page, 10);
  await continueStep(page); // 8 faded (resultant speed)
  await numericAnswer(page, 10);
  await continueStep(page); // 9 crossing time
  await sortPick(page, "An object's velocity", "Depends on the frame");
  await sortPick(page, "An object's position", "Depends on the frame");
  await sortPick(page, "An object's acceleration", "Same in every inertial frame");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page); // 10 sort
  await mcAnswer(page, /−4 m\/s/);
  await continueStep(page); // 11 reverse relative velocity
  await numericAnswer(page, 40);
  await continueStep(page); // 12 independent -> finish
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson10(page: Page) {
  await mcAnswer(page, /Differentiate it/);
  await continueStep(page); // 1 retrieval opener
  await continueStep(page); // 2 bridge
  await continueStep(page); // 3 concept
  await continueStep(page); // 4 explore (cosine graph)
  await continueStep(page); // 5 derivatives concept
  await mcAnswer(page, /passes through the center/);
  await continueStep(page); // 6 fastest
  await continueStep(page); // 7 worked example
  await numericAnswer(page, 1.26);
  await continueStep(page); // 8 period
  await numericAnswer(page, 0.4);
  await continueStep(page); // 9 max speed
  await sortPick(page, "The speed is maximum", "At the center (x = 0)");
  await sortPick(page, "The speed is zero", "At the extremes (x = ±A)");
  await sortPick(page, "The acceleration is maximum", "At the extremes (x = ±A)");
  await sortPick(page, "The acceleration is zero", "At the center (x = 0)");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page); // 10 sort
  await mcAnswer(page, /Back toward the center/);
  await continueStep(page); // 11 restoring direction
  await numericAnswer(page, 5);
  await continueStep(page); // 12 independent -> finish
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}
