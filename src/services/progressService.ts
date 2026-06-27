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
import {
  COURSE_ID,
  FIRST_LESSON_ID,
  course,
  getNextLessonId,
} from "../content/course";
import { computeStreak, EMPTY_STREAK, todayISO } from "../lib/streak";
import {
  courseMilestonesFor,
  quizMilestonesFor,
  tripleThreatMilestonesFor,
} from "../lib/milestones";
import type {
  CourseProgress,
  LessonProgress,
  StreakData,
  UserProfile,
} from "../types/progress";

const nowMs = () => Date.now();

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
 * Marks a lesson complete and records mastery. Completing the Learn step no
 * longer unlocks the next lesson — that now happens when the lesson's quiz is
 * finished (see {@link unlockNextLesson}). Always returns a null unlock id so
 * the completion screen hides its "Unlocked next lesson" text.
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

  // Keep the learner's BEST mastery so a topic stays unlocked (and earned
  // accuracy badges stick) even if a later replay scores lower.
  const prev = await getCourseProgress(uid, fdb);
  const bestMastery = Math.max(prev?.masteryByLesson?.[lessonId] ?? 0, mastery);

  await setDoc(
    courseDoc(uid, fdb),
    {
      completedLessonIds: arrayUnion(lessonId),
      masteryByLesson: { [lessonId]: bestMastery },
      updatedAt: nowMs(),
    },
    { merge: true },
  );

  return { unlockedLessonId: null };
}

/**
 * Unlocks the lesson after the given one and makes it the current lesson.
 * Called when a lesson's quiz is finished (any score). Returns the unlocked
 * lesson id, or null if this was the final lesson.
 */
export async function unlockNextLesson(
  uid: string,
  lessonId: string,
  fdb?: Firestore,
): Promise<{ unlockedLessonId: string | null }> {
  const nextLessonId = getNextLessonId(lessonId);
  if (nextLessonId) {
    await setDoc(
      courseDoc(uid, fdb),
      {
        unlockedLessonIds: arrayUnion(nextLessonId),
        currentLessonId: nextLessonId,
        updatedAt: nowMs(),
      },
      { merge: true },
    );
  }
  return { unlockedLessonId: nextLessonId };
}

/**
 * Records a quiz result, keeping only the learner's best score (0–100) per
 * lesson. Returns the best score now stored.
 */
export async function recordQuizScore(
  uid: string,
  lessonId: string,
  scorePct: number,
  fdb?: Firestore,
): Promise<number> {
  const current = await getCourseProgress(uid, fdb);
  const prev = current?.quizScores?.[lessonId] ?? 0;
  const best = Math.max(prev, Math.round(scorePct));
  await setDoc(
    courseDoc(uid, fdb),
    { quizScores: { [lessonId]: best }, updatedAt: nowMs() },
    { merge: true },
  );
  return best;
}

/**
 * Records a practice-game result, keeping only the best score (0–100) per
 * lesson. Returns the best score now stored.
 */
export async function recordPracticeScore(
  uid: string,
  lessonId: string,
  scorePct: number,
  fdb?: Firestore,
): Promise<number> {
  const current = await getCourseProgress(uid, fdb);
  const prev = current?.practiceScores?.[lessonId] ?? 0;
  const best = Math.max(prev, Math.round(scorePct));
  await setDoc(
    courseDoc(uid, fdb),
    { practiceScores: { [lessonId]: best }, updatedAt: nowMs() },
    { merge: true },
  );
  return best;
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
 * Awards badges that depend on accumulated course progress rather than a
 * single lesson event: quiz accuracy/completion goals and Triple Threat
 * (Learn + Practice + Quiz on the same lesson).
 */
export async function awardProgressMilestones(
  uid: string,
  fdb?: Firestore,
): Promise<string[]> {
  const progress = await getCourseProgress(uid, fdb);
  if (!progress) return (await getStreak(uid, fdb))?.milestoneIds ?? [];

  const ids = [
    ...quizMilestonesFor(progress.quizScores ?? {}, course.lessons.length),
    ...tripleThreatMilestonesFor(
      progress.completedLessonIds,
      progress.practiceScores ?? {},
      progress.quizScores ?? {},
    ),
  ];
  return awardMilestones(uid, ids, fdb);
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
