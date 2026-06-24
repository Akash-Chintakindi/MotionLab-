import { useAuth } from "../auth/AuthProvider";
import { useProgress } from "../hooks/useProgress";
import { course, getLessonByOrder } from "../content/course";
import { AppShell } from "../components/AppShell";
import { LessonCard } from "../components/LessonCard";
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
    <AppShell streak={streak?.currentStreak ?? 0}>
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Hi {firstName} 👋
        </h1>
        <p className="mt-1 text-slate-500">{course.title}</p>

        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Course progress</span>
            <span className="text-slate-500">
              {completedCount} / {total} lessons
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <MiniStat
            label="Day streak"
            value={`${streak?.currentStreak ?? 0}`}
            emoji="🔥"
          />
          <MiniStat
            label="Longest"
            value={`${streak?.longestStreak ?? 0}`}
            emoji="🏅"
          />
          <MiniStat label="Completed" value={`${completedCount}`} emoji="✅" />
        </div>

        {(streak?.milestoneIds.length ?? 0) > 0 && (
          <div className="mt-3" data-testid="milestones">
            <h2 className="mb-2 text-sm font-semibold text-slate-600">
              Milestones
            </h2>
            <div className="flex flex-wrap gap-2">
              {streak!.milestoneIds.map((id) => {
                const m = getMilestone(id);
                if (!m) return null;
                return (
                  <span
                    key={id}
                    className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-900 ring-1 ring-amber-200"
                  >
                    <span aria-hidden>{m.emoji}</span>
                    {m.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-label="Lessons">
        {course.lessons.map((lesson) => {
          const prereq = getLessonByOrder(lesson.order - 1);
          return (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              status={statusOf(lesson.id)}
              unlocked={isUnlocked(lesson.id)}
              mastery={courseProgress?.masteryByLesson[lesson.id]}
              prerequisiteTitle={prereq?.title}
            />
          );
        })}
      </section>
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
    <div className="rounded-xl bg-white px-3 py-2.5 text-center ring-1 ring-slate-200">
      <div className="text-lg font-bold">
        <span aria-hidden className="mr-0.5">
          {emoji}
        </span>
        {value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
