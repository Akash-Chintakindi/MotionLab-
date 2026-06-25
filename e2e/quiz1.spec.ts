import { test, expect, type Page } from "@playwright/test";
import { signUp, openQuiz, completeLesson1, backToCourse } from "./helpers";

async function mc(page: Page, name: RegExp) {
  await page.getByRole("radio", { name }).click();
  await page.getByTestId("quiz-submit").click();
  await page.getByTestId("quiz-continue").click();
}

async function num(page: Page, value: number) {
  await page.getByLabel("Numeric answer").fill(String(value));
  await page.getByTestId("quiz-submit").click();
  await page.getByTestId("quiz-continue").click();
}

test("Lesson 1 quiz: answer all questions and score 100%", async ({ page }) => {
  await signUp(page);
  // The quiz unlocks only after mastering the lesson (>= 80%).
  await completeLesson1(page);
  await backToCourse(page);
  await openQuiz(page, /Position, Velocity, and Slope/);

  await expect(page.getByTestId("quiz-counter")).toContainText("Question 1");

  await mc(page, /instantaneous velocity/);
  await mc(page, /at rest/);
  await mc(page, /constant and negative/);
  await mc(page, /slope of the secant line/);
  await mc(page, /In the middle/);
  await num(page, 3);
  await num(page, 6);
  await num(page, 6);
  await num(page, 2.5);
  await num(page, 0);

  await expect(page.getByTestId("quiz-results")).toContainText("100%");
});

test("Lesson 1 quiz: immediate feedback marks a wrong answer", async ({
  page,
}) => {
  await signUp(page);
  await completeLesson1(page);
  await backToCourse(page);
  await openQuiz(page, /Position, Velocity, and Slope/);

  await page.getByRole("radio", { name: /acceleration/ }).click();
  await page.getByTestId("quiz-submit").click();
  await expect(page.getByText("Not quite")).toBeVisible();
});
