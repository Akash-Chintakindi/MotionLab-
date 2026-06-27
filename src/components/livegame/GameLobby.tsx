import type { LiveGame, LivePlayer } from "../../lib/liveGame";

/** Pre-game lobby: shows the join PIN and players streaming in, live. */
export function GameLobby({
  game,
  players,
  role,
  meUid,
  onStart,
}: {
  game: LiveGame;
  players: LivePlayer[];
  role: "host" | "player";
  meUid?: string;
  onStart: () => void;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200/80">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent-600">
        Game PIN
      </p>
      <p
        data-testid="live-pin"
        className="mt-1 font-display text-5xl font-bold tabular-nums tracking-[0.3em] text-ink"
      >
        {game.pin}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {role === "host"
          ? "Share this PIN. Players join from their Squad tab."
          : "You're in! Waiting for the host to start…"}
      </p>

      <div className="mt-6">
        <p className="mb-2 text-sm font-semibold text-slate-600">
          {players.length} {players.length === 1 ? "player" : "players"} in the lobby
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {players.map((p) => (
            <span
              key={p.uid}
              className={[
                "animate-pop-in rounded-full px-3 py-1.5 text-sm font-semibold",
                p.uid === meUid
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-700",
              ].join(" ")}
            >
              {p.name}
            </span>
          ))}
          {players.length === 0 && (
            <span className="text-sm text-slate-400">Waiting for players…</span>
          )}
        </div>
      </div>

      {role === "host" && (
        <button
          type="button"
          onClick={onStart}
          disabled={players.length === 0}
          data-testid="live-start"
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
        >
          {players.length === 0 ? "Waiting for players…" : "Start game"}
        </button>
      )}
    </div>
  );
}
