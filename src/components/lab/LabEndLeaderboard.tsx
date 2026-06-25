import { useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import {
  getLeaderboard,
  recordLeaderboardScore,
  type LeaderboardEntry,
} from "../../services/leaderboardService";

const GAME_ID = "lab";

type Status = "ask" | "saving" | "saved" | "error" | "declined";

/**
 * Opt-in cross-user leaderboard for a finished Lab run. Unlike the arcade
 * `EndLeaderboard`, this is a page-side component, so it talks to Firestore
 * directly and resolves the player's identity from auth. The score is only
 * posted when the player explicitly confirms.
 */
export function LabEndLeaderboard({ score }: { score: number }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("ask");
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);

  if (!user) return null;

  const playerName =
    user.displayName || user.email?.split("@")[0] || "Anonymous";
  const playerId = user.uid;

  async function addMe() {
    setStatus("saving");
    try {
      await recordLeaderboardScore(playerId, playerName, GAME_ID, score);
      const top = await getLeaderboard(GAME_ID, 8);
      setRows(top);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  if (status === "declined") return null;

  if (status === "ask") {
    return (
      <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200">
        <p className="text-base font-semibold text-slate-800">
          Add your score to the leaderboard?
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Posting as{" "}
          <span className="font-semibold text-slate-700">{playerName}</span>
        </p>
        <div className="mt-4 flex justify-center gap-2.5">
          <button
            type="button"
            data-testid="lab-add-leaderboard"
            onClick={addMe}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
          >
            Add my score
          </button>
          <button
            type="button"
            data-testid="lab-decline-leaderboard"
            onClick={() => setStatus("declined")}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-base font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95"
          >
            No thanks
          </button>
        </div>
      </div>
    );
  }

  if (status === "saving") {
    return (
      <p
        className="rounded-2xl bg-white p-5 text-center text-sm text-slate-500 ring-1 ring-slate-200"
        role="status"
        aria-live="polite"
      >
        Saving your score…
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200">
        <p className="text-sm font-medium text-rose-700" role="status">
          Couldn’t reach the leaderboard. Check your connection.
        </p>
        <button
          type="button"
          onClick={addMe}
          className="mt-3 rounded-xl bg-brand-600 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-brand-700 active:scale-95"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
      data-testid="lab-end-leaderboard"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
        Leaderboard
      </p>
      <ol className="mt-3 space-y-1.5">
        {rows.map((r, i) => {
          const me = r.uid === playerId;
          return (
            <li
              key={r.uid}
              className={[
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm",
                me
                  ? "bg-brand-50 ring-1 ring-brand-300"
                  : "bg-slate-50",
              ].join(" ")}
            >
              <span className="w-5 shrink-0 text-xs font-bold text-slate-400">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-left font-medium text-slate-700">
                {r.name}
                {me && <span className="text-brand-600"> (you)</span>}
              </span>
              <span className="font-bold tabular-nums text-slate-900">
                {r.score}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
