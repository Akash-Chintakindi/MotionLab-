import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  getAllLessonProgress,
  getCourseProgress,
  getStreak,
} from "../services/progressService";
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

  return {
    loading,
    courseProgress,
    lessonProgress,
    streak,
    refresh,
    isUnlocked,
    statusOf,
  };
}
