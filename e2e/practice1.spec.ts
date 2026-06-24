import { test, expect } from "@playwright/test";
import { signUp } from "./helpers";

test("Lesson 1 practice: Drive the Cart loads and can be finished", async ({
  page,
}) => {
  await signUp(page);

  await page
    .getByRole("button", { name: /Position, Velocity, and Slope/ })
    .click();
  await page.getByRole("link", { name: "Practice" }).click();

  await expect(page.getByTestId("drive-cart-game")).toBeVisible();
  await expect(page.getByTestId("cart-score")).toBeVisible();

  // Walk through the three rounds to the result screen.
  await page.getByTestId("cart-next").click();
  await page.getByTestId("cart-next").click();
  await page.getByTestId("cart-finish").click();

  await expect(page.getByTestId("cart-result")).toBeVisible();
});
