import { test, expect } from "@playwright/test";
import { signUp } from "../e2e/helpers";

// Runs against the PRODUCTION build served by `vite preview`, validating that
// the bundled, code-split app boots and the core flow works end to end.
test("production build boots and a learner can start Lesson 1", async ({
  page,
}) => {
  await signUp(page);

  await page
    .getByRole("link", { name: /Position, Velocity, and Slope/ })
    .click();
  await expect(page.getByTestId("step-counter")).toContainText("Step 1");

  // Sanity check one interaction works in the built bundle.
  await page.getByRole("radio", { name: /In the middle/ }).click();
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.getByText("Correct")).toBeVisible();
});
