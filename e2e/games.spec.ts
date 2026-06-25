import { test, expect } from "@playwright/test";
import { signUp } from "./helpers";

test("Games hub lists the games and each loads", async ({ page }) => {
  await signUp(page);

  // Open the Games tab from the top nav.
  await page.getByRole("link", { name: "Games" }).click();
  await expect(page.getByTestId("games-page")).toBeVisible();
  await expect(page.getByTestId("game-card-pool")).toBeVisible();
  await expect(page.getByTestId("game-card-basketball")).toBeVisible();
  await expect(page.getByTestId("game-card-cannon")).toBeVisible();

  // Pool loads.
  await page.getByTestId("game-card-pool").click();
  await expect(page.getByTestId("pool-game")).toBeVisible();

  // Back to the hub, then basketball loads.
  await page.goto("/games");
  await page.getByTestId("game-card-basketball").click();
  await expect(page.getByTestId("basketball-game")).toBeVisible();

  // Back to the hub, then the cannon duel loads.
  await page.goto("/games");
  await page.getByTestId("game-card-cannon").click();
  await expect(page.getByTestId("cannon-game")).toBeVisible();
});
