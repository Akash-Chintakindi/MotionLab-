import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import type { Lesson } from "../types/content";
import {
  awardCourseMilestones,
  awardMilestones,
  completeLesson,
  getCourseProgress,
  getLessonProgress,
  getStreak,
  recordDailyActivity,
  recordStepAttempt,
  recordStepResult,
  resetLessonProgress,
  startLesson,
} from "../services/progressService";
import {
  buildLessonSummary,
  computeMastery,
  computeResumeIndex,
  type LessonSummary,
} from "../lib/lessonEngine";
import { modesUnlocked } from "../lib/gating";
import { accuracyMilestonesFor, COMEBACK } from "../lib/milestones";
import { course as courseContent } from "../content/course";
import { stepRequiresAnswer } from "../components/steps/types";
import type { FeedbackState } from "../components/feedback/Feedback";

/**
 * "play"   – working through the lesson interactively (fresh or resumed).
 * "summary" – revisiting a finished lesson: shows mastery + per-step breakdown.
 * "review"  – paging through a finished lesson's solved steps, read-only.
 */
export type LessonPhase = "play" | "summary" | "review";

export interface CompletionResult {
  mastery: number;
  streak: number;
  unlockedLessonId: string | null;
  /**
   * Whether this topic's Practice + Quiz are unlocked, i.e. the learner's best
   * mastery is >= 80%. Drives whether the completion screen offers a "next"
   * step or asks the learner to review and retry.
   */
  practiceUnlocked: boolean;
  /** Milestone ids earned as a result of finishing this lesson. */
  earnedMilestones: string[];
}

export interface LessonEngine {
  ready: boolean;
  authorized: boolean;
  phase: LessonPhase;
  index: number;
  locked: boolean;
  isAuto: boolean;
  isLastStep: boolean;
  canGoBack: boolean;
  /** True when revisiting an already-answered step: show its solved state. */
  prefillCorrect: boolean;
  progressPct: number;
  feedback: { state: FeedbackState; message: string; hint?: string };
  completion: CompletionResult | null;
  /** Per-step breakdown for a finished lesson (only set in the "summary" phase). */
  summary: LessonSummary | null;
  onAnswer: (correct: boolean, selectedOptionId?: string) => void;
  onContinue: () => void;
  onBack: () => void;
  /** Enter read-only review of a finished lesson's steps. */
  onReview: () => void;
  /** Wipe progress and replay the lesson from the first step. */
  onRestart: () => void;
}

/**
 * Encapsulates the lesson player state machine: authorization, resume,
 * per-step grading, progress writes, and lesson completion/unlock.
 */
export function useLessonEngine(
  user: User | null,
  lesson: Lesson | undefined,
): LessonEngine {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [phase, setPhase] = useState<LessonPhase>("play");
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [index, setIndex] = useState(0);
  // Indices of gradable steps the learner has answered correctly. Used both to
  // unlock "Continue" and to restore a step's solved state when navigating back.
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{
    state: FeedbackState;
    message: string;
    hint?: string;
  }>({ state: null, message: "" });
  const [completion, setCompletion] = useState<CompletionResult | null>(null);

  const wrongStepsRef = useRef<Set<string>>(new Set());
  const dailyMarkedRef = useRef(false);

  const steps = lesson?.steps ?? [];
  const step = steps[index];
  const isAuto = step ? !stepRequiresAnswer(step) : false;
  const isLastStep = index === steps.length - 1;
  // A step is "solved" when it's auto (no answer needed) or already answered.
  const reviewing = answered.has(index);
  const locked = isAuto || reviewing;

  const allAnswered = useCallback(
    () => new Set(Array.from({ length: steps.length }, (_, i) => i)),
    [steps.length],
  );

  useEffect(() => {
    let cancelled = false;
    // Reset all per-lesson state so navigating between lessons (e.g. "Start
    // next lesson") starts fresh instead of showing the previous completion.
    setReady(false);
    setAuthorized(false);
    setPhase("play");
    setSummary(null);
    setIndex(0);
    setAnswered(new Set());
    setFeedback({ state: null, message: "" });
    setCompletion(null);
    wrongStepsRef.current = new Set();
    dailyMarkedRef.current = false;

    async function load() {
      if (!user || !lesson) {
        setReady(true);
        return;
      }
      const course = await getCourseProgress(user.uid);
      const unlocked = course?.unlockedLessonIds.includes(lesson.id) ?? false;
      if (cancelled) return;
      setAuthorized(unlocked);
      if (unlocked && lesson.steps.length > 0) {
        const lp = await getLessonProgress(user.uid, lesson.id);
        if (cancelled) return;
        // Finished lessons open to the review summary. A restart replay flips
        // the doc back to "in_progress", so it resumes mid-lesson as expected.
        const finished = lp?.status === "completed";
        if (finished) {
          // Revisiting a finished lesson: show the review summary instead of
          // silently restarting it.
          const mastery = course?.masteryByLesson[lesson.id];
          setSummary(buildLessonSummary(lesson, lp, mastery));
          setPhase("summary");
        } else {
          const resume = computeResumeIndex(lp, lesson.steps.length);
          setIndex(resume);
          // Steps before the resume point were already solved; mark them so the
          // learner can page back and review them in their answered state.
          setAnswered(new Set(Array.from({ length: resume }, (_, i) => i)));
          setPhase("play");
          await startLesson(user.uid, lesson.id);
        }
      }
      setReady(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, lesson]);

  const markDailyActivity = useCallback(async () => {
    if (dailyMarkedRef.current || !user) return;
    dailyMarkedRef.current = true;
    await recordDailyActivity(user.uid);
  }, [user]);

  const finishLesson = useCallback(async () => {
    if (!user || !lesson) return;
    const mastery = computeMastery(steps.length, wrongStepsRef.current.size);
    const before = await getStreak(user.uid);
    const earnedBefore = new Set(before?.milestoneIds ?? []);
    // Capture the prior mastery (if any) before we overwrite it, to detect a
    // "Comeback Kid" improvement on a replayed lesson.
    const prevCourse = await getCourseProgress(user.uid);
    const prevMastery = prevCourse?.masteryByLesson[lesson.id];

    const { unlockedLessonId } = await completeLesson(
      user.uid,
      lesson.id,
      mastery,
    );
    const course = await getCourseProgress(user.uid);
    await awardCourseMilestones(
      user.uid,
      course?.completedLessonIds.length ?? 0,
    );

    const earnedIds = accuracyMilestonesFor(
      course?.masteryByLesson ?? {},
      courseContent.lessons.length,
    );
    if (prevMastery !== undefined && mastery > prevMastery + 1e-9) {
      earnedIds.push(COMEBACK.id);
    }
    await awardMilestones(user.uid, earnedIds);
    const streak = await recordDailyActivity(user.uid);
    const earnedMilestones = streak.milestoneIds.filter(
      (id) => !earnedBefore.has(id),
    );

    // Practice/Quiz unlock off the BEST stored mastery (set by completeLesson),
    // so a topic stays open even if this replay scored lower.
    const practiceUnlocked = modesUnlocked(course, lesson.id);

    // Cache the per-step breakdown so "Review answers" works straight from the
    // completion screen (not just when revisiting a finished lesson).
    const lp = await getLessonProgress(user.uid, lesson.id);
    setSummary(buildLessonSummary(lesson, lp, course?.masteryByLesson[lesson.id]));

    setCompletion({
      mastery,
      streak: streak.currentStreak,
      unlockedLessonId,
      practiceUnlocked,
      earnedMilestones,
    });
  }, [user, lesson, steps.length]);

  const onAnswer = useCallback(
    async (correct: boolean, selectedOptionId?: string) => {
      if (!user || !lesson || !step || reviewing) return;
      if (correct) {
        setAnswered((prev) => new Set(prev).add(index));
        setFeedback({ state: "correct", message: step.feedback.correct });
        await recordStepResult(user.uid, lesson.id, step.id, index, true);
        await markDailyActivity();
      } else {
        wrongStepsRef.current.add(step.id);
        // Prefer a tailored explanation for the exact wrong choice the learner
        // submitted; fall back to the step's generic `incorrect` message.
        const tailored =
          selectedOptionId !== undefined
            ? step.feedback.incorrectByOption?.[selectedOptionId]
            : undefined;
        setFeedback({
          state: "incorrect",
          message: tailored ?? step.feedback.incorrect,
          hint: step.feedback.hint,
        });
        await recordStepAttempt(user.uid, lesson.id, step.id);
      }
    },
    [user, lesson, step, index, reviewing, markDailyActivity],
  );

  const onContinue = useCallback(async () => {
    if (!step) return;
    // Read-only review: just page forward; the last step returns to the summary.
    if (phase === "review") {
      if (isLastStep) {
        setPhase("summary");
        setIndex(0);
        setAnswered(new Set());
      } else {
        setIndex((i) => i + 1);
      }
      setFeedback({ state: null, message: "" });
      return;
    }
    if (!user || !lesson) return;
    // Record auto steps the first time they're advanced past.
    if (isAuto && !reviewing) {
      await recordStepResult(user.uid, lesson.id, step.id, index, true);
      await markDailyActivity();
    }
    if (isLastStep) {
      await finishLesson();
      return;
    }
    setIndex((i) => i + 1);
    setFeedback({ state: null, message: "" });
  }, [
    user,
    lesson,
    step,
    index,
    isAuto,
    reviewing,
    isLastStep,
    phase,
    markDailyActivity,
    finishLesson,
  ]);

  const onBack = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    setFeedback({ state: null, message: "" });
  }, []);

  const onReview = useCallback(() => {
    // Clear any just-earned completion so the review steps render (the
    // completion screen otherwise takes render precedence).
    setCompletion(null);
    setIndex(0);
    setAnswered(allAnswered());
    setFeedback({ state: null, message: "" });
    setPhase("review");
  }, [allAnswered]);

  const onRestart = useCallback(async () => {
    if (!user || !lesson) {
      setPhase("play");
      return;
    }
    await resetLessonProgress(user.uid, lesson.id);
    wrongStepsRef.current = new Set();
    dailyMarkedRef.current = false;
    setIndex(0);
    setAnswered(new Set());
    setFeedback({ state: null, message: "" });
    setCompletion(null);
    setSummary(null);
    setPhase("play");
    await startLesson(user.uid, lesson.id);
  }, [user, lesson]);

  const displayFeedback = reviewing
    ? { state: "correct" as FeedbackState, message: step?.feedback.correct ?? "" }
    : feedback;

  const progressPct = steps.length
    ? Math.round(((index + (locked ? 1 : 0)) / steps.length) * 100)
    : 0;

  return {
    ready,
    authorized,
    phase,
    index,
    locked,
    isAuto,
    isLastStep,
    canGoBack: index > 0,
    prefillCorrect: reviewing,
    progressPct,
    feedback: displayFeedback,
    completion,
    summary,
    onAnswer,
    onContinue,
    onBack,
    onReview,
    onRestart,
  };
}
