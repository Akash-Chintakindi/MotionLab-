import type { LessonProgress } from "../types/progress";
import type { Lesson } from "../types/content";
import { stepRequiresAnswer } from "../components/steps/types";

/**
 * Mastery is the fraction of steps a learner solved without any wrong attempt.
 * Auto (exploration/concept) steps always count as mastered.
 */
export function computeMastery(
  totalSteps: number,
  wrongStepCount: number,
): number {
  if (totalSteps === 0) return 1;
  return (totalSteps - wrongStepCount) / totalSteps;
}

/**
 * Where to drop a returning learner mid-lesson. Resumes at the saved step,
 * clamped to a valid range. (Finished lessons are handled separately via the
 * review summary, so they never reach this path.)
 */
export function computeResumeIndex(
  progress: LessonProgress | null,
  totalSteps: number,
): number {
  if (totalSteps === 0) return 0;
  if (!progress) return 0;
  const idx = progress.currentStepIndex ?? 0;
  return Math.min(Math.max(idx, 0), totalSteps - 1);
}

/** How a single gradable step turned out, used in the post-lesson review. */
export type StepOutcome = "first-try" | "retried" | "info";

export interface StepReview {
  id: string;
  /** 1-based position in the lesson. */
  order: number;
  prompt: string;
  /** Whether this step was graded (vs. a concept/exploration step). */
  gradable: boolean;
  /** Number of attempts the learner made on this step. */
  attempts: number;
  outcome: StepOutcome;
}

export interface LessonSummary {
  masteryPct: number;
  totalGradable: number;
  firstTryCount: number;
  retriedCount: number;
  steps: StepReview[];
}

/**
 * Builds the per-step breakdown shown when a learner revisits a finished lesson:
 * which questions they nailed first try and which took a few attempts.
 */
export function buildLessonSummary(
  lesson: Lesson,
  progress: LessonProgress | null,
  mastery: number | undefined,
): LessonSummary {
  const attemptsByStep = progress?.attemptsByStep ?? {};
  let firstTryCount = 0;
  let retriedCount = 0;
  let totalGradable = 0;

  const steps: StepReview[] = lesson.steps.map((step, i) => {
    const gradable = stepRequiresAnswer(step);
    const attempts = attemptsByStep[step.id] ?? 0;
    let outcome: StepOutcome = "info";
    if (gradable) {
      totalGradable += 1;
      if (attempts > 1) {
        retriedCount += 1;
        outcome = "retried";
      } else {
        firstTryCount += 1;
        outcome = "first-try";
      }
    }
    return {
      id: step.id,
      order: i + 1,
      prompt: step.prompt,
      gradable,
      attempts,
      outcome,
    };
  });

  const masteryPct =
    typeof mastery === "number"
      ? Math.round(mastery * 100)
      : totalGradable === 0
        ? 100
        : Math.round((firstTryCount / totalGradable) * 100);

  return { masteryPct, totalGradable, firstTryCount, retriedCount, steps };
}
