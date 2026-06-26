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

  // Lab opens on the mode-select menu (it no longer auto-starts).
  await expect(page.getByTestId("lab-menu")).toBeVisible();
  await expect(page.getByTestId("lab-mode-survival")).toBeVisible();
  await expect(page.getByTestId("lab-mode-time")).toBeVisible();

  // Choosing Time reveals a minutes input within the 1-30 range.
  await page.getByTestId("lab-mode-time").click();
  await expect(page.getByTestId("lab-time-minutes")).toBeVisible();

  // Start Survival -> a 3-2-1 countdown -> the live run with its HUD.
  await page.getByTestId("lab-mode-survival").click();
  await page.getByTestId("lab-start").click();
  await expect(page.getByTestId("lab-countdown")).toBeVisible();
  await expect(page.getByTestId("lab-score")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("lab-strikes")).toBeVisible();
});
