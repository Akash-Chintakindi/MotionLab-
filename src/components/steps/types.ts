import type { LessonStep } from "../../types/content";

export interface StepComponentProps {
  step: LessonStep;
  /** When true the step is solved/closed and interaction should be disabled. */
  locked: boolean;
  /**
   * When true (e.g. revisiting a previously answered step via Back), the step
   * should render pre-filled with the correct answer in its solved state.
   */
  prefillCorrect?: boolean;
  /** Gradable steps call this once per attempt with the result. */
  onAnswer: (correct: boolean) => void;
}

const GRADABLE: Record<string, boolean> = {
  multipleChoice: true,
  sort: true,
  numeric: true,
};

/** Whether a step needs an explicit answer before the learner can continue. */
export function stepRequiresAnswer(step: LessonStep): boolean {
  if (step.type === "graphDrag") {
    const cfg = step.interactionConfig as { mode?: string };
    return cfg.mode === "predict";
  }
  return GRADABLE[step.type] ?? false;
}
