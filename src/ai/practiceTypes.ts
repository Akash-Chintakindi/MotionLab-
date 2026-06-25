// Shared contract for the AI-generated adaptive practice feature.
// Kept dependency-free so both the AI service layer and the UI can import it.

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/** A single AI-generated practice problem, graded client-side like a lesson step. */
export interface AIPracticeQuestion {
  id: string;
  type: "multipleChoice" | "numeric";
  prompt: string;
  /** multipleChoice */
  options?: { id: string; label: string }[];
  correctOptionId?: string;
  /** numeric */
  value?: number;
  tolerance?: number;
  unit?: string;
  /** Always shown after answering. */
  explanation: string;
}

/** A practice topic the learner can choose; maps 1:1 to a course lesson. */
export interface PracticeTopic {
  /** Lesson id, e.g. "lesson-1-position-velocity". */
  id: string;
  title: string;
  /** Short description of the concept, used to ground the AI prompt. */
  blurb: string;
}

export interface GenerateParams {
  topic: PracticeTopic;
  difficulty: Difficulty;
  /** Prompts already shown this session, so the model avoids repeats. */
  avoidPrompts?: string[];
}
