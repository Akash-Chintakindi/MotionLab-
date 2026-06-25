import { test, expect } from "@playwright/test";
import { signUp, completeLesson1, backToCourse } from "./helpers";

test("Lesson 1 practice: Drive the Cart loads and can be finished", async ({
  page,
}) => {
  await signUp(page);
  // Practice unlocks only after mastering the lesson (>= 80%).
  await completeLesson1(page);
  await backToCourse(page);

  await page
    .getByRole("button", { name: /Position, Velocity, and Slope/ })
    .click();
  await page.getByTestId("lesson-mode-practice").click();

  await expect(page.getByTestId("drive-cart-game")).toBeVisible();
  await expect(page.getByTestId("cart-score")).toBeVisible();

  // Walk through the three rounds to the result screen.
  await page.getByTestId("cart-next").click();
  await page.getByTestId("cart-next").click();
  await page.getByTestId("cart-finish").click();

  await expect(page.getByTestId("cart-result")).toBeVisible();
});
