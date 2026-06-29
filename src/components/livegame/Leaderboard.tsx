import { topPlayers, type LivePlayer } from "../../lib/liveGame";

/** Animated top-N leaderboard with score bars. */
export function Leaderboard({
  players,
  meUid,
  count = 5,
  title = "Leaderboard",
}: {
  players: LivePlayer[];
  meUid?: string;
  count?: number;
  title?: string;
}) {
  const top = topPlayers(players, count);
  const max = Math.max(1, top[0]?.score ?? 0);

  return (
    <div data-testid="live-leaderboard">
      <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent-600 dark:text-accent-300">
        {title}
      </p>
      {top.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No scores yet.</p>
      ) : (
        <ol className="space-y-2">
          {top.map((p, i) => {
            const isMe = p.uid === meUid;
            const pct = Math.round((p.score / max) * 100);
            return (
              <li
                key={p.uid}
                className={[
                  "relative overflow-hidden rounded-2xl p-3 ring-1 transition-all",
                  isMe ? "ring-brand-400 dark:ring-brand-500/30" : "ring-slate-200 dark:ring-slate-700/70",
                ].join(" ")}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500/15 to-accent-500/15 transition-[width] duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
                <div className="relative flex items-center gap-3">
                  <span
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold",
                      i === 0
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                        : i === 1
                          ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                          : i === 2
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                    ].join(" ")}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink dark:text-slate-100">
                    {p.name}
                    {isMe && (
                      <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        You
                      </span>
                    )}
                  </span>
                  <span className="font-display text-lg font-bold tabular-nums text-ink dark:text-slate-100">
                    {p.score.toLocaleString()}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
