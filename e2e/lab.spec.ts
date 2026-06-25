import { test, expect } from "@playwright/test";
import { signUp } from "./helpers";

test("Lab tab replaces Practice and loads the survival game", async ({
  page,
}) => {
  await signUp(page);

  // The top nav now reads "Lab" (the old "Practice" tab was renamed). Use exact
  // matching so the "MotionLab" wordmark link isn't also matched.
  await expect(page.getByRole("link", { name: "Practice", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Lab", exact: true }).click();

  // The survival HUD renders in every phase (independent of question source),
  // so this is a stable smoke that the route + page shell mounted.
  await expect(page.getByTestId("lab-score")).toBeVisible();
  await expect(page.getByTestId("lab-strikes")).toBeVisible();

  // The legacy /practice path still resolves to the Lab page.
  await page.goto("/practice");
  await expect(page.getByTestId("lab-score")).toBeVisible();
});
