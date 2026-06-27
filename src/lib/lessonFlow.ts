import { getNextLessonId } from "../content/course";
import { hasQuiz } from "../content/quizzes";

export type LessonMode = "learn" | "quiz";

export interface NextDestination {
  href: string;
  label: string;
}

/**
 * Computes where a learner should go next after finishing a given mode of a
 * lesson. The flow is Learn -> Quiz -> next lesson's Learn; a quiz that doesn't
 * exist for the lesson is skipped. (Practice is now woven into Learn itself.)
 */
export function nextDestination(
  lessonId: string,
  mode: LessonMode,
): NextDestination | null {
  if (mode === "learn") {
    if (hasQuiz(lessonId)) {
      return { href: `/lesson/${lessonId}/quiz`, label: "Take the quiz" };
    }
    return nextLesson(lessonId);
  }

  // mode === "quiz"
  return nextLesson(lessonId);
}

function nextLesson(lessonId: string): NextDestination | null {
  const nextId = getNextLessonId(lessonId);
  if (!nextId) return null;
  return { href: `/lesson/${nextId}`, label: "Next lesson" };
}
