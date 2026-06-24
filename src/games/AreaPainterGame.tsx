import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PlotGraph } from "../components/graph/PlotGraph";
import { roundTo } from "../lib/curves";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  netDisplacement,
  distanceTravelled,
  closenessScore,
  overallBest,
} from "./lib/areaPainterScoring";

interface Round {
  id: string;
  title: string;
  instruction: string;
  /** Velocity function v(t) for this round (built locally, no shared presets). */
  v: (t: number) => number;
  tMin: number;
  tMax: number;
  yMin: number;
  yMax: number;
  /** Target net displacement (signed area) the learner must paint to. */
  target: number;
  /** Score reaches 0 when the chosen net area is off-target by this much. */
  scale: number;
  initialFrom: number;
  initialTo: number;
}

const ROUNDS: Round[] = [
  {
    id: "r1",
    title: "Fill the area",
    instruction:
      "Velocity stays positive, so all of the area counts forward. Drag the two handles to paint a region whose area equals the target displacement.",
    v: (t) => 2 + t,
    tMin: 0,
    tMax: 6,
    yMin: 0,
    yMax: 9,
    target: 12,
    scale: 8,
    initialFrom: 0,
    initialTo: 2,
  },
  {
    id: "r2",
    title: "Cross the zero line",
    instruction:
      "Now velocity dips below the axis. Red area is negative displacement. Paint to a NEGATIVE target — you'll have to include enough area below the line.",
    v: (t) => 6 - 2 * t,
    tMin: 0,
    tMax: 6,
    yMin: -6,
    yMax: 6,
    target: -4,
    scale: 6,
    initialFrom: 0,
    initialTo: 2,
  },
  {
    id: "r3",
    title: "Balance the books",
    instruction:
      "Net displacement is zero only when the green (forward) and red (backward) areas cancel exactly. Paint an interval whose signed area is 0.",
    v: (t) => 8 - 2 * t,
    tMin: 0,
    tMax: 6,
    yMin: -4,
    yMax: 8,
    target: 0,
    scale: 6,
    initialFrom: 0,
    initialTo: 3,
  },
];

const PASS = 80;

export function AreaPainterGame({
  onScore,
  next,
}: {
  onScore?: (bestScore: number) => void;
  next?: { href: string; label: string };
}) {
  const reduced = usePrefersReducedMotion();
  const [roundIdx, setRoundIdx] = useState(0);
  const round = ROUNDS[roundIdx];
  const [from, setFrom] = useState(round.initialFrom);
  const [to, setTo] = useState(round.initialTo);
  const [bestByRound, setBestByRound] = useState<number[]>(() =>
    Array(ROUNDS.length).fill(0),
  );
  const [finished, setFinished] = useState(false);

  const net = useMemo(
    () => netDisplacement(round.v, from, to),
    [round.v, from, to],
  );
  const dist = useMemo(
    () => distanceTravelled(round.v, from, to),
    [round.v, from, to],
  );
  const score = useMemo(
    () => closenessScore(net, round.target, round.scale),
    [net, round.target, round.scale],
  );

  useEffect(() => {
    setBestByRound((prev) => {
      if (score <= prev[roundIdx]) return prev;
      const nextBest = [...prev];
      nextBest[roundIdx] = score;
      return nextBest;
    });
  }, [score, roundIdx]);

  function loadRound(i: number) {
    setRoundIdx(i);
    setFrom(ROUNDS[i].initialFrom);
    setTo(ROUNDS[i].initialTo);
  }

  const best = overallBest(bestByRound);

  function finish() {
    setFinished(true);
    onScore?.(best);
  }

  if (finished) {
    return (
      <ResultScreen
        bestByRound={bestByRound}
        overall={best}
        next={next}
        onReplay={() => {
          setFinished(false);
          setBestByRound(Array(ROUNDS.length).fill(0));
          loadRound(0);
        }}
      />
    );
  }

  const isLast = roundIdx === ROUNDS.length - 1;
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const onTarget = score >= PASS;

  return (
    <div data-testid="practice-game">
      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wide">
            Round {roundIdx + 1} of {ROUNDS.length} · {round.title}
          </span>
          <span data-testid="painter-score">Score {score}%</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-slate-600">
          {round.instruction}
        </p>

        <PlotGraph
          f={round.v}
          tMin={round.tMin}
          tMax={round.tMax}
          yMin={round.yMin}
          yMax={round.yMax}
          yLabel="velocity (m/s)"
          color="#0a5fe6"
          area={{ from, to }}
          onAreaChange={(a, b) => {
            setFrom(a);
            setTo(b);
          }}
          ariaLabel="velocity versus time: drag the handles to paint the area under the curve"
        />

        <div className="mt-2 text-center text-xs text-slate-400">
          Painting t = {roundTo(lo, 1)} s → {roundTo(hi, 1)} s
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat
          tone="brand"
          label="Net displacement (∫v dt)"
          value={`${roundTo(net, 1)} m`}
          testid="painter-net"
        />
        <Stat
          tone="slate"
          label="Total distance (∫|v| dt)"
          value={`${roundTo(dist, 1)} m`}
          testid="painter-distance"
        />
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-600">
            Target meter
          </span>
          <span className="font-mono text-sm text-slate-500">
            target {round.target} m · you {roundTo(net, 1)} m
          </span>
        </div>
        <TargetMeter score={score} />
        <p className="mt-2 text-xs text-slate-500">
          {onTarget
            ? "On target — the signed area matches the goal. 🎯"
            : net > round.target
              ? "Too much area — shrink the region or include more area below the axis."
              : "Not enough net area — widen the region or include more area above the axis."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={roundIdx === 0}
          onClick={() => loadRound(roundIdx - 1)}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:opacity-40"
        >
          ← Previous
        </button>

        <span className="text-xs text-slate-500">
          {reduced ? "" : "Drag the handles"}
        </span>

        {isLast ? (
          <button
            type="button"
            data-testid="painter-finish"
            onClick={finish}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Finish
          </button>
        ) : (
          <button
            type="button"
            data-testid="painter-next"
            onClick={() => loadRound(roundIdx + 1)}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  testid,
}: {
  label: string;
  value: string;
  tone: "brand" | "slate";
  testid: string;
}) {
  const cls =
    tone === "brand"
      ? "bg-brand-50 text-brand-700"
      : "bg-slate-100 text-slate-600";
  return (
    <div className={`rounded-xl px-3 py-2 ${cls}`}>
      <div className="text-xs">{label}</div>
      <div className="text-lg font-bold text-ink" data-testid={testid}>
        {value}
      </div>
    </div>
  );
}

function TargetMeter({ score }: { score: number }) {
  const color =
    score >= PASS
      ? "bg-emerald-500"
      : score >= 50
        ? "bg-amber-500"
        : "bg-rose-500";
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function ResultScreen({
  bestByRound,
  overall,
  next,
  onReplay,
}: {
  bestByRound: number[];
  overall: number;
  next?: { href: string; label: string };
  onReplay: () => void;
}) {
  const tone =
    overall >= 80
      ? "text-emerald-500"
      : overall >= 50
        ? "text-amber-500"
        : "text-rose-500";
  return (
    <div
      data-testid="painter-result"
      className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200 sm:p-6"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-brand-600">
        Practice complete
      </p>
      <div className={`mt-2 font-display text-5xl font-bold ${tone}`}>
        {overall}%
      </div>
      <p className="mt-1 text-slate-500">
        Average accuracy across {bestByRound.length} rounds of painting area
        under v(t)
      </p>

      <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left">
        {bestByRound.map((s, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
          >
            <span className="text-slate-600">
              Round {i + 1} · {ROUNDS[i].title}
            </span>
            <span className="font-mono font-semibold text-ink">{s}%</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-col items-center gap-3">
        {next && (
          <Link
            to={next.href}
            data-testid="next-step"
            className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white transition hover:bg-brand-700"
          >
            {next.label}
          </Link>
        )}
        <button
          type="button"
          onClick={onReplay}
          className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:border-slate-400"
        >
          Play again
        </button>
        <Link
          to="/"
          className="text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          Back to course
        </Link>
      </div>
    </div>
  );
}
