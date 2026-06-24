import { describe, expect, it } from "vitest";
import { nextDestination } from "../lessonFlow";
import { course } from "../../content/course";

const lesson1Id = "lesson-1-position-velocity";
const lesson2Id = course.lessons[1].id;
const lastLessonId = course.lessons[6].id;

describe("nextDestination", () => {
  it("sends lesson 1 learn to its practice", () => {
    expect(nextDestination(lesson1Id, "learn")).toEqual({
      href: `/lesson/${lesson1Id}/practice`,
      label: "Practice this lesson",
    });
  });

  it("sends lesson 1 practice to its quiz", () => {
    expect(nextDestination(lesson1Id, "practice")).toEqual({
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

  it("chains learn -> practice for lessons that have a game (all do now)", () => {
    expect(nextDestination(lesson2Id, "learn")).toEqual({
      href: `/lesson/${lesson2Id}/practice`,
      label: "Practice this lesson",
    });
  });

  it("chains the last lesson learn -> practice -> quiz, then stops", () => {
    expect(nextDestination(lastLessonId, "learn")).toEqual({
      href: `/lesson/${lastLessonId}/practice`,
      label: "Practice this lesson",
    });
    expect(nextDestination(lastLessonId, "practice")).toEqual({
      href: `/lesson/${lastLessonId}/quiz`,
      label: "Take the quiz",
    });
  });

  it("returns null after the last lesson's quiz", () => {
    expect(nextDestination(lastLessonId, "quiz")).toBeNull();
  });
});
