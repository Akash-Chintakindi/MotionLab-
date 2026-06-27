import { sortPlayers, type LivePlayer } from "../../lib/liveGame";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Animated winners' podium for the top 3 (rendered 2nd · 1st · 3rd). */
export function Podium({
  players,
  meUid,
}: {
  players: LivePlayer[];
  meUid?: string;
}) {
  const top = sortPlayers(players).slice(0, 3);
  if (top.length === 0) return null;

  // Visual order places the winner in the middle on a taller block.
  const layout = [
    { player: top[1], place: 1, height: "h-24", delay: "150ms" },
    { player: top[0], place: 0, height: "h-32", delay: "0ms" },
    { player: top[2], place: 2, height: "h-20", delay: "300ms" },
  ].filter((c) => c.player);

  const blockTone = [
    "from-amber-300 to-amber-500", // 1st
    "from-slate-300 to-slate-400", // 2nd
    "from-orange-300 to-orange-500", // 3rd
  ];

  return (
    <div data-testid="live-podium" className="flex items-end justify-center gap-3">
      {layout.map(({ player, place, height, delay }) => {
        const isMe = player!.uid === meUid;
        return (
          <div key={player!.uid} className="flex w-24 flex-col items-center">
            <div
              className="mb-2 animate-score-pop text-3xl"
              style={{ animationDelay: delay }}
              aria-hidden
            >
              {MEDALS[place]}
            </div>
            <p className="mb-1 max-w-full truncate text-center text-sm font-semibold text-ink">
              {player!.name}
              {isMe && <span className="text-brand-600"> (you)</span>}
            </p>
            <p className="mb-2 font-display text-lg font-bold tabular-nums text-ink">
              {player!.score.toLocaleString()}
            </p>
            <div
              className={`w-full origin-bottom animate-podium-rise rounded-t-xl bg-gradient-to-b ${blockTone[place]} ${height} flex items-start justify-center pt-2 font-display text-2xl font-bold text-white/90`}
              style={{ animationDelay: delay }}
            >
              {place + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}
