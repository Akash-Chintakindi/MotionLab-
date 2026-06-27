import { describe, expect, it } from "vitest";
import { nextDestination } from "../lessonFlow";
import { course } from "../../content/course";

const lesson1Id = "lesson-1-position-velocity";
const lesson2Id = course.lessons[1].id;
const lastLessonId = course.lessons[6].id;

describe("nextDestination", () => {
  it("sends lesson 1 learn straight to its quiz", () => {
    expect(nextDestination(lesson1Id, "learn")).toEqual({
      href: `/lesson/${lesson1Id}/quiz`,
      label: "Take the quiz",
    });
  });

  it("sends lesson 1 quiz to the next lesson", () => {
    expect(nextDestination(lesson1Id, "quiz")).toEqual({
      href: `/lesson/${lesson2Id}`,
      label: "Next lesson",
    });
  });

  it("chains learn -> quiz for any lesson that has a quiz", () => {
    expect(nextDestination(lesson2Id, "learn")).toEqual({
      href: `/lesson/${lesson2Id}/quiz`,
      label: "Take the quiz",
    });
  });

  it("chains the last lesson learn -> quiz, then stops", () => {
    expect(nextDestination(lastLessonId, "learn")).toEqual({
      href: `/lesson/${lastLessonId}/quiz`,
      label: "Take the quiz",
    });
  });

  it("returns null after the last lesson's quiz", () => {
    expect(nextDestination(lastLessonId, "quiz")).toBeNull();
  });
});
