import { useAuth } from "../auth/AuthProvider";
import { useProgress } from "../hooks/useProgress";
import { course, getLessonByOrder } from "../content/course";
import { AppShell } from "../components/AppShell";
import { DailyQuestionCard } from "../components/DailyQuestionCard";
import { LessonCard } from "../components/LessonCard";
import { MasteryPanel } from "../components/MasteryPanel";
import { MomentumGauge } from "../components/MomentumGauge";
import { Spinner } from "../components/Spinner";
import { getMilestone } from "../lib/milestones";

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    loading,
    courseProgress,
    statusOf,
    isUnlocked,
    streak,
  } = useProgress();

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner label="Loading your course…" />
        </div>
      </AppShell>
    );
  }

  const completedCount = courseProgress?.completedLessonIds.length ?? 0;
  const total = course.lessons.length;
  const pct = Math.round((completedCount / total) * 100);
  const firstName = (user?.displayName ?? "Learner").split(" ")[0];

  return (
    <AppShell streak={streak?.currentStreak ?? 0} freezes={streak?.freezes ?? 0}>
      <div className="space-y-6">
        <header>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-accent-600">
            {course.title}
          </p>
          <h1 className="mt-1 font-display text-[1.75rem] font-bold leading-tight tracking-tight text-ink dark:text-slate-100">
            Welcome back, {firstName}.
          </h1>
        </header>

        {/* Engagement band: gauge beside the daily question + progress + stats so
            these widgets spread horizontally instead of stacking down the page. */}
        <div className="grid gap-4 md:grid-cols-2 md:items-start">
          <MomentumGauge streak={streak} />

          <div className="flex flex-col gap-4">
            <DailyQuestionCard streak={streak} />

            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700/70">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Course progress</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {completedCount} / {total} lessons
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MiniStat
                label="Longest streak"
                value={`${streak?.longestStreak ?? 0}`}
                emoji="🏅"
              />
              <MiniStat
                label="Lessons done"
                value={`${completedCount}`}
                emoji="✅"
              />
            </div>
          </div>
        </div>

        {/* Main: lessons take the wide column; topic mastery + milestones sit in a
            sidebar so the tall mastery list runs alongside the lessons. */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
          <section
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            aria-label="Lessons"
          >
            {course.lessons.map((lesson) => {
              const prereq = getLessonByOrder(lesson.order - 1);
              return (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  status={statusOf(lesson.id)}
                  unlocked={isUnlocked(lesson.id)}
                  mastery={courseProgress?.masteryByLesson[lesson.id]}
                  quizBest={courseProgress?.quizScores?.[lesson.id]}
                  prerequisiteTitle={prereq?.title}
                />
              );
            })}
          </section>

          <aside className="mt-6 lg:mt-0">
            <MasteryPanel quizScores={courseProgress?.quizScores} />

            {(streak?.milestoneIds.length ?? 0) > 0 && (
              <div className="mt-3" data-testid="milestones">
                <h2 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Milestones
                </h2>
                <div className="flex flex-wrap gap-2">
                  {streak!.milestoneIds.map((id) => {
                    const m = getMilestone(id);
                    if (!m) return null;
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30"
                      >
                        <span aria-hidden>{m.emoji}</span>
                        {m.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function MiniStat({
  label,
  value,
  emoji,
}: {
  label: string;
  value: string;
  emoji: string;
}) {
  return (
    <div className="rounded-xl bg-white px-3 py-2.5 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700/70">
      <div className="font-display text-xl font-bold tabular-nums text-ink dark:text-slate-100">
        <span aria-hidden className="mr-0.5">
          {emoji}
        </span>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
