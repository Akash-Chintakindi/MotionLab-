import { Link } from "react-router-dom";
import type { StreakData } from "../types/progress";
import { DAILY_GOAL, dailyCountFor } from "../lib/streak";

/**
 * The dashboard's signature element: a velocity-style gauge whose arc fills as
 * you solve today's problems, with the day-streak flame at its hub. It bundles
 * the whole engagement loop — daily goal, streak stakes (freeze tokens), and an
 * always-on review CTA — into one object that ties to MotionLab's motion theme.
 */
export function MomentumGauge({ streak }: { streak: StreakData | null }) {
  const data = streak ?? {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    milestoneIds: [],
  };
  const count = dailyCountFor(data);
  const goal = DAILY_GOAL;
  const remaining = Math.max(0, goal - count);
  const metGoal = count >= goal;
  const freezes = data.freezes ?? 0;

  // Gauge geometry: an arc swept from the top, clockwise.
  const r = 52;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, count / goal));
  const offset = c * (1 - frac);

  return (
    <div
      className="animate-rise-in overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80"
      data-testid="momentum-gauge"
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent-600">
          Today's momentum
        </p>
        <FreezeChips count={freezes} />
      </div>

      <div className="mt-3 flex items-center gap-5">
        <div className="relative shrink-0">
          <svg
            viewBox="0 0 120 120"
            className="h-[120px] w-[120px] -rotate-90"
            role="img"
            aria-label={`${count} of ${goal} problems solved today`}
          >
            <defs>
              <linearGradient id="momentum-arc" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0a5fe6" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="#e9eef6"
              strokeWidth="12"
            />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="url(#momentum-arc)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span
              className={`text-3xl leading-none ${data.currentStreak > 0 ? "animate-flicker" : "opacity-40 grayscale"}`}
              aria-hidden
            >
              🔥
            </span>
            <span
              className="mt-1 font-display text-2xl font-bold leading-none tabular-nums text-ink"
              data-testid="streak-day-count"
            >
              {data.currentStreak}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              day streak
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl font-bold tabular-nums text-ink">
            {count}
            <span className="text-slate-400"> / {goal}</span>
            <span className="ml-1.5 text-sm font-semibold text-slate-500">
              solved
            </span>
          </p>
          <p className="mt-1 text-sm leading-snug text-slate-600">
            {metGoal ? (
              <>
                Goal hit. Your streak is safe
                {freezes > 0 ? " and a freeze is banked." : "."}
              </>
            ) : data.currentStreak > 0 ? (
              <>
                <span className="font-semibold text-ink">{remaining} more</span> to
                keep your {data.currentStreak}-day streak alive.
              </>
            ) : (
              <>
                Solve <span className="font-semibold text-ink">{remaining}</span> to
                start a streak.
              </>
            )}
          </p>
          <Link
            to="/review"
            data-testid="momentum-review-cta"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:brightness-95"
          >
            {metGoal ? "Keep going — review" : "Solve today's review"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function FreezeChips({ count }: { count: number }) {
  if (count <= 0) {
    return (
      <span
        className="text-xs font-medium text-slate-400"
        title="Hit your daily goal to bank a streak freeze"
      >
        no freezes yet
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100"
      title="Streak freezes — each one saves your streak through one missed day"
    >
      <span aria-hidden>❄️</span>
      <span data-testid="freeze-count">{count}</span>
      <span className="text-brand-400">banked</span>
    </span>
  );
}
