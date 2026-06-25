import type { QuizQuestion } from "../../types/content";

export type BankDifficulty = "easy" | "medium" | "hard";

/**
 * A standalone practice question, tagged by topic and difficulty. Extends
 * QuizQuestion so it grades with the existing `gradeQuestion` helper and can be
 * rendered by the same UI. Each item must be fully self-contained (no external
 * graph/figure required to answer) so it can appear in any context.
 */
export interface BankQuestion extends QuizQuestion {
  /** Lesson/topic id this question belongs to (see src/content/course.ts). */
  topicId: string;
  difficulty: BankDifficulty;
}
