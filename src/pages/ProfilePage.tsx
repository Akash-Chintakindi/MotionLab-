import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useProgress } from "../hooks/useProgress";
import { course } from "../content/course";
import { AppShell } from "../components/AppShell";
import { Spinner } from "../components/Spinner";
import { milestoneCatalog, type Milestone } from "../lib/milestones";

export default function ProfilePage() {
  const { user } = useAuth();
  const { loading, courseProgress, streak } = useProgress();

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner label="Loading your profile…" />
        </div>
      </AppShell>
    );
  }

  const displayName = user?.displayName ?? "Learner";
  const email = user?.email ?? "—";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  const earned = new Set(streak?.milestoneIds ?? []);
  const completedCount = courseProgress?.completedLessonIds.length ?? 0;
  const totalLessons = course.lessons.length;
  const masteryVals = Object.values(courseProgress?.masteryByLesson ?? {});
  const avgMastery =
    masteryVals.length > 0
      ? Math.round(
          (masteryVals.reduce((a, b) => a + b, 0) / masteryVals.length) * 100,
        )
      : 0;

  const catalog = milestoneCatalog();
  const totalBadges = catalog.reduce((n, g) => n + g.milestones.length, 0);
  const earnedBadges = catalog.reduce(
    (n, g) => n + g.milestones.filter((m) => earned.has(m.id)).length,
    0,
  );

  return (
    <AppShell streak={streak?.currentStreak ?? 0}>
      <div className="mx-auto w-full max-w-5xl">
        <Link
          to="/"
          className="mb-4 inline-block text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Course
        </Link>

        {/* Identity card */}
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-600 font-display text-2xl font-bold text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight text-ink">
              {displayName}
            </h1>
            <p className="truncate text-sm text-slate-500">{email}</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Lessons" value={`${completedCount}/${totalLessons}`} />
          <Stat label="Avg. mastery" value={`${avgMastery}%`} />
          <Stat label="Day streak" value={`${streak?.currentStreak ?? 0}`} />
          <Stat label="Badges" value={`${earnedBadges}/${totalBadges}`} />
        </dl>
      </section>

      {/* Badges */}
      <section className="mt-6">
        <h2 className="mb-1 font-display text-lg font-bold text-ink">Badges</h2>
        <p className="mb-4 text-sm text-slate-500">
          {earnedBadges} of {totalBadges} earned. Keep going to unlock the rest.
        </p>

        <div className="space-y-6">
          {catalog.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-slate-400">
                {group.title}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.milestones.map((m) => (
                  <BadgeCard
                    key={m.id}
                    milestone={m}
                    earned={earned.has(m.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
      <div className="font-display text-xl font-bold text-ink">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function BadgeCard({
  milestone,
  earned,
}: {
  milestone: Milestone;
  earned: boolean;
}) {
  const rarity = milestone.rarity;

  if (!earned) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 opacity-80">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-xl grayscale">
          <span aria-hidden>{milestone.emoji}</span>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-slate-500">
            {milestone.label}
            <span aria-hidden className="text-xs">
              🔒
            </span>
          </p>
          <p className="text-xs leading-snug text-slate-400">
            {milestone.description}
          </p>
        </div>
      </div>
    );
  }

  const frame =
    rarity === "legendary"
      ? "bg-gradient-to-tr from-amber-50 to-yellow-100 ring-2 ring-amber-400"
      : rarity === "rare"
        ? "bg-gradient-to-tr from-indigo-50 to-cyan-50 ring-2 ring-cyan-300"
        : "bg-white ring-amber-200";
  const iconFrame =
    rarity === "legendary"
      ? "bg-white shadow-sm ring-1 ring-amber-300"
      : rarity === "rare"
        ? "bg-white shadow-sm ring-1 ring-cyan-200"
        : "bg-amber-50 ring-1 ring-amber-200";
  const tag =
    rarity === "legendary"
      ? { text: "Legendary", cls: "bg-amber-500 text-white" }
      : rarity === "rare"
        ? { text: "Rare", cls: "bg-cyan-500 text-white" }
        : null;

  return (
    <div
      data-testid={`badge-${milestone.id}`}
      className={`relative flex items-center gap-3 overflow-hidden rounded-2xl p-4 ring-1 ${frame}`}
    >
      {rarity && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rotate-12 bg-white/50 blur-xl"
        />
      )}
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${iconFrame}`}
      >
        <span aria-hidden>{milestone.emoji}</span>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-semibold text-ink">
          {milestone.label}
          {tag && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tag.cls}`}
            >
              {tag.text}
            </span>
          )}
        </p>
        <p className="text-xs leading-snug text-slate-500">
          {milestone.description}
        </p>
      </div>
    </div>
  );
}
