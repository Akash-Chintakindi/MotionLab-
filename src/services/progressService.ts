import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  type Firestore,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { COURSE_ID, FIRST_LESSON_ID, getNextLessonId } from "../content/course";
import { computeStreak, EMPTY_STREAK, todayISO } from "../lib/streak";
import { courseMilestonesFor } from "../lib/milestones";
import type {
  CourseProgress,
  LessonProgress,
  StreakData,
  UserProfile,
} from "../types/progress";

const nowMs = () => Date.now();

export { todayISO, computeStreak };

// ---- Document references -------------------------------------------------

function database(database?: Firestore): Firestore {
  return database ?? db;
}

const userDoc = (uid: string, fdb?: Firestore) =>
  doc(database(fdb), "users", uid);
const courseDoc = (uid: string, fdb?: Firestore) =>
  doc(database(fdb), "users", uid, "courseProgress", COURSE_ID);
const streakDoc = (uid: string, fdb?: Firestore) =>
  doc(database(fdb), "users", uid, "streaks", "current");
const lessonDoc = (uid: string, lessonId: string, fdb?: Firestore) =>
  doc(database(fdb), "users", uid, "lessonProgress", lessonId);
const lessonCol = (uid: string, fdb?: Firestore) =>
  collection(database(fdb), "users", uid, "lessonProgress");

// ---- Bootstrapping -------------------------------------------------------

/**
 * Ensures the user profile, course progress, and streak docs exist.
 * Safe to call on every sign-in; existing data is preserved.
 */
export async function ensureUserBootstrap(
  uid: string,
  email: string,
  displayName: string,
  fdb?: Firestore,
): Promise<void> {
  const profileSnap = await getDoc(userDoc(uid, fdb));
  if (!profileSnap.exists()) {
    const profile: UserProfile = {
      displayName,
      email,
      createdAt: nowMs(),
      lastActiveAt: nowMs(),
    };
    await setDoc(userDoc(uid, fdb), profile);
  } else {
    await updateDoc(userDoc(uid, fdb), { lastActiveAt: nowMs() });
  }

  const courseSnap = await getDoc(courseDoc(uid, fdb));
  if (!courseSnap.exists()) {
    const courseProgress: CourseProgress = {
      unlockedLessonIds: [FIRST_LESSON_ID],
      completedLessonIds: [],
      currentLessonId: FIRST_LESSON_ID,
      masteryByLesson: {},
      updatedAt: nowMs(),
    };
    await setDoc(courseDoc(uid, fdb), courseProgress);
  }

  const streakSnap = await getDoc(streakDoc(uid, fdb));
  if (!streakSnap.exists()) {
    const streak: StreakData = {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      milestoneIds: [],
    };
    await setDoc(streakDoc(uid, fdb), streak);
  }
}

// ---- Reads ---------------------------------------------------------------

export async function getCourseProgress(
  uid: string,
  fdb?: Firestore,
): Promise<CourseProgress | null> {
  const snap = await getDoc(courseDoc(uid, fdb));
  return snap.exists() ? (snap.data() as CourseProgress) : null;
}

export async function getLessonProgress(
  uid: string,
  lessonId: string,
  fdb?: Firestore,
): Promise<LessonProgress | null> {
  const snap = await getDoc(lessonDoc(uid, lessonId, fdb));
  return snap.exists() ? (snap.data() as LessonProgress) : null;
}

export async function getAllLessonProgress(
  uid: string,
  fdb?: Firestore,
): Promise<Record<string, LessonProgress>> {
  const snap = await getDocs(lessonCol(uid, fdb));
  const out: Record<string, LessonProgress> = {};
  snap.forEach((d) => {
    out[d.id] = d.data() as LessonProgress;
  });
  return out;
}

export async function getStreak(
  uid: string,
  fdb?: Firestore,
): Promise<StreakData | null> {
  const snap = await getDoc(streakDoc(uid, fdb));
  return snap.exists() ? (snap.data() as StreakData) : null;
}

// ---- Writes --------------------------------------------------------------

export async function startLesson(
  uid: string,
  lessonId: string,
  fdb?: Firestore,
): Promise<void> {
  await setDoc(
    lessonDoc(uid, lessonId, fdb),
    {
      lessonId,
      status: "in_progress",
      lastUpdatedAt: nowMs(),
    },
    { merge: true },
  );
  await setDoc(
    courseDoc(uid, fdb),
    { currentLessonId: lessonId, updatedAt: nowMs() },
    { merge: true },
  );
}

/**
 * Records a single (incorrect) attempt without marking the step complete.
 * Used so wrong-then-right flows accurately count attempts.
 */
export async function recordStepAttempt(
  uid: string,
  lessonId: string,
  stepId: string,
  fdb?: Firestore,
): Promise<void> {
  await setDoc(
    lessonDoc(uid, lessonId, fdb),
    {
      lessonId,
      status: "in_progress",
      attemptsByStep: { [stepId]: increment(1) },
      correctByStep: { [stepId]: false },
      lastUpdatedAt: nowMs(),
    },
    { merge: true },
  );
}

/**
 * Records the outcome of a single step attempt. Idempotently marks the step
 * complete and advances the saved step index.
 */
export async function recordStepResult(
  uid: string,
  lessonId: string,
  stepId: string,
  stepIndex: number,
  correct: boolean,
  fdb?: Firestore,
): Promise<void> {
  await setDoc(
    lessonDoc(uid, lessonId, fdb),
    {
      lessonId,
      status: "in_progress",
      currentStepIndex: stepIndex + 1,
      completedStepIds: arrayUnion(stepId),
      attemptsByStep: { [stepId]: increment(1) },
      correctByStep: { [stepId]: correct },
      lastUpdatedAt: nowMs(),
    },
    { merge: true },
  );
}

/**
 * Wipes a lesson's per-step progress so the learner can replay it from scratch.
 * Course-level completion/unlocks are intentionally left untouched, so the
 * lesson keeps its "Completed" badge and the next lesson stays open.
 */
export async function resetLessonProgress(
  uid: string,
  lessonId: string,
  fdb?: Firestore,
): Promise<void> {
  const fresh: LessonProgress = {
    lessonId,
    status: "in_progress",
    currentStepIndex: 0,
    completedStepIds: [],
    attemptsByStep: {},
    correctByStep: {},
    lastUpdatedAt: nowMs(),
    completedAt: null,
  };
  // Overwrite (no merge) to clear accumulated attempt counts.
  await setDoc(lessonDoc(uid, lessonId, fdb), fresh);
}

/**
 * Marks a lesson complete, unlocks the next lesson, and records mastery.
 * Returns the unlocked lesson id (or null if this was the final lesson).
 */
export async function completeLesson(
  uid: string,
  lessonId: string,
  mastery: number,
  fdb?: Firestore,
): Promise<{ unlockedLessonId: string | null }> {
  await setDoc(
    lessonDoc(uid, lessonId, fdb),
    {
      lessonId,
      status: "completed",
      completedAt: nowMs(),
      lastUpdatedAt: nowMs(),
    },
    { merge: true },
  );

  const nextLessonId = getNextLessonId(lessonId);
  const courseUpdate: Record<string, unknown> = {
    completedLessonIds: arrayUnion(lessonId),
    masteryByLesson: { [lessonId]: mastery },
    updatedAt: nowMs(),
  };
  if (nextLessonId) {
    courseUpdate.unlockedLessonIds = arrayUnion(nextLessonId);
    courseUpdate.currentLessonId = nextLessonId;
  }
  await setDoc(courseDoc(uid, fdb), courseUpdate, { merge: true });

  return { unlockedLessonId: nextLessonId };
}

/**
 * Merges an arbitrary set of earned milestone ids into the streak document.
 * Used for accuracy and challenge badges computed by the lesson engine.
 */
export async function awardMilestones(
  uid: string,
  ids: string[],
  fdb?: Firestore,
): Promise<string[]> {
  if (ids.length === 0) {
    return (await getStreak(uid, fdb))?.milestoneIds ?? [];
  }
  await setDoc(
    streakDoc(uid, fdb),
    { milestoneIds: arrayUnion(...ids) },
    { merge: true },
  );
  return (await getStreak(uid, fdb))?.milestoneIds ?? ids;
}

/**
 * Records that the user did learning activity today and updates the streak.
 * Pure day-difference logic; milestones are expanded in Phase 5.
 */
export async function recordDailyActivity(
  uid: string,
  fdb?: Firestore,
  today = todayISO(),
): Promise<StreakData> {
  const current = (await getStreak(uid, fdb)) ?? EMPTY_STREAK;
  const next = computeStreak(current, today);
  await setDoc(streakDoc(uid, fdb), next, { merge: true });
  return next;
}

/**
 * Merges course-progress milestones (first lesson, halfway, complete) into the
 * streak document's milestone list. Returns the full milestone id set.
 */
export async function awardCourseMilestones(
  uid: string,
  lessonsCompleted: number,
  fdb?: Firestore,
): Promise<string[]> {
  const ids = courseMilestonesFor(lessonsCompleted);
  if (ids.length === 0) {
    return (await getStreak(uid, fdb))?.milestoneIds ?? [];
  }
  await setDoc(
    streakDoc(uid, fdb),
    { milestoneIds: arrayUnion(...ids) },
    { merge: true },
  );
  return (await getStreak(uid, fdb))?.milestoneIds ?? ids;
}
