import { test, expect, type Page } from "@playwright/test";

function uniqueEmail() {
  return `bob_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function signUp(page: Page, displayName = "Bob") {
  await page.goto("/signup");
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(`Hi ${displayName}`) }),
  ).toBeVisible();
}

async function continueStep(page: Page) {
  await page.getByTestId("continue-button").click();
}

/** Expands the lesson's dropdown card and opens its "Learn" mode. */
async function openLearn(page: Page, name: RegExp) {
  await page.getByRole("button", { name }).click();
  await page.getByRole("link", { name: "Learn" }).click();
}

test("Bob completes Lesson 1 end to end and unlocks Lesson 2", async ({
  page,
}) => {
  await signUp(page);

  // Lesson 2 should be locked on the dashboard.
  await expect(page.getByText("Locked").first()).toBeVisible();

  // Open Lesson 1 (Learn mode).
  await openLearn(page, /Position, Velocity, and Slope/);
  await expect(page.getByTestId("step-counter")).toContainText("Step 1");

  // Step 1: hook (multiple choice) — wrong then right. Grading only on submit.
  await page.getByRole("radio", { name: /Late/ }).click();
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.getByText("Not quite")).toBeVisible();
  await expect(page.getByText(/Hint:/)).toBeVisible();
  await page.getByRole("radio", { name: /In the middle/ }).click();
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.getByText("Correct")).toBeVisible();
  await continueStep(page);

  // Step 2: explore graph (auto).
  await expect(page.getByTestId("step-counter")).toContainText("Step 2");
  await continueStep(page);

  // Step 3: predict region.
  await expect(page.getByTestId("step-counter")).toContainText("Step 3");
  await page.getByRole("button", { name: "Select Middle region" }).click();
  await expect(page.getByText("Correct")).toBeVisible();
  await continueStep(page);

  // Step 4: average velocity (secant, auto).
  await expect(page.getByTestId("step-counter")).toContainText("Step 4");
  await continueStep(page);

  // Step 5: instantaneous velocity (secant + slider, auto).
  await expect(page.getByTestId("step-counter")).toContainText("Step 5");
  await continueStep(page);

  // Step 6: derivative reveal (concept, auto).
  await expect(page.getByTestId("step-counter")).toContainText("Step 6");
  await continueStep(page);

  // Step 7: calculating velocity from a formula (concept, auto).
  await expect(page.getByTestId("step-counter")).toContainText("Step 7");
  await continueStep(page);

  // Step 8: average-velocity calculation (numeric).
  await expect(page.getByTestId("step-counter")).toContainText("Step 8");
  await page.getByLabel("Numeric answer").fill("4");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Correct")).toBeVisible();
  await continueStep(page);

  // Step 9: sort points by velocity sign.
  await expect(page.getByTestId("step-counter")).toContainText("Step 9");
  await sortPick(page, "Point A", "Positive velocity");
  await sortPick(page, "Point B", "Zero velocity");
  await sortPick(page, "Point C", "Negative velocity");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Correct")).toBeVisible();
  await continueStep(page);

  // Step 10: application (multiple choice).
  await expect(page.getByTestId("step-counter")).toContainText("Step 10");
  await page.getByRole("radio", { name: /Moving backward/ }).click();
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.getByText("Correct")).toBeVisible();
  await continueStep(page);

  // Completion + chained next step (Practice for lesson 1).
  await expect(page.getByTestId("lesson-complete")).toBeVisible();
  await expect(page.getByTestId("next-step")).toBeVisible();
  await expect(page.getByTestId("next-step")).toHaveAttribute(
    "href",
    "/lesson/lesson-1-position-velocity/practice",
  );
});

test("Bob can resume a lesson after a reload", async ({ page }) => {
  await signUp(page);
  await openLearn(page, /Position, Velocity, and Slope/);

  // Solve step 1 so progress advances to step 2.
  await page.getByRole("radio", { name: /In the middle/ }).click();
  await page.getByRole("button", { name: /Submit/ }).click();
  await continueStep(page);
  await expect(page.getByTestId("step-counter")).toContainText("Step 2");

  // Reload: should resume at step 2, not restart at step 1.
  await page.reload();
  await expect(page.getByTestId("step-counter")).toContainText("Step 2");
});

async function sortPick(page: Page, itemText: string, bucketLabel: string) {
  const row = page
    .locator("div", { hasText: itemText })
    .filter({ has: page.getByRole("button", { name: bucketLabel }) })
    .last();
  await row.getByRole("button", { name: bucketLabel }).click();
}
