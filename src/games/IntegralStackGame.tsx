import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Slider } from "../components/Slider";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { roundTo } from "../lib/curves";
import {
  type AccelSegment,
  velocityAtTime,
  positionAtTime,
  finalVelocity,
  finalPosition,
  targetScore,
  blendScore,
  isHit,
} from "./lib/integralStackScoring";

type Control = "v0" | "a" | "a1" | "a2";

interface RoundConfig {
  id: string;
  title: string;
  instruction: string;
  /** Total time the stack runs for. */
  T: number;
  /** Which sliders the learner can move this round. */
  controls: Control[];
  x0: number;
  /** v₀ used when "v0" is not a control. */
  v0Fixed: number;
  /** Sensible starting values for the sliders. */
  defaults: { v0: number; a: number; a1: number; a2: number };
  targetV: number | null;
  targetX: number | null;
  vScale: number;
  xScale: number;
  vTol: number;
  xTol: number;
}

const ROUNDS: RoundConfig[] = [
  {
    id: "r1",
    title: "Tune the velocity",
    instruction:
      "Constant acceleration, starting from rest. Slide a so the v(t) line climbs to the green velocity target at the top. Remember v = v₀ + a·t.",
    T: 5,
    controls: ["a"],
    x0: 0,
    v0Fixed: 0,
    defaults: { v0: 0, a: 0, a1: 0, a2: 0 },
    targetV: 10,
    targetX: null,
    vScale: 8,
    xScale: 30,
    vTol: 0.6,
    xTol: 1,
  },
  {
    id: "r2",
    title: "Stack up to a position",
    instruction:
      "Now both v₀ and a are yours. Build velocity so the position x(t) lands on the green target. Many combos work — x = x₀ + v₀·t + ½·a·t².",
    T: 5,
    controls: ["v0", "a"],
    x0: 0,
    v0Fixed: 0,
    defaults: { v0: 0, a: 0, a1: 0, a2: 0 },
    targetV: null,
    targetX: 35,
    vScale: 8,
    xScale: 12,
    vTol: 0.6,
    xTol: 1,
  },
  {
    id: "r3",
    title: "Two-stage burn",
    instruction:
      "Acceleration now has two stages. Shape a(t) (and v₀) so the stack hits BOTH the final-velocity and final-position targets at the same time.",
    T: 6,
    controls: ["v0", "a1", "a2"],
    x0: 0,
    v0Fixed: 0,
    defaults: { v0: 0, a: 0, a1: 0, a2: 0 },
    targetV: 6,
    targetX: 36,
    vScale: 8,
    xScale: 15,
    vTol: 0.6,
    xTol: 1.2,
  },
];

const PASS = 80;

interface ControlState {
  v0: number;
  a: number;
  a1: number;
  a2: number;
}

function segmentsFor(round: RoundConfig, c: ControlState): AccelSegment[] {
  if (round.controls.includes("a1")) {
    const half = round.T / 2;
    return [
      { a: c.a1, duration: half },
      { a: c.a2, duration: half },
    ];
  }
  return [{ a: c.a, duration: round.T }];
}

function v0For(round: RoundConfig, c: ControlState): number {
  return round.controls.includes("v0") ? c.v0 : round.v0Fixed;
}

export function IntegralStackGame({
  onScore,
  next,
}: {
  onScore?: (bestScore: number) => void;
  next?: { href: string; label: string };
}) {
  const reduced = usePrefersReducedMotion();
  const [roundIdx, setRoundIdx] = useState(0);
  const round = ROUNDS[roundIdx];

  const [controls, setControls] = useState<ControlState>(() => ({
    ...ROUNDS[0].defaults,
  }));
  const [bestByRound, setBestByRound] = useState<number[]>(() =>
    Array(ROUNDS.length).fill(0),
  );
  const [finished, setFinished] = useState(false);
  const [playT, setPlayT] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const v0 = v0For(round, controls);
  const segments = useMemo(
    () => segmentsFor(round, controls),
    [round, controls],
  );

  const finalV = finalVelocity(v0, segments);
  const finalX = finalPosition(round.x0, v0, segments);

  const vScore =
    round.targetV !== null
      ? targetScore(finalV, round.targetV, round.vScale)
      : null;
  const xScore =
    round.targetX !== null
      ? targetScore(finalX, round.targetX, round.xScale)
      : null;
  const score = blendScore(
    [vScore, xScore].filter((s): s is number => s !== null),
  );

  const vHit = round.targetV !== null && isHit(finalV, round.targetV, round.vTol);
  const xHit = round.targetX !== null && isHit(finalX, round.targetX, round.xTol);

  useEffect(() => {
    setBestByRound((prev) => {
      if (score <= prev[roundIdx]) return prev;
      const nextBest = [...prev];
      nextBest[roundIdx] = score;
      return nextBest;
    });
  }, [score, roundIdx]);

  useEffect(() => () => cancelAnim(rafRef), []);

  function loadRound(i: number) {
    cancelAnim(rafRef);
    setPlayT(null);
    setRoundIdx(i);
    setControls({ ...ROUNDS[i].defaults });
  }

  function setControl(key: Control, value: number) {
    setControls((prev) => ({ ...prev, [key]: value }));
  }

  function play() {
    cancelAnim(rafRef);
    if (reduced) {
      setPlayT(round.T);
      return;
    }
    const start = performance.now();
    const duration = 1800;
    const tick = (now: number) => {
      const frac = Math.min(1, (now - start) / duration);
      setPlayT(frac * round.T);
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
  const T = round.T;

  const aFn = (t: number) => accelAtTime(segments, t);
  const vFn = (t: number) => velocityAtTime(v0, segments, t);
  const xFn = (t: number) => positionAtTime(round.x0, v0, segments, t);

  return (
    <div data-testid="practice-game">
      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wide">
            Round {roundIdx + 1} of {ROUNDS.length} · {round.title}
          </span>
          <span data-testid="stack-score">Score {score}%</span>
        </div>
        <p className="mb-4 text-base font-medium leading-relaxed text-slate-800">
          {round.instruction}
        </p>

        <div className="space-y-2">
          <StackPlot
            label="a(t) — acceleration (m/s²)"
            f={aFn}
            T={T}
            color="#ef4444"
            playT={playT}
            extras={[0]}
          />
          <StackPlot
            label="v(t) — velocity (m/s) · ∫a dt"
            f={vFn}
            T={T}
            color="#1f7aff"
            playT={playT}
            target={round.targetV}
            targetHit={vHit}
            extras={[0, round.targetV ?? 0]}
          />
          <StackPlot
            label="x(t) — position (m) · ∫v dt"
            f={xFn}
            T={T}
            color="#10b981"
            playT={playT}
            target={round.targetX}
            targetHit={xHit}
            extras={[round.x0, round.targetX ?? round.x0]}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <TargetReadout
            label={`Final velocity (t = ${T}s)`}
            value={finalV}
            unit="m/s"
            target={round.targetV}
            hit={vHit}
            testid="stack-final-v"
          />
          <TargetReadout
            label={`Final position (t = ${T}s)`}
            value={finalX}
            unit="m"
            target={round.targetX}
            hit={xHit}
            testid="stack-final-x"
          />
        </div>

        <button
          type="button"
          onClick={play}
          className="mt-3 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          ▶ Run the stack
        </button>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-600">
          Tune the inputs
        </h3>
        <div className="space-y-3">
          {round.controls.includes("v0") && (
            <Slider
              label="Initial velocity v₀"
              value={controls.v0}
              min={-6}
              max={6}
              step={0.5}
              unit="m/s"
              onChange={(v) => setControl("v0", v)}
            />
          )}
          {round.controls.includes("a") && (
            <Slider
              label="Acceleration a"
              value={controls.a}
              min={-4}
              max={4}
              step={0.5}
              unit="m/s²"
              onChange={(v) => setControl("a", v)}
            />
          )}
          {round.controls.includes("a1") && (
            <Slider
              label={`Acceleration a₁ (0–${T / 2}s)`}
              value={controls.a1}
              min={-4}
              max={4}
              step={0.5}
              unit="m/s²"
              onChange={(v) => setControl("a1", v)}
            />
          )}
          {round.controls.includes("a2") && (
            <Slider
              label={`Acceleration a₂ (${T / 2}–${T}s)`}
              value={controls.a2}
              min={-4}
              max={4}
              step={0.5}
              unit="m/s²"
              onChange={(v) => setControl("a2", v)}
            />
          )}
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
          {score >= PASS ? "Locked on! 🎯" : "Hit the green targets"}
        </span>

        {isLast ? (
          <button
            type="button"
            data-testid="stack-finish"
            onClick={finish}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Finish
          </button>
        ) : (
          <button
            type="button"
            data-testid="stack-next"
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

/** Piecewise-constant acceleration value at time t (for plotting a(t)). */
function accelAtTime(segments: AccelSegment[], t: number): number {
  let elapsed = 0;
  for (const seg of segments) {
    if (t <= elapsed + seg.duration) return seg.a;
    elapsed += seg.duration;
  }
  return segments.length ? segments[segments.length - 1].a : 0;
}

const W = 320;
const H = 116;
const PAD = { left: 30, right: 14, top: 12, bottom: 20 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const SAMPLES = 96;

function StackPlot({
  label,
  f,
  T,
  color,
  playT,
  target,
  targetHit,
  extras = [],
}: {
  label: string;
  f: (t: number) => number;
  T: number;
  color: string;
  playT: number | null;
  target?: number | null;
  targetHit?: boolean;
  extras?: number[];
}) {
  const ys: number[] = [];
  for (let i = 0; i <= SAMPLES; i++) ys.push(f((T * i) / SAMPLES));
  const all = [...ys, ...extras];
  let yMin = Math.min(...all);
  let yMax = Math.max(...all);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const pad = (yMax - yMin) * 0.15;
  yMin -= pad;
  yMax += pad;
  const span = yMax - yMin || 1;

  const sx = (t: number) => PAD.left + (t / T) * PLOT_W;
  const sy = (y: number) => PAD.top + PLOT_H - ((y - yMin) / span) * PLOT_H;

  const path = ys
    .map((y, i) => {
      const t = (T * i) / SAMPLES;
      return `${i === 0 ? "M" : "L"}${roundTo(sx(t), 1)},${roundTo(sy(y), 1)}`;
    })
    .join(" ");

  const showZero = yMin < 0 && yMax > 0;
  const ringColor = targetHit ? "#10b981" : "#94a3b8";

  let marker: { x: number; y: number } | null = null;
  if (playT !== null) {
    marker = { x: sx(playT), y: sy(f(playT)) };
  }

  return (
    <div>
      <div className="mb-0.5 text-[11px] font-medium text-slate-500">
        {label}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={label}
      >
        {showZero && (
          <line
            x1={PAD.left}
            y1={sy(0)}
            x2={PAD.left + PLOT_W}
            y2={sy(0)}
            stroke="#e2e8f0"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + PLOT_H}
          stroke="#cbd5e1"
        />
        <line
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={PAD.left + PLOT_W}
          y2={PAD.top + PLOT_H}
          stroke="#cbd5e1"
        />

        <path d={path} fill="none" stroke={color} strokeWidth={2.5} />

        {/* Target checkpoint ring at t = T (snaps green on a hit). */}
        {typeof target === "number" && (
          <g>
            <line
              x1={sx(T)}
              y1={sy(target)}
              x2={sx(T) - 7}
              y2={sy(target)}
              stroke={ringColor}
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
            <circle
              cx={sx(T)}
              cy={sy(target)}
              r={8}
              fill="none"
              stroke={ringColor}
              strokeWidth={2.5}
            />
            <circle cx={sx(T)} cy={sy(target)} r={2.5} fill={ringColor} />
            <text
              x={sx(T) - 11}
              y={sy(target) - 9}
              textAnchor="end"
              className="fill-slate-500"
              fontSize={9}
            >
              {roundTo(target, 1)}
            </text>
          </g>
        )}

        {marker && (
          <circle
            cx={marker.x}
            cy={marker.y}
            r={5}
            fill="#f59e0b"
            stroke="#fff"
            strokeWidth={2}
          />
        )}

        <text
          x={W - PAD.right}
          y={H - 6}
          textAnchor="end"
          className="fill-slate-400"
          fontSize={9}
        >
          t (s)
        </text>
      </svg>
    </div>
  );
}

function TargetReadout({
  label,
  value,
  unit,
  target,
  hit,
  testid,
}: {
  label: string;
  value: number;
  unit: string;
  target: number | null;
  hit: boolean;
  testid: string;
}) {
  const active = target !== null;
  return (
    <div
      className={`rounded-xl px-3 py-2 ring-1 ${
        active
          ? hit
            ? "bg-emerald-50 ring-emerald-300"
            : "bg-slate-100 ring-slate-200"
          : "bg-slate-50 ring-slate-100"
      }`}
    >
      <div className="text-xs text-slate-600">{label}</div>
      <div className="text-lg font-bold text-ink" data-testid={testid}>
        {roundTo(value, 1)} {unit}
      </div>
      {active && (
        <div className="text-[11px] text-slate-500">
          target {roundTo(target!, 1)} {unit} {hit ? "· hit ✓" : ""}
        </div>
      )}
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
      data-testid="stack-result"
      className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200 sm:p-6"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-brand-600">
        Practice complete
      </p>
      <div className={`mt-2 font-display text-5xl font-bold ${tone}`}>
        {overall}%
      </div>
      <p className="mt-1 text-slate-500">
        Average match across {bestByRound.length} rounds
      </p>

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
