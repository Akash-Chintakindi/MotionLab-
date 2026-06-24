import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Slider } from "../components/Slider";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  integrateVelocities,
  rmsError,
  errorToScore,
} from "./lib/driveScoring";

const DT = 1;
const T_MAX = 6;
const N = T_MAX / DT;
const SCORE_SCALE = 4;

interface Round {
  id: string;
  title: string;
  instruction: string;
  /** Target position at each boundary t = 0..N (length N+1). */
  target: number[];
  /**
   * Time indices whose target positions are shown as "checkpoint" rings.
   * Only a few are revealed — there's no full target line to trace, so the
   * learner has to reason about the velocities between the rings. Scoring
   * still uses the whole curve.
   */
  checkpoints: number[];
}

const ROUNDS: Round[] = [
  {
    id: "r1",
    title: "Cruise control",
    instruction:
      "Constant speed. There's no line to trace — drive so your path passes straight through the target rings.",
    target: [0, 2, 4, 6, 8, 10, 12],
    checkpoints: [3, 6],
  },
  {
    id: "r2",
    title: "Stop and hold",
    instruction:
      "Drive, then park. Reach the first ring, then hold that position to the end — where the target is flat, your velocity must be zero.",
    target: [0, 2, 4, 6, 6, 6, 6],
    checkpoints: [3, 6],
  },
  {
    id: "r3",
    title: "Over the hill",
    instruction:
      "Climb to the peak ring, then come back down to the last ring. Your velocity should start high, drop to zero at the top, then go negative.",
    target: [0, 5, 8, 9, 8, 5, 0],
    checkpoints: [3, 6],
  },
];

const PASS = 80;
/** A checkpoint counts as "hit" when the path is within this many metres. */
const HIT_TOL = 0.75;

export function DriveTheCartGame({
  onScore,
  next,
}: {
  onScore?: (bestOverall: number) => void;
  next?: { href: string; label: string };
}) {
  const reduced = usePrefersReducedMotion();
  const [roundIdx, setRoundIdx] = useState(0);
  const [velocities, setVelocities] = useState<number[]>(() => Array(N).fill(0));
  const [bestByRound, setBestByRound] = useState<number[]>(() =>
    Array(ROUNDS.length).fill(0),
  );
  const [finished, setFinished] = useState(false);
  const [cartT, setCartT] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const round = ROUNDS[roundIdx];
  const produced = useMemo(
    () => integrateVelocities(velocities, DT, round.target[0]),
    [velocities, round.target],
  );
  const score = useMemo(
    () => errorToScore(rmsError(produced, round.target), SCORE_SCALE),
    [produced, round.target],
  );

  // Track the best score for the current round.
  useEffect(() => {
    setBestByRound((prev) => {
      if (score <= prev[roundIdx]) return prev;
      const next = [...prev];
      next[roundIdx] = score;
      return next;
    });
  }, [score, roundIdx]);

  // Clean up any running animation frame on unmount.
  useEffect(() => () => cancelAnim(rafRef), []);

  function loadRound(i: number) {
    cancelAnim(rafRef);
    setCartT(null);
    setRoundIdx(i);
    setVelocities(Array(N).fill(0));
  }

  function setVelocity(i: number, v: number) {
    setVelocities((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  function reset() {
    cancelAnim(rafRef);
    setCartT(null);
    setVelocities(Array(N).fill(0));
  }

  function play() {
    cancelAnim(rafRef);
    if (reduced) {
      setCartT(T_MAX);
      return;
    }
    const start = performance.now();
    const duration = 2200;
    const tick = (now: number) => {
      const frac = Math.min(1, (now - start) / duration);
      setCartT(frac * T_MAX);
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

  return (
    <div data-testid="drive-cart-game">
      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wide">
            Round {roundIdx + 1} of {ROUNDS.length} · {round.title}
          </span>
          <span data-testid="cart-score">Score {score}%</span>
        </div>
        <p className="mb-4 text-base font-medium leading-relaxed text-slate-800">
          {round.instruction}
        </p>

        <CartPlot
          target={round.target}
          produced={produced}
          checkpoints={round.checkpoints}
          cartT={cartT}
        />

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={play}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            ▶ Play
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-600">
          Velocity for each second (m/s)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {velocities.map((v, i) => (
            <Slider
              key={i}
              label={`t = ${i}–${i + 1} s`}
              value={v}
              min={-6}
              max={6}
              step={0.5}
              unit="m/s"
              onChange={(nv) => setVelocity(i, nv)}
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
          {score >= PASS ? "Great driving! 🎯" : "Drive through the rings"}
        </span>

        {isLast ? (
          <button
            type="button"
            data-testid="cart-finish"
            onClick={finish}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Finish
          </button>
        ) : (
          <button
            type="button"
            data-testid="cart-next"
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

function cancelAnim(ref: React.MutableRefObject<number | null>) {
  if (ref.current !== null) {
    cancelAnimationFrame(ref.current);
    ref.current = null;
  }
}

const W = 320;
const H = 200;
const PAD = 28;

function CartPlot({
  target,
  produced,
  checkpoints,
  cartT,
}: {
  target: number[];
  produced: number[];
  checkpoints: number[];
  cartT: number | null;
}) {
  const all = [...target, ...produced];
  const yMin = Math.min(0, ...all);
  const yMax = Math.max(...all, 1);
  const span = yMax - yMin || 1;

  const sx = (t: number) => PAD + (t / T_MAX) * (W - 2 * PAD);
  const sy = (x: number) => H - PAD - ((x - yMin) / span) * (H - 2 * PAD);

  const toPath = (pts: number[]) =>
    pts.map((x, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(x)}`).join(" ");

  // Cart position interpolated along the produced piecewise-linear path.
  let cart: { x: number; y: number } | null = null;
  if (cartT !== null) {
    const i = Math.min(N - 1, Math.floor(cartT));
    const frac = cartT - i;
    const xPos = produced[i] + (produced[i + 1] - produced[i]) * frac;
    cart = { x: sx(cartT), y: sy(xPos) };
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Position versus time: drive your path through the target rings"
    >
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#cbd5e1" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#cbd5e1" />
      <text x={W - PAD} y={H - PAD + 16} textAnchor="end" className="fill-slate-400 text-[9px]">
        time (s)
      </text>
      <text x={PAD - 6} y={PAD - 8} textAnchor="start" className="fill-slate-400 text-[9px]">
        position (m)
      </text>

      {/* Start marker (where the cart begins). */}
      <circle cx={sx(0)} cy={sy(target[0])} r={3} fill="#94a3b8" />

      {/* Target checkpoint rings — only a few are shown, with no line between
          them, so the path between rings has to be reasoned out. */}
      {checkpoints.map((i) => {
        const hit = Math.abs(produced[i] - target[i]) <= HIT_TOL;
        const color = hit ? "#10b981" : "#64748b";
        return (
          <g key={`cp${i}`}>
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

      {/* The learner's produced path. */}
      <path d={toPath(produced)} fill="none" stroke="#0a5fe6" strokeWidth={2.5} />
      {produced.map((x, i) => (
        <circle key={i} cx={sx(i)} cy={sy(x)} r={2.5} fill="#0a5fe6" />
      ))}

      {cart && <circle cx={cart.x} cy={cart.y} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={2} />}
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
    <div data-testid="cart-result" className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200 sm:p-6">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-brand-600">
        Practice complete
      </p>
      <div className={`mt-2 font-display text-5xl font-bold ${tone}`}>
        {overall}%
      </div>
      <p className="mt-1 text-slate-500">Average match across {bestByRound.length} rounds</p>

      <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left">
        {bestByRound.map((s, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
          >
            <span className="text-slate-600">Round {i + 1}</span>
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
