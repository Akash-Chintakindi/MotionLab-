import { course } from "../content/course";
import type { PracticeTopic } from "./practiceTypes";

/** The selectable practice topics, derived from the course lessons. */
export function practiceTopics(): PracticeTopic[] {
  return course.lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    blurb: lesson.coreIdea,
  }));
}
