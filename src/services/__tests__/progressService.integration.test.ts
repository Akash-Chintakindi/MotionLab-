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
  completeLesson,
  ensureUserBootstrap,
  getCourseProgress,
  getLessonProgress,
  getStreak,
  recordDailyActivity,
  recordStepAttempt,
  recordStepResult,
  startLesson,
} from "../progressService";
import { FIRST_LESSON_ID, getNextLessonId } from "../../content/course";

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

  it("completes a lesson and unlocks the next one", async () => {
    const uid = await freshUser();
    await ensureUserBootstrap(uid, "bob@example.com", "Bob", fdb);
    const next = getNextLessonId(FIRST_LESSON_ID);

    const { unlockedLessonId } = await completeLesson(
      uid,
      FIRST_LESSON_ID,
      0.9,
      fdb,
    );
    expect(unlockedLessonId).toBe(next);

    const cp = await getCourseProgress(uid, fdb);
    expect(cp!.completedLessonIds).toContain(FIRST_LESSON_ID);
    expect(cp!.unlockedLessonIds).toContain(next!);
    expect(cp!.currentLessonId).toBe(next);
    expect(cp!.masteryByLesson[FIRST_LESSON_ID]).toBeCloseTo(0.9);

    const lp = await getLessonProgress(uid, FIRST_LESSON_ID, fdb);
    expect(lp!.status).toBe("completed");
    expect(lp!.completedAt).toBeTypeOf("number");
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
});
