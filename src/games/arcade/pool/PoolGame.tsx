import { useState } from "react";
import type { ArcadeGameProps } from "../types";
import { OneShotGame } from "./OneShotGame";
import { FullPoolGame } from "./FullPoolGame";
import type { Difficulty } from "./poolGameLogic";

type Mode = "menu" | "oneshot" | "full";

const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: "easy", label: "Easy", blurb: "Loose aim, picks weak shots" },
  { id: "medium", label: "Medium", blurb: "Steady aim, decent shots" },
  { id: "hard", label: "Hard", blurb: "Near-precise, picks the best shot" },
];

/**
 * Pool shell: a mode-select screen routing to either the original calculation
 * one-shot challenge or the full 8-ball game vs the computer. Both sub-games
 * share the same page contract (highScore + onGameOver).
 */
export function PoolGame(props: ArcadeGameProps) {
  const { highScore, onGameOver, leaderboard, onTopicResult } = props;
  const [mode, setMode] = useState<Mode>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  const backToMenu = () => {
    setDifficulty(null);
    setMode("menu");
  };

  return (
    <div data-testid="pool-game" className="mx-auto w-full max-w-3xl select-none">
      {mode === "oneshot" && (
        <OneShotGame
          highScore={highScore}
          onGameOver={onGameOver}
          leaderboard={leaderboard}
          onBack={backToMenu}
        />
      )}

      {mode === "full" && difficulty && (
        <FullPoolGame
          highScore={highScore}
          onGameOver={onGameOver}
          leaderboard={leaderboard}
          onTopicResult={onTopicResult}
          difficulty={difficulty}
          onBack={backToMenu}
        />
      )}

      {mode === "full" && !difficulty && (
        <DifficultySelect onPick={setDifficulty} onBack={backToMenu} />
      )}

      {mode === "menu" && (
        <ModeSelect
          highScore={highScore}
          onOneShot={() => setMode("oneshot")}
          onFull={() => setMode("full")}
        />
      )}
    </div>
  );
}

function ModeSelect({
  highScore,
  onOneShot,
  onFull,
}: {
  highScore: number;
  onOneShot: () => void;
  onFull: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f6b39] via-[#0c5530] to-[#08311d] p-6 text-center shadow-xl shadow-black/30 ring-1 ring-black/40 sm:p-10">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
        Kinematics Arcade
      </p>
      <h2 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">
        Pool Lab
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-emerald-100/80">
        Pick how you want to play.
      </p>

      <div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
        <ModeCard
          testid="pool-mode-oneshot"
          title="One-Shot Challenge"
          desc="Calculate the angle and speed, then sink it. Pure geometry — five trick shots."
          accent="from-emerald-400 to-emerald-600 text-emerald-950"
          onClick={onOneShot}
        />
        <ModeCard
          testid="pool-mode-full"
          title="Full Game (vs Computer)"
          desc="Mouse-aim with a power bar and play a full 8-ball match against the AI."
          accent="from-amber-400 to-amber-600 text-amber-950"
          onClick={onFull}
        />
      </div>

      <p className="mt-5 text-sm font-semibold text-amber-200">High score: {highScore}</p>
    </div>
  );
}

function ModeCard({
  testid,
  title,
  desc,
  accent,
  onClick,
}: {
  testid: string;
  title: string;
  desc: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      className="group flex flex-col items-start gap-2 rounded-2xl bg-black/25 p-4 text-left ring-1 ring-white/10 transition hover:bg-black/35 hover:ring-white/25 active:scale-[0.98]"
    >
      <span
        className={`rounded-lg bg-gradient-to-b ${accent} px-3 py-1.5 font-display text-sm font-bold shadow-lg`}
      >
        {title}
      </span>
      <span className="text-sm text-slate-200">{desc}</span>
    </button>
  );
}

function DifficultySelect({
  onPick,
  onBack,
}: {
  onPick: (d: Difficulty) => void;
  onBack: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f6b39] via-[#0c5530] to-[#08311d] p-6 text-center shadow-xl shadow-black/30 ring-1 ring-black/40 sm:p-10">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
        Full Game
      </p>
      <h2 className="mt-1 font-display text-3xl font-bold text-white">Choose difficulty</h2>

      <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            type="button"
            data-testid={`pool-diff-${d.id}`}
            onClick={() => onPick(d.id)}
            className="flex flex-col items-center gap-1 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 transition hover:bg-black/35 hover:ring-white/25 active:scale-[0.98]"
          >
            <span className="font-display text-lg font-bold text-white">{d.label}</span>
            <span className="text-xs text-slate-300">{d.blurb}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        data-testid="pool-back-modes"
        onClick={onBack}
        className="mt-6 rounded-xl bg-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
      >
        ◂ Back
      </button>
    </div>
  );
}
