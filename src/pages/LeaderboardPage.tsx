import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { AppShell } from "../components/AppShell";
import { Spinner } from "../components/Spinner";
import {
  getLeaderboard,
  LEADERBOARD_GAMES,
  type LeaderboardEntry,
} from "../services/leaderboardService";

const DEFAULT_GAME = "basketball";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [gameId, setGameId] = useState<string>(DEFAULT_GAME);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLeaderboard(gameId)
      .then((rows) => {
        if (active) setEntries(rows);
      })
      .catch(() => {
        if (active) setEntries([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [gameId]);

  return (
    <AppShell>
      <section data-testid="leaderboard-page" className="mx-auto w-full max-w-2xl py-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Leaderboard
        </h1>
        <p className="mt-2 text-base text-slate-600">
          See how your best runs stack up against everyone else.
        </p>

        {/* Game picker */}
        <div
          role="tablist"
          aria-label="Choose a game"
          className="mt-6 inline-flex rounded-xl bg-slate-100 p-1"
        >
          {LEADERBOARD_GAMES.map((g) => {
            const active = g.id === gameId;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`lb-game-${g.id}`}
                onClick={() => setGameId(g.id)}
                className={[
                  "rounded-lg px-4 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-800",
                ].join(" ")}
              >
                {g.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Spinner label="Loading scores…" />
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <p className="text-base font-semibold text-slate-600">
                No scores yet — be the first!
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Play a game and your best run will show up here.
              </p>
            </div>
          ) : (
            <ol data-testid="leaderboard-list" className="space-y-2">
              {entries.map((entry, index) => {
                const isMe = !!user && entry.uid === user.uid;
                return (
                  <li
                    key={entry.uid}
                    data-testid={`lb-row-${entry.uid}`}
                    className={[
                      "flex items-center gap-4 rounded-2xl p-4 ring-1 transition",
                      isMe
                        ? "bg-brand-50 ring-brand-300"
                        : "bg-white ring-slate-200",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold",
                        index === 0
                          ? "bg-amber-100 text-amber-700"
                          : index === 1
                            ? "bg-slate-200 text-slate-700"
                            : index === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                      {entry.name}
                      {isMe && (
                        <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          You
                        </span>
                      )}
                    </span>
                    <span className="font-display text-lg font-bold tabular-nums text-ink">
                      {entry.score.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    </AppShell>
  );
}
