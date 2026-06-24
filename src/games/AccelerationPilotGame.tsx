import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Slider } from "../components/Slider";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  integrateAccelerations,
  rmsError,
  errorToScore,
} from "./lib/accelerationPilotScoring";

const DT = 1;
const T_MAX = 6;
const N = T_MAX / DT;
// Velocity RMS error (m/s) at which the round scores 0.
const SCORE_SCALE = 4;

interface Round {
  id: string;
  title: string;
  instruction: string;
  /** Launch velocity v0 at t = 0 (m/s). */
  v0: number;
  /** Target velocity at each boundary t = 0..N (length N+1). */
  target: number[];
  /**
   * Time indices whose target velocities are shown as checkpoint rings. Only a
   * few are revealed — there's no full target line to trace, so the pilot has
   * to reason out the acceleration between rings. Scoring uses the whole curve.
   */
  checkpoints: number[];
}

const ROUNDS: Round[] = [
  {
    id: "r1",
    title: "Full throttle",
    v0: 0,
    instruction:
      "Engines cold at v = 0. Hold a steady throttle so your velocity climbs in a straight line through both rings. Acceleration is the slope of v(t).",
    target: [0, 2, 4, 6, 8, 10, 12],
    checkpoints: [3, 6],
  },
  {
    id: "r2",
    title: "Punch it, then coast",
    v0: 0,
    instruction:
      "Burn hard to reach cruising speed, then cut the engine to coast. Where the target velocity is flat, your acceleration must drop to zero.",
    target: [0, 3, 6, 6, 6, 6, 6],
    checkpoints: [2, 6],
  },
  {
    id: "r3",
    title: "Reverse thrust",
    v0: 9,
    instruction:
      "You're racing forward at 9 m/s. Fire reverse thrusters so you slow through a dead stop and back up. Same-sign v and a speed you up; opposite signs slow you down.",
    target: [9, 6, 3, 0, -3, -6, -9],
    checkpoints: [3, 6],
  },
];

const PASS = 80;
/** A checkpoint ring lights green when the velocity is within this many m/s. */
const HIT_TOL = 0.75;

export function AccelerationPilotGame({
  onScore,
  next,
}: {
  onScore?: (bestOverall: number) => void;
  next?: { href: string; label: string };
}) {
  const reduced = usePrefersReducedMotion();
  const [roundIdx, setRoundIdx] = useState(0);
  const [accels, setAccels] = useState<number[]>(() => Array(N).fill(0));
  const [bestByRound, setBestByRound] = useState<number[]>(() =>
    Array(ROUNDS.length).fill(0),
  );
  const [finished, setFinished] = useState(false);
  const [craftT, setCraftT] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const round = ROUNDS[roundIdx];
  const produced = useMemo(
    () => integrateAccelerations(accels, DT, round.v0),
    [accels, round.v0],
  );
  const score = useMemo(
    () => errorToScore(rmsError(produced, round.target), SCORE_SCALE),
    [produced, round.target],
  );

  useEffect(() => {
    setBestByRound((prev) => {
      if (score <= prev[roundIdx]) return prev;
      const updated = [...prev];
      updated[roundIdx] = score;
      return updated;
    });
  }, [score, roundIdx]);

  useEffect(() => () => cancelAnim(rafRef), []);

  function loadRound(i: number) {
    cancelAnim(rafRef);
    setCraftT(null);
    setRoundIdx(i);
    setAccels(Array(N).fill(0));
  }

  function setAccel(i: number, a: number) {
    setAccels((prev) => {
      const updated = [...prev];
      updated[i] = a;
      return updated;
    });
  }

  function reset() {
    cancelAnim(rafRef);
    setCraftT(null);
    setAccels(Array(N).fill(0));
  }

  function launch() {
    cancelAnim(rafRef);
    if (reduced) {
      setCraftT(T_MAX);
      return;
    }
    const start = performance.now();
    const duration = 2200;
    const tick = (now: number) => {
      const frac = Math.min(1, (now - start) / duration);
      setCraftT(frac * T_MAX);
      if (frac < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  const overallBest = Math.round(
    bestByRound.reduce((a, b) => a + b, 0) / ROUNDS.length,
  );

  function finish() {
    cancelAnim(rafRef);
    setFinished(true);
    onScore?.(overallBest);
  }

  if (finished) {
    return (
      <ResultScreen
        bestByRound={bestByRound}
        overall={overallBest}
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
  const hits = round.checkpoints.filter(
    (i) => Math.abs(produced[i] - round.target[i]) <= HIT_TOL,
  ).length;

  return (
    <div data-testid="practice-game">
      <div className="mb-4 rounded-2xl bg-slate-900 p-4 text-slate-100 ring-1 ring-slate-700 sm:p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wide text-cyan-300">
            Flight {roundIdx + 1} of {ROUNDS.length} · {round.title}
          </span>
          <span data-testid="pilot-score">Score {score}%</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-slate-300">
          {round.instruction}
        </p>

        <VelocityPlot
          target={round.target}
          produced={produced}
          checkpoints={round.checkpoints}
          craftT={craftT}
        />

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={launch}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
          >
            ▶ Launch
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-400"
          >
            Reset
          </button>
          <span className="ml-auto text-xs text-slate-400">
            Rings lit {hits}/{round.checkpoints.length}
          </span>
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <h3 className="mb-1 text-sm font-semibold text-slate-600">
          Throttle: acceleration for each second (m/s²)
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Launch velocity v₀ = {round.v0} m/s. Each second adds a × 1 s to your
          velocity.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {accels.map((a, i) => (
            <Slider
              key={i}
              label={`t = ${i}–${i + 1} s`}
              value={a}
              min={-4}
              max={4}
              step={0.5}
              unit="m/s²"
              onChange={(na) => setAccel(i, na)}
            />
          ))}
        </div>
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
          {score >= PASS ? "Smooth flying! 🛰️" : "Fly through the rings"}
        </span>

        {isLast ? (
          <button
            type="button"
            data-testid="pilot-finish"
            onClick={finish}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Finish
          </button>
        ) : (
          <button
            type="button"
            data-testid="pilot-next"
            onClick={() => loadRound(roundIdx + 1)}
            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

function cancelAnim(ref: React.MutableRefObject<number | null>) {
  if (ref.current !== null) {
    cancelAnimationFrame(ref.current);
    ref.current = null;
  }
}

const W = 320;
const H = 200;
const PAD = 28;

function VelocityPlot({
  target,
  produced,
  checkpoints,
  craftT,
}: {
  target: number[];
  produced: number[];
  checkpoints: number[];
  craftT: number | null;
}) {
  const all = [...target, ...produced];
  const yMin = Math.min(0, ...all);
  const yMax = Math.max(...all, 1);
  const span = yMax - yMin || 1;

  const sx = (t: number) => PAD + (t / T_MAX) * (W - 2 * PAD);
  const sy = (v: number) => H - PAD - ((v - yMin) / span) * (H - 2 * PAD);

  const toPath = (pts: number[]) =>
    pts.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(v)}`).join(" ");

  // Craft glides along the produced velocity curve while "flying".
  let craft: { x: number; y: number } | null = null;
  if (craftT !== null) {
    const i = Math.min(N - 1, Math.floor(craftT));
    const frac = craftT - i;
    const vPos = produced[i] + (produced[i + 1] - produced[i]) * frac;
    craft = { x: sx(craftT), y: sy(vPos) };
  }

  const zeroY = sy(0);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Velocity versus time: fly your velocity curve through the target rings"
    >
      {/* Axes. */}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#475569" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#475569" />
      {/* v = 0 reference line (where speeding up flips to slowing down). */}
      {yMin < 0 && (
        <line
          x1={PAD}
          y1={zeroY}
          x2={W - PAD}
          y2={zeroY}
          stroke="#334155"
          strokeDasharray="3 3"
        />
      )}
      <text x={W - PAD} y={H - PAD + 16} textAnchor="end" className="fill-slate-500 text-[9px]">
        time (s)
      </text>
      <text x={PAD - 6} y={PAD - 8} textAnchor="start" className="fill-slate-500 text-[9px]">
        velocity (m/s)
      </text>

      {/* Launch marker. */}
      <circle cx={sx(0)} cy={sy(produced[0])} r={3} fill="#94a3b8" />

      {/* Target checkpoint rings — light green when the curve passes through. */}
      {checkpoints.map((i) => {
        const hit = Math.abs(produced[i] - target[i]) <= HIT_TOL;
        const color = hit ? "#34d399" : "#64748b";
        return (
          <g key={`cp${i}`}>
            {hit && (
              <circle
                cx={sx(i)}
                cy={sy(target[i])}
                r={12}
                fill="#34d399"
                opacity={0.18}
              />
            )}
            <circle
              cx={sx(i)}
              cy={sy(target[i])}
              r={8}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
            />
            <circle cx={sx(i)} cy={sy(target[i])} r={2} fill={color} />
          </g>
        );
      })}

      {/* The pilot's produced velocity curve. */}
      <path d={toPath(produced)} fill="none" stroke="#22d3ee" strokeWidth={2.5} />
      {produced.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)} r={2.5} fill="#22d3ee" />
      ))}

      {craft && (
        <g>
          <circle cx={craft.x} cy={craft.y} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
        </g>
      )}
    </svg>
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
      data-testid="pilot-result"
      className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200 sm:p-6"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-600">
        Flight complete
      </p>
      <div className={`mt-2 font-display text-5xl font-bold ${tone}`}>
        {overall}%
      </div>
      <p className="mt-1 text-slate-500">
        Average match across {bestByRound.length} flights
      </p>

      <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left">
        {bestByRound.map((s, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
          >
            <span className="text-slate-600">Flight {i + 1}</span>
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
