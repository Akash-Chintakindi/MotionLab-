// ---------------------------------------------------------------------------
// BossMapPage — route target for /games/bosses. A Mario-style vertical tower:
// 11 nodes (10 mini-bosses in course order + the finale crowning the top).
// Each node shows its locked / available / defeated state, your best score and
// star rating, and links into the fight when available. The header frames the
// whole climb as the "Boss Tower" with an aggregate of bests + stars.
// ---------------------------------------------------------------------------

import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Spinner } from "../components/Spinner";
import { useProgress } from "../hooks/useProgress";
import { getLesson } from "../content/course";
import { finale, miniBosses } from "../games/arcade/boss/bossRegistry";
import type { BossConfig } from "../games/arcade/boss/bossTypes";

type NodeState = "locked" | "available" | "defeated";

export default function BossMapPage() {
  const {
    loading,
    courseProgress,
    bossUnlocked,
    bossDefeated,
    finaleUnlocked,
  } = useProgress();

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner label="Loading the tower…" />
        </div>
      </AppShell>
    );
  }

  const defeats = courseProgress?.bossDefeats ?? {};

  const stateFor = (boss: BossConfig): NodeState => {
    if (bossDefeated(boss.id)) return "defeated";
    const open =
      boss.lessonId === null ? finaleUnlocked() : bossUnlocked(boss.lessonId);
    return open ? "available" : "locked";
  };

  const defeatedCount = miniBosses.filter((b) => bossDefeated(b.id)).length;
  const totalStars = Object.values(defeats).reduce(
    (sum, d) => sum + (d?.stars ?? 0),
    0,
  );
  const towerBest = Object.values(defeats).reduce(
    (sum, d) => sum + (d?.bestScore ?? 0),
    0,
  );

  // Render the finale at the very top, then the mini-bosses descending to #1.
  const ordered: BossConfig[] = [finale, ...[...miniBosses].reverse()];

  return (
    <AppShell>
      <section
        data-testid="boss-map"
        className="mx-auto w-full max-w-2xl py-2"
      >
        <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a0a2e] via-[#241046] to-[#0a0618] p-6 text-white shadow-xl ring-1 ring-white/10">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-fuchsia-300/80">
            Vektor vs. the Forces
          </p>
          <h1 className="mt-1 font-display text-4xl font-black tracking-tight">
            Boss Tower
          </h1>
          <p className="mt-2 max-w-md text-sm text-slate-300">
            Pass a lesson's quiz to unlock its Force. Climb all ten, then face
            The Singularity at the summit.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Stat label="Forces beaten" value={`${defeatedCount}/10`} />
            <Stat label="Stars" value={`★ ${totalStars}`} />
            <Stat label="Tower score" value={towerBest.toLocaleString()} />
          </div>
        </header>

        <ol className="relative mt-6 space-y-3">
          {/* Vertical spine connecting the ladder rungs. */}
          <span
            aria-hidden
            className="absolute bottom-6 left-[27px] top-6 w-0.5 bg-gradient-to-b from-fuchsia-500/60 via-white/15 to-cyan-500/60"
          />
          {ordered.map((boss) => (
            <BossNode
              key={boss.id}
              boss={boss}
              state={stateFor(boss)}
              stars={defeats[boss.id]?.stars}
              best={defeats[boss.id]?.bestScore}
            />
          ))}
        </ol>
      </section>
    </AppShell>
  );
}

function BossNode({
  boss,
  state,
  stars,
  best,
}: {
  boss: BossConfig;
  state: NodeState;
  stars?: 1 | 2 | 3;
  best?: number;
}) {
  const isFinale = boss.lessonId === null;
  const lesson = boss.lessonId ? getLesson(boss.lessonId) : null;
  const accent = boss.visual.primary;
  const locked = state === "locked";

  const badgeNumber = isFinale ? "★" : String(boss.index);

  const inner = (
    <div
      className={[
        "relative flex items-center gap-4 rounded-2xl border p-4 transition",
        locked
          ? "border-slate-200 bg-slate-100/80 dark:border-slate-700/70 dark:bg-slate-800/80"
          : "border-white/10 bg-[#120a22] text-white hover:-translate-y-0.5 hover:border-white/25 hover:shadow-lg",
        isFinale && !locked ? "ring-1 ring-fuchsia-400/40" : "",
      ].join(" ")}
    >
      <div
        className="z-[1] flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-black shadow-md"
        style={
          locked
            ? { background: "#cbd5e1", color: "#475569" }
            : {
                background: `radial-gradient(circle at 30% 30%, ${accent}, ${boss.visual.secondary})`,
                color: "#fff",
                boxShadow: `0 0 18px ${accent}66`,
              }
        }
        aria-hidden
      >
        {state === "defeated" ? "✓" : locked ? "🔒" : badgeNumber}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3
            className={`truncate font-display text-lg font-bold ${
              locked ? "text-slate-500 dark:text-slate-400" : ""
            }`}
            style={!locked ? { color: accent } : undefined}
          >
            {boss.name}
          </h3>
          {state === "defeated" && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
              Defeated
            </span>
          )}
        </div>
        <p
          className={`truncate text-xs ${locked ? "text-slate-400 dark:text-slate-500" : "text-slate-300"}`}
        >
          {boss.title}
          {lesson ? ` · ${lesson.title}` : " · Three-phase finale"}
        </p>

        {state === "defeated" ? (
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
            <Stars stars={stars ?? 1} />
            {best ? <span className="text-amber-300">Best {best}</span> : null}
          </div>
        ) : locked ? (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {isFinale
              ? "Defeat all ten Forces to unlock."
              : "Pass the quiz (70%+) to unlock."}
          </p>
        ) : (
          <p className="mt-1 text-xs font-semibold text-slate-200">
            Ready to challenge
          </p>
        )}
      </div>

      {!locked && (
        <span
          aria-hidden
          className="shrink-0 text-xl text-white/40 transition group-hover:translate-x-0.5"
        >
          →
        </span>
      )}
    </div>
  );

  if (locked) {
    return (
      <li aria-disabled className="cursor-not-allowed opacity-80">
        {inner}
      </li>
    );
  }

  return (
    <li>
      <Link
        to={`/games/boss/${boss.id}`}
        data-testid={`boss-node-${boss.id}`}
        className="group block"
      >
        {inner}
      </Link>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-xl bg-white/10 px-3 py-1.5 ring-1 ring-white/10">
      <span className="font-bold text-white">{value}</span>{" "}
      <span className="text-xs text-slate-300">{label}</span>
    </span>
  );
}

function Stars({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <span className="text-amber-300" aria-label={`${stars} of 3 stars`}>
      {"★".repeat(stars)}
      <span className="text-white/15">{"★".repeat(3 - stars)}</span>
    </span>
  );
}
