import type { Quiz } from "../../types/content";
import { quiz1 } from "./quiz-1-position-velocity";
import { quiz2 } from "./quiz-2-velocity-acceleration";
import { quiz3 } from "./quiz-3-displacement-area";
import { quiz4 } from "./quiz-4-acceleration-to-position";
import { quiz5 } from "./quiz-5-two-dimensions";
import { quiz6 } from "./quiz-6-projectile-motion";
import { quiz7 } from "./quiz-7-mastery-challenge";

const QUIZZES: Record<string, Quiz> = {
  [quiz1.lessonId]: quiz1,
  [quiz2.lessonId]: quiz2,
  [quiz3.lessonId]: quiz3,
  [quiz4.lessonId]: quiz4,
  [quiz5.lessonId]: quiz5,
  [quiz6.lessonId]: quiz6,
  [quiz7.lessonId]: quiz7,
};

export function getQuiz(lessonId: string): Quiz | undefined {
  return QUIZZES[lessonId];
}

export function hasQuiz(lessonId: string): boolean {
  return lessonId in QUIZZES;
}
