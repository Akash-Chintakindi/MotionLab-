import type { Course, Lesson } from "../types/content";
import { lesson1 } from "./lessons/lesson-1-position-velocity";
import { lesson2 } from "./lessons/lesson-2-velocity-acceleration";
import { lesson3 } from "./lessons/lesson-3-displacement-area";
import { lesson4 } from "./lessons/lesson-4-acceleration-to-position";
import { lesson5 } from "./lessons/lesson-5-two-dimensions";
import { lesson6 } from "./lessons/lesson-6-projectile-motion";
import { lesson7 } from "./lessons/lesson-7-mastery-challenge";

export const COURSE_ID = "kinematics";

export const course: Course = {
  id: COURSE_ID,
  title: "AP Physics C Kinematics: Motion Through Calculus",
  description:
    "Learn position, velocity, acceleration, derivatives, integrals, and 2D motion by doing.",
  lessons: [lesson1, lesson2, lesson3, lesson4, lesson5, lesson6, lesson7].sort(
    (a, b) => a.order - b.order,
  ),
};

export function getLesson(lessonId: string): Lesson | undefined {
  return course.lessons.find((l) => l.id === lessonId);
}

export function getLessonByOrder(order: number): Lesson | undefined {
  return course.lessons.find((l) => l.order === order);
}

/** The lesson the linear path starts with. */
export const FIRST_LESSON_ID = course.lessons[0].id;

/** The id of the lesson after the given one, or null if it's the last. */
export function getNextLessonId(lessonId: string): string | null {
  const lesson = getLesson(lessonId);
  if (!lesson) return null;
  const next = getLessonByOrder(lesson.order + 1);
  return next ? next.id : null;
}
