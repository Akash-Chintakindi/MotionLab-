import { beforeAll, describe, expect, it } from "vitest";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  awardCourseMilestones,
  awardProgressMilestones,
  completeLesson,
  ensureUserBootstrap,
  getCourseProgress,
  getLessonProgress,
  getStreak,
  recordQuizScore,
  recordDailyActivity,
  recordDailyProgress,
  recordStepAttempt,
  recordStepResult,
  startLesson,
  unlockNextLesson,
} from "../progressService";
import { course, FIRST_LESSON_ID, getNextLessonId } from "../../content/course";
import { DAILY_GOAL } from "../../lib/streak";

let fdb: Firestore;
let auth: Auth;

beforeAll(() => {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId: "demo-motionlab" },
    "integration",
  );
  auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  fdb = getFirestore(app);
  connectFirestoreEmulator(fdb, "127.0.0.1", 8080);
});

/** Creates and signs in a fresh user, returning their real auth uid. */
async function freshUser(): Promise<string> {
  const email = `bob_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
  const cred = await createUserWithEmailAndPassword(auth, email, "password123");
  return cred.user.uid;
}

describe("progressService (emulator)", () => {
  it("bootstraps a new user with the first lesson unlocked", async () => {
    const uid = await freshUser();
    await ensureUserBootstrap(uid, "bob@example.com", "Bob", fdb);
    const cp = await getCourseProgress(uid, fdb);
    expect(cp).not.toBeNull();
    expect(cp!.unlockedLessonIds).toContain(FIRST_LESSON_ID);
    expect(cp!.completedLessonIds).toHaveLength(0);
  });

  it("records step attempts and results", async () => {
    const uid = await freshUser();
    await ensureUserBootstrap(uid, "bob@example.com", "Bob", fdb);
    await startLesson(uid, FIRST_LESSON_ID, fdb);

    await recordStepAttempt(uid, FIRST_LESSON_ID, "l1-hook", fdb);
    await recordStepResult(uid, FIRST_LESSON_ID, "l1-hook", 0, true, fdb);

    const lp = await getLessonProgress(uid, FIRST_LESSON_ID, fdb);
    expect(lp!.status).toBe("in_progress");
    expect(lp!.completedStepIds).toContain("l1-hook");
    expect(lp!.attemptsByStep["l1-hook"]).toBe(2); // one wrong + one right
    expect(lp!.correctByStep["l1-hook"]).toBe(true);
    expect(lp!.currentStepIndex).toBe(1);
  });

  it("completes a lesson and records mastery without unlocking the next one", async () => {
    const uid = await freshUser();
    await ensureUserBootstrap(uid, "bob@example.com", "Bob", fdb);
    const next = getNextLessonId(FIRST_LESSON_ID);

    const { unlockedLessonId } = await completeLesson(
      uid,
      FIRST_LESSON_ID,
      0.9,
      fdb,
    );
    // Completing Learn no longer unlocks the next lesson.
    expect(unlockedLessonId).toBeNull();

    const cp = await getCourseProgress(uid, fdb);
    expect(cp!.completedLessonIds).toContain(FIRST_LESSON_ID);
    expect(cp!.unlockedLessonIds).not.toContain(next!);
    expect(cp!.unlockedLessonIds).toEqual([FIRST_LESSON_ID]);
    expect(cp!.currentLessonId).toBe(FIRST_LESSON_ID);
    expect(cp!.masteryByLesson[FIRST_LESSON_ID]).toBeCloseTo(0.9);

    const lp = await getLessonProgress(uid, FIRST_LESSON_ID, fdb);
    expect(lp!.status).toBe("completed");
    expect(lp!.completedAt).toBeTypeOf("number");
  });

  it("keeps the learner's best mastery across replays", async () => {
    const uid = await freshUser();
    await ensureUserBootstrap(uid, "bob@example.com", "Bob", fdb);

    await completeLesson(uid, FIRST_LESSON_ID, 0.9, fdb);
    // A later, weaker replay must not drop the stored mastery below 0.9.
    await completeLesson(uid, FIRST_LESSON_ID, 0.5, fdb);

    const cp = await getCourseProgress(uid, fdb);
    expect(cp!.masteryByLesson[FIRST_LESSON_ID]).toBeCloseTo(0.9);
  });

  it("unlocks the next lesson when a quiz is finished", async () => {
    const uid = await freshUser();
    await ensureUserBootstrap(uid, "bob@example.com", "Bob", fdb);
    const next = getNextLessonId(FIRST_LESSON_ID);

    const { unlockedLessonId } = await unlockNextLesson(
      uid,
      FIRST_LESSON_ID,
      fdb,
    );
    expect(unlockedLessonId).toBe(next);

    const cp = await getCourseProgress(uid, fdb);
    expect(cp!.unlockedLessonIds).toContain(next!);
    expect(cp!.currentLessonId).toBe(next);
  });

  it("returns null and unlocks nothing for the final lesson", async () => {
    const uid = await freshUser();
    await ensureUserBootstrap(uid, "bob@example.com", "Bob", fdb);
    const lastLessonId = course.lessons[course.lessons.length - 1].id;

    const { unlockedLessonId } = await unlockNextLesson(
      uid,
      lastLessonId,
      fdb,
    );
    expect(unlockedLessonId).toBeNull();

    const cp = await getCourseProgress(uid, fdb);
    expect(cp!.unlockedLessonIds).not.toContain(lastLessonId);
  });

  it("awards the first-lesson milestone and records a streak", async () => {
    const uid = await freshUser();
    await ensureUserBootstrap(uid, "bob@example.com", "Bob", fdb);
    await completeLesson(uid, FIRST_LESSON_ID, 1, fdb);
    await awardCourseMilestones(uid, 1, fdb);
    const streak = await recordDailyActivity(uid, fdb);

    expect(streak.currentStreak).toBe(1);
    const persisted = await getStreak(uid, fdb);
    expect(persisted!.milestoneIds).toContain("first-lesson");
  });

  it("counts daily problems and banks a freeze at the daily goal", async () => {
    const uid = await freshUser();
    await ensureUserBootstrap(uid, "kim@example.com", "Kim", fdb);

    let streak = await getStreak(uid, fdb);
    for (let i = 0; i < DAILY_GOAL; i += 1) {
      streak = await recordDailyProgress(uid, fdb, "2026-03-01");
    }

    expect(streak!.dailyCount).toBe(DAILY_GOAL);
    expect(streak!.freezes).toBe(1);
    expect(streak!.currentStreak).toBe(1);

    const persisted = await getStreak(uid, fdb);
    expect(persisted!.dailyCount).toBe(DAILY_GOAL);
    expect(persisted!.freezes).toBe(1);
  });

  it("awards quiz and Triple Threat milestones from saved progress", async () => {
    const uid = await freshUser();
    await ensureUserBootstrap(uid, "bob@example.com", "Bob", fdb);
    // Completing at 100% mastery satisfies Triple Threat's mastery requirement.
    await completeLesson(uid, FIRST_LESSON_ID, 1, fdb);
    await recordQuizScore(uid, FIRST_LESSON_ID, 100, fdb);

    await awardProgressMilestones(uid, fdb);

    const persisted = await getStreak(uid, fdb);
    expect(persisted!.milestoneIds).toEqual(
      expect.arrayContaining(["quiz-sharp", "quiz-ace", "triple-threat"]),
    );
    expect(persisted!.milestoneIds).not.toContain("quiz-champion");
  });
});
