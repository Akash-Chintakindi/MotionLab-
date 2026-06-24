import { getNextLessonId } from "../content/course";
import { hasGame } from "../games/registry";
import { hasQuiz } from "../content/quizzes";

export type LessonMode = "learn" | "practice" | "quiz";

export interface NextDestination {
  href: string;
  label: string;
}

/**
 * Computes where a learner should go next after finishing a given mode of a
 * lesson. The flow is Learn -> Practice -> Quiz -> next lesson's Learn, but
 * modes that don't exist for the lesson are skipped.
 */
export function nextDestination(
  lessonId: string,
  mode: LessonMode,
): NextDestination | null {
  if (mode === "learn") {
    if (hasGame(lessonId)) {
      return {
        href: `/lesson/${lessonId}/practice`,
        label: "Practice this lesson",
      };
    }
    if (hasQuiz(lessonId)) {
      return { href: `/lesson/${lessonId}/quiz`, label: "Take the quiz" };
    }
    return nextLesson(lessonId);
  }

  if (mode === "practice") {
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
