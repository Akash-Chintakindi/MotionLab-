import { useState } from "react";
import type { ArcadeLeaderboard, LeaderboardRow } from "../types";

type Status = "ask" | "saving" | "saved" | "error" | "declined";

/**
 * Turns a thrown Firestore error into a player-facing reason without importing
 * Firebase here (keeps the game bundle Firebase-free). A "permission-denied"
 * almost always means the public `leaderboards/**` rules haven't been deployed,
 * which is very different from being offline.
 */
function leaderboardErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const msg = ((err as { message?: string })?.message ?? "").toLowerCase();
  if (code === "permission-denied" || msg.includes("insufficient permissions")) {
    return "The leaderboard isn’t available yet. Please try again later.";
  }
  if (code === "unavailable" || msg.includes("offline")) {
    return "Couldn’t reach the leaderboard. Check your connection.";
  }
  return "Couldn’t save your score right now. Please try again.";
}

/**
 * Game-over leaderboard opt-in. Offers to post the run to the public board
 * under the player's name; once added it shows the top entries (so the player
 * sees where they land among everyone else). Pure UI — all Firestore access is
 * injected via `leaderboard` callbacks so the game never touches Firebase.
 */
export function EndLeaderboard({
  leaderboard,
  score,
}: {
  leaderboard: ArcadeLeaderboard;
  score: number;
}) {
  const [status, setStatus] = useState<Status>("ask");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function addMe() {
    setStatus("saving");
    try {
      await leaderboard.publish(score);
      const top = await leaderboard.fetchTop(8);
      setRows(top);
      setStatus("saved");
    } catch (err) {
      console.error("[leaderboard] failed to publish/fetch score", err);
      setErrorMsg(leaderboardErrorMessage(err));
      setStatus("error");
    }
  }

  if (status === "declined") return null;

  if (status === "ask") {
    return (
      <div className="mt-4 w-full max-w-xs">
        <p className="text-sm font-semibold text-slate-100">
          Add your score to the leaderboard?
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          Posting as{" "}
          <span className="font-semibold text-white">
            {leaderboard.playerName}
          </span>
        </p>
        <div className="mt-2 flex justify-center gap-2">
          <button
            type="button"
            data-testid="bball-add-leaderboard"
            onClick={addMe}
            className="rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-2 font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-300 hover:to-emerald-500 active:scale-95"
          >
            Add my score
          </button>
          <button
            type="button"
            onClick={() => setStatus("declined")}
            className="rounded-xl bg-white/15 px-4 py-2 font-semibold text-slate-100 transition hover:bg-white/25 active:scale-95"
          >
            No thanks
          </button>
        </div>
      </div>
    );
  }

  if (status === "saving") {
    return <p className="mt-4 text-sm text-slate-300">Saving your score…</p>;
  }

  if (status === "error") {
    return (
      <div className="mt-4 w-full max-w-xs">
        <p className="text-sm text-rose-300">
          {errorMsg || "Couldn’t reach the leaderboard. Check your connection."}
        </p>
        <button
          type="button"
          onClick={addMe}
          className="mt-2 rounded-xl bg-white/15 px-4 py-2 font-semibold text-slate-100 transition hover:bg-white/25 active:scale-95"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 w-full max-w-xs" data-testid="bball-end-leaderboard">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
        Leaderboard
      </p>
      <ol className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {rows.map((r, i) => {
          const me = r.uid === leaderboard.playerId;
          return (
            <li
              key={r.uid}
              className={[
                "flex items-center gap-2 rounded-lg px-2 py-1 text-sm",
                me
                  ? "bg-orange-500/30 ring-1 ring-orange-400"
                  : "bg-white/5",
              ].join(" ")}
            >
              <span className="w-5 shrink-0 text-xs font-bold text-slate-400">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-left text-slate-100">
                {r.name}
                {me && <span className="text-orange-200"> (you)</span>}
              </span>
              <span className="font-bold tabular-nums text-white">
                {r.score}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
