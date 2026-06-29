import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  getAllLessonProgress,
  getCourseProgress,
  getStreak,
} from "../services/progressService";
import { course } from "../content/course";
import {
  bossUnlocked as bossUnlockedFor,
  finaleUnlocked as finaleUnlockedFor,
} from "../lib/gating";
import type {
  CourseProgress,
  LessonProgress,
  LessonStatus,
  StreakData,
} from "../types/progress";

export interface ProgressState {
  loading: boolean;
  courseProgress: CourseProgress | null;
  lessonProgress: Record<string, LessonProgress>;
  streak: StreakData | null;
  refresh: () => Promise<void>;
  isUnlocked: (lessonId: string) => boolean;
  statusOf: (lessonId: string) => LessonStatus;
  /** Boss Fight Mode: a mini-boss is unlocked once its quiz is passed (>=70%). */
  bossUnlocked: (lessonId: string) => boolean;
  /** Boss Fight Mode: whether a boss (lessonId or "finale") has been defeated. */
  bossDefeated: (bossId: string) => boolean;
  /** Boss Fight Mode: the finale unlocks once all mini-bosses are defeated. */
  finaleUnlocked: () => boolean;
}

export function useProgress(): ProgressState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(
    null,
  );
  const [lessonProgress, setLessonProgress] = useState<
    Record<string, LessonProgress>
  >({});
  const [streak, setStreak] = useState<StreakData | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [cp, lp, st] = await Promise.all([
      getCourseProgress(user.uid),
      getAllLessonProgress(user.uid),
      getStreak(user.uid),
    ]);
    setCourseProgress(cp);
    setLessonProgress(lp);
    setStreak(st);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const isUnlocked = useCallback(
    (lessonId: string) =>
      courseProgress?.unlockedLessonIds.includes(lessonId) ?? false,
    [courseProgress],
  );

  const statusOf = useCallback(
    (lessonId: string): LessonStatus => {
      // Course-level completion is permanent, even while replaying a finished
      // lesson (which temporarily flips the lesson doc back to "in_progress").
      if (courseProgress?.completedLessonIds.includes(lessonId)) {
        return "completed";
      }
      return lessonProgress[lessonId]?.status ?? "not_started";
    },
    [courseProgress, lessonProgress],
  );

  const miniBossLessonIds = useMemo(
    () => course.lessons.map((l) => l.id),
    [],
  );

  const bossUnlocked = useCallback(
    (lessonId: string) => bossUnlockedFor(courseProgress, lessonId),
    [courseProgress],
  );

  const bossDefeated = useCallback(
    (bossId: string) =>
      courseProgress?.bossDefeats?.[bossId]?.defeated ?? false,
    [courseProgress],
  );

  const finaleUnlocked = useCallback(
    () => finaleUnlockedFor(courseProgress, miniBossLessonIds),
    [courseProgress, miniBossLessonIds],
  );

  return {
    loading,
    courseProgress,
    lessonProgress,
    streak,
    refresh,
    isUnlocked,
    statusOf,
    bossUnlocked,
    bossDefeated,
    finaleUnlocked,
  };
}
