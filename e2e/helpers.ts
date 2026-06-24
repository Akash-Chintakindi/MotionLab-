import { expect, type Page } from "@playwright/test";

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
    page.getByRole("heading", { name: new RegExp(`Hi ${displayName}`) }),
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

export async function openLesson(page: Page, name: RegExp) {
  await page.getByRole("link", { name }).click();
  await expect(page.getByTestId("step-counter")).toBeVisible();
}

export async function backToCourse(page: Page) {
  await page.getByRole("link", { name: "Back to course" }).click();
}

export async function numericAnswer(page: Page, value: number) {
  await page.getByLabel("Numeric answer").fill(String(value));
  await page.getByRole("button", { name: "Check answer" }).click();
}

/** Plays Lesson 1 from the dashboard through to its completion screen. */
export async function completeLesson1(page: Page) {
  await page
    .getByRole("link", { name: /Position, Velocity, and Slope/ })
    .click();
  await mcAnswer(page, /In the middle/);
  await continueStep(page); // step 1
  await continueStep(page); // step 2 explore
  await page.getByRole("button", { name: "Select Middle region" }).click();
  await continueStep(page); // step 3 predict
  await continueStep(page); // step 4 average
  await continueStep(page); // step 5 instant
  await continueStep(page); // step 6 derivative
  await sortPick(page, "Point A", "Positive velocity");
  await sortPick(page, "Point B", "Zero velocity");
  await sortPick(page, "Point C", "Negative velocity");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page); // step 7 sort
  await mcAnswer(page, /Moving backward/);
  await continueStep(page); // step 8 application -> finish
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

/** The following helpers assume the lesson page is already open at step 1. */

export async function completeLesson2(page: Page) {
  await mcAnswer(page, /negative the whole time/);
  await continueStep(page);
  await continueStep(page); // motion sim
  await mcAnswer(page, /Slowing down/);
  await continueStep(page);
  await continueStep(page); // concept
  await sortPick(page, "acceleration +2", "Speeding up");
  await sortPick(page, "acceleration -2", "Slowing down");
  await sortPick(page, "acceleration -1", "Speeding up");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page);
  await mcAnswer(page, /1\.5 m\/s/);
  await continueStep(page);
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson3(page: Page) {
  await continueStep(page); // concept
  await continueStep(page); // area sim
  await numericAnswer(page, 16);
  await continueStep(page);
  await mcAnswer(page, /less than total distance/);
  await continueStep(page);
  await numericAnswer(page, 20);
  await continueStep(page);
  await mcAnswer(page, /moving backward/);
  await continueStep(page);
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson4(page: Page) {
  await continueStep(page); // concept
  await continueStep(page); // kinematics sim
  await numericAnswer(page, 10);
  await continueStep(page);
  await numericAnswer(page, 25);
  await continueStep(page);
  await mcAnswer(page, /shifts upward/);
  await continueStep(page);
  await mcAnswer(page, /A parabola/);
  await continueStep(page);
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson5(page: Page) {
  await continueStep(page); // concept
  await continueStep(page); // vectors sim
  await mcAnswer(page, /analyzed independently/);
  await continueStep(page);
  await numericAnswer(page, 5);
  await continueStep(page);
  await mcAnswer(page, /Toward the center/);
  await continueStep(page);
  await mcAnswer(page, /Purely vertical/);
  await continueStep(page);
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson6(page: Page) {
  await continueStep(page); // concept
  await continueStep(page); // projectile sim
  await mcAnswer(page, /Stays constant/);
  await continueStep(page);
  await numericAnswer(page, 10);
  await continueStep(page);
  await mcAnswer(page, /^Zero$/);
  await continueStep(page);
  await mcAnswer(page, /45/);
  await continueStep(page);
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}

export async function completeLesson7(page: Page) {
  await continueStep(page); // intro concept
  await mcAnswer(page, /straight line starting positive/);
  await continueStep(page);
  await mcAnswer(page, /constant negative value/);
  await continueStep(page);
  await numericAnswer(page, 16);
  await continueStep(page);
  await sortPick(page, "Position to velocity", "Derivative");
  await sortPick(page, "Velocity to acceleration", "Derivative");
  await sortPick(page, "Acceleration to velocity", "Integral");
  await sortPick(page, "Velocity to position", "Integral");
  await page.getByRole("button", { name: "Check answer" }).click();
  await continueStep(page);
  await mcAnswer(page, /Independent of each other/);
  await continueStep(page);
  await mcAnswer(page, /Constant/);
  await continueStep(page);
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
}
