// Canonical, hand-authored lesson content lives in code (see src/content).
// Firestore stores only user progress, never these definitions.

import type { PlotPreset } from "../lib/functions";

export type StepType =
  | "concept"
  | "multipleChoice"
  | "graphDrag"
  | "sliderSimulation"
  | "sort"
  | "numeric";

/**
 * A named curve preset resolved to an actual math function at render time.
 * Keeping presets as strings keeps content serializable and review-friendly.
 */
export type CurvePreset =
  | "scurveSin" // x(t) = 4 - 4*cos(t*pi/6): steep in the middle, peak at the end
  | "parabolaDown" // x(t) = 6t - t^2: + velocity, then 0, then - velocity
  | "accelerating" // x(t) = 0.25*t^2: speeding up the whole time
  | "linearUp" // x(t) = 1.5t: constant positive velocity
  | "linearDown"; // x(t) = 12 - 1.5t: constant negative velocity

export interface ConceptConfig {
  /** Optional rich body paragraphs shown under the prompt. */
  body?: string[];
  /** Optional formula rendered prominently (plain text, e.g. "v(t) = dx/dt"). */
  formula?: string;
  /** Optional read-only illustrative graph. */
  graph?: GraphConfig;
}

export interface MultipleChoiceConfig {
  options: { id: string; label: string }[];
  /** Optional read-only position graph shown above the choices. */
  graph?: GraphConfig;
  /** Optional read-only velocity/acceleration plot shown above the choices. */
  plot?: PlotConfig;
  shuffle?: boolean;
}

/** A read-only plot of an arbitrary time-function (velocity, acceleration, ...). */
export interface PlotConfig {
  preset: PlotPreset;
  tMin: number;
  tMax: number;
  yMin: number;
  yMax: number;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  regions?: { id: string; tStart: number; tEnd: number; label: string }[];
  /** Optionally shade the signed area under the curve over this interval. */
  area?: { from: number; to: number };
}

export interface GraphConfig {
  curve: CurvePreset;
  tMin: number;
  tMax: number;
  /** Y-axis bounds in graph units. */
  xMin: number;
  xMax: number;
  xLabel?: string;
  yLabel?: string;
  /** Region bands along the time axis, used by "predict" graphDrag steps. */
  regions?: { id: string; tStart: number; tEnd: number; label: string }[];
  /**
   * Labeled points drawn on the curve at a given time, e.g. to show learners
   * exactly where "Point A / B / C" sit when sorting or identifying them.
   */
  markers?: { id: string; t: number; label?: string; color?: string }[];
}

export type GraphDragMode = "explore" | "predict" | "secant";

export interface GraphDragConfig {
  graph: GraphConfig;
  mode: GraphDragMode;
  /** explore/secant: starting time(s) for the draggable marker(s). */
  initialT?: number;
  initialT2?: number;
  /** Show a live tangent line + instantaneous velocity readout (explore). */
  showTangent?: boolean;
  /** Show the secant line + average velocity between two markers (secant). */
  showSecant?: boolean;
  /** secant: include a delta-t control that shrinks the gap toward a tangent. */
  showDeltaTControl?: boolean;
}

export interface SortConfig {
  /** Buckets the learner sorts items into. */
  buckets: { id: string; label: string }[];
  /** Items to be placed; each belongs to exactly one bucket. */
  items: { id: string; label: string }[];
  /** Optional read-only graph for reference. */
  graph?: GraphConfig;
}

export interface NumericConfig {
  unit?: string;
  /** Accepted absolute tolerance around the correct value. */
  tolerance: number;
  graph?: GraphConfig;
  plot?: PlotConfig;
  placeholder?: string;
}

export type SliderScenario =
  | "motion"
  | "area"
  | "kinematics"
  | "vectors2d"
  | "projectile";

export interface SliderSimulationConfig {
  scenario: SliderScenario;
  /** motion / kinematics: initial and bounds for v(t) = v0 + a*t. */
  v0?: number;
  a?: number;
  v0Range?: [number, number];
  aRange?: [number, number];
  /** kinematics: initial position and duration. */
  x0?: number;
  T?: number;
  /** area: the velocity plot and starting interval. */
  plot?: PlotConfig;
  initialFrom?: number;
  initialTo?: number;
}

export type InteractionConfig =
  | ConceptConfig
  | MultipleChoiceConfig
  | GraphDragConfig
  | SortConfig
  | NumericConfig
  | SliderSimulationConfig;

export interface StepFeedback {
  correct: string;
  incorrect: string;
  hint?: string;
}

export interface LessonStep {
  id: string;
  type: StepType;
  prompt: string;
  interactionConfig: InteractionConfig;
  /**
   * The expected answer. Shape depends on `type`:
   *  - multipleChoice: { optionId: string }
   *  - graphDrag (predict): { regionId: string }
   *  - graphDrag (explore/secant): null (exploration, always passes)
   *  - sort: { [itemId]: bucketId }
   *  - numeric: { value: number }
   *  - concept: null
   */
  correctAnswer: Record<string, unknown> | null;
  feedback: StepFeedback;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle?: string;
  order: number;
  estimatedMinutes: number;
  coreIdea: string;
  steps: LessonStep[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

// ---- Quizzes -------------------------------------------------------------

export type QuizQuestionType = "multipleChoice" | "numeric";
export type QuizCategory = "conceptual" | "calculation";

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  /** Whether this item tests understanding or a computation (for the mix UI). */
  category: QuizCategory;
  prompt: string;
  /** Optional read-only visuals, reused from the lesson primitives. */
  graph?: GraphConfig;
  plot?: PlotConfig;
  /** multipleChoice fields */
  options?: { id: string; label: string }[];
  correctOptionId?: string;
  /** numeric fields */
  value?: number;
  tolerance?: number;
  unit?: string;
  placeholder?: string;
  /** Always shown after answering, whether right or wrong. */
  explanation: string;
}

export interface Quiz {
  lessonId: string;
  questions: QuizQuestion[];
}
