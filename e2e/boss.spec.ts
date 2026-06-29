import { test, expect } from "@playwright/test";
import { signUp } from "./helpers";

test("Boss Tower is reachable and bosses gate behind their quizzes", async ({
  page,
}) => {
  await signUp(page);

  // The Games hub surfaces the Boss Tower card.
  await page.getByRole("link", { name: "Games" }).click();
  await expect(page.getByTestId("games-page")).toBeVisible();
  await expect(page.getByTestId("game-card-bosses")).toBeVisible();

  // The card opens the boss map (the tower of nodes).
  await page.getByTestId("game-card-bosses").click();
  await expect(page.getByTestId("boss-map")).toBeVisible();

  // A fresh learner hasn't passed any quiz, so the first mini-boss is locked.
  await page.goto("/games/boss/lesson-1-position-velocity");
  await expect(page.getByText(/is still locked/i)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Take the quiz/i }),
  ).toBeVisible();

  // The finale is locked until all ten mini-bosses are defeated.
  await page.goto("/games/boss/finale");
  await expect(
    page.getByText(/Defeat all ten mini-bosses/i),
  ).toBeVisible();

  // An unknown boss id redirects back to the tower.
  await page.goto("/games/boss/not-a-real-boss");
  await expect(page.getByTestId("boss-map")).toBeVisible();
});
