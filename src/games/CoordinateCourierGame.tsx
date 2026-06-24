import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Slider } from "../components/Slider";
import { RichText } from "../components/RichText";
import { Arrow } from "../components/graph/Arrow";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  dronePosition,
  distanceToWaypoint,
  scoreRound,
  isDelivered,
  type DroneState,
  type Waypoint,
} from "./lib/courierScoring";

/** Full marks for landing within this many metres of a waypoint. */
const TOL = 0.5;
/** Miss distance (beyond tolerance) at which closeness reaches 0. */
const SCALE = 7;
const PASS = 80;

type Control = "vx" | "vy" | "ay";

interface RoundWaypoint extends Waypoint {
  id: string;
  label: string;
}

interface Round {
  id: string;
  title: string;
  instruction: string;
  /** Which component sliders the learner can tune this round. */
  controls: Control[];
  /** Starting slider values. */
  init: { vx: number; vy: number; ay: number };
  /** Fixed accelerations for components the learner does not control. */
  ax: number;
  waypoints: RoundWaypoint[];
  /** Animation horizon (s). */
  tMax: number;
  domain: { xMin: number; xMax: number; yMin: number; yMax: number };
}

const ROUNDS: Round[] = [
  {
    id: "r1",
    title: "Straight shot",
    instruction:
      "Constant velocity. Set v_x and v_y so the drone flies in a straight line and lands on the depot ring at t = 4 s.",
    controls: ["vx", "vy"],
    init: { vx: 1, vy: 0.5, ay: 0 },
    ax: 0,
    tMax: 4,
    domain: { xMin: -2, xMax: 12, yMin: -2, yMax: 10 },
    waypoints: [{ id: "w1", label: "Depot", t: 4, x: 8, y: 6 }],
  },
  {
    id: "r2",
    title: "Diagonal drop",
    instruction:
      "The depot is across and below the launch pad. v_x and v_y are different — even their signs differ. Reach it at t = 3 s.",
    controls: ["vx", "vy"],
    init: { vx: 1, vy: 1, ay: 0 },
    ax: 0,
    tMax: 3,
    domain: { xMin: -2, xMax: 12, yMin: -8, yMax: 4 },
    waypoints: [{ id: "w1", label: "Depot", t: 3, x: 9, y: -6 }],
  },
  {
    id: "r3",
    title: "Arc the package",
    instruction:
      "Gravity is on: tune the downward a_y so the drone arcs over the rooftop ring (t = 2 s) and settles on the depot (t = 4 s). x stays constant-velocity; reason about x and y independently.",
    controls: ["vx", "vy", "ay"],
    init: { vx: 2, vy: 2, ay: -1 },
    ax: 0,
    tMax: 4,
    domain: { xMin: -2, xMax: 14, yMin: -2, yMax: 10 },
    waypoints: [
      { id: "w1", label: "Rooftop", t: 2, x: 6, y: 6 },
      { id: "w2", label: "Depot", t: 4, x: 12, y: 0 },
    ],
  },
];

export function CoordinateCourierGame({
  onScore,
  next,
}: {
  onScore?: (bestOverall: number) => void;
  next?: { href: string; label: string };
}) {
  const reduced = usePrefersReducedMotion();
  const [roundIdx, setRoundIdx] = useState(0);
  const round = ROUNDS[roundIdx];

  const [vx, setVx] = useState(round.init.vx);
  const [vy, setVy] = useState(round.init.vy);
  const [ay, setAy] = useState(round.init.ay);
  const [bestByRound, setBestByRound] = useState<number[]>(() =>
    Array(ROUNDS.length).fill(0),
  );
  const [finished, setFinished] = useState(false);
  const [flightT, setFlightT] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const state: DroneState = useMemo(
    () => ({
      x0: 0,
      y0: 0,
      vx,
      vy,
      ax: round.ax,
      ay: round.controls.includes("ay") ? ay : 0,
    }),
    [vx, vy, ay, round],
  );

  const score = useMemo(
    () => scoreRound(state, round.waypoints, TOL, SCALE),
    [state, round.waypoints],
  );

  const allDelivered = round.waypoints.every((wp) =>
    isDelivered(state, wp, TOL),
  );

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
    setFlightT(null);
    setRoundIdx(i);
    setVx(ROUNDS[i].init.vx);
    setVy(ROUNDS[i].init.vy);
    setAy(ROUNDS[i].init.ay);
  }

  function reset() {
    cancelAnim(rafRef);
    setFlightT(null);
    setVx(round.init.vx);
    setVy(round.init.vy);
    setAy(round.init.ay);
  }

  function fly() {
    cancelAnim(rafRef);
    // A clean delivery lands exactly at the target time; a miss keeps moving
    // (and keeps falling under gravity) until it leaves the field, so the drone
    // visibly overshoots/drops instead of freezing mid-air.
    const horizon = allDelivered ? round.tMax : flightHorizon(state, round);
    if (reduced) {
      setFlightT(horizon);
      return;
    }
    const start = performance.now();
    const duration = 1800 * (horizon / round.tMax);
    const tick = (now: number) => {
      const frac = Math.min(1, (now - start) / duration);
      setFlightT(frac * horizon);
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
  const velNow = { x: vx, y: vy };

  return (
    <div data-testid="practice-game">
      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wide">
            Round {roundIdx + 1} of {ROUNDS.length} · {round.title}
          </span>
          <span data-testid="courier-score">Score {score}%</span>
        </div>
        <p className="mb-4 text-base font-medium leading-relaxed text-slate-800">
          <RichText>{round.instruction}</RichText>
        </p>

        <CourierPlane
          round={round}
          state={state}
          flightT={flightT}
          velNow={velNow}
        />

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={fly}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            ▶ Launch
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
          Set the drone's launch components
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Slider
            label="horizontal velocity v_x"
            value={vx}
            min={-8}
            max={8}
            step={0.5}
            unit="m/s"
            onChange={setVx}
          />
          <Slider
            label="vertical velocity v_y"
            value={vy}
            min={-8}
            max={8}
            step={0.5}
            unit="m/s"
            onChange={setVy}
          />
          {round.controls.includes("ay") && (
            <Slider
              label="vertical acceleration a_y"
              value={ay}
              min={-6}
              max={0}
              step={0.5}
              unit="m/s²"
              onChange={setAy}
            />
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          The components are independent: <RichText>v_x</RichText> only moves the
          drone across, <RichText>v_y</RichText>
          {round.controls.includes("ay") ? (
            <>
              {" "}
              and <RichText>a_y</RichText> only move it up and down.
            </>
          ) : (
            <> only moves it up and down.</>
          )}
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
          {allDelivered
            ? "Package delivered! 📦"
            : score >= PASS
              ? "Almost there…"
              : "Route the drone to the rings"}
        </span>

        {isLast ? (
          <button
            type="button"
            data-testid="courier-finish"
            onClick={finish}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Finish
          </button>
        ) : (
          <button
            type="button"
            data-testid="courier-next"
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

/**
 * How long to keep animating a missed flight: continue past the target time
 * until the drone leaves the visible field (e.g. falls out the bottom under
 * gravity), capped so the animation always terminates.
 */
function flightHorizon(state: DroneState, round: Round): number {
  const cap = round.tMax + 3;
  const { xMin, xMax, yMin, yMax } = round.domain;
  for (let t = round.tMax; t <= cap; t += 0.05) {
    const p = dronePosition(state, t);
    if (p.x > xMax || p.x < xMin || p.y < yMin || p.y > yMax) return t;
  }
  return cap;
}

const W = 320;
const H = 280;
const PAD = 26;

function CourierPlane({
  round,
  state,
  flightT,
  velNow,
}: {
  round: Round;
  state: DroneState;
  flightT: number | null;
  velNow: { x: number; y: number };
}) {
  const { xMin, xMax, yMin, yMax } = round.domain;
  const sx = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD);
  const sy = (y: number) => H - PAD - ((y - yMin) / (yMax - yMin)) * (H - 2 * PAD);

  // A short dotted "aim" hint: only the first slice of the trajectory, so the
  // learner sees the launch direction and curvature without the landing spot
  // being given away.
  const hintT = Math.min(1.1, round.tMax * 0.4);
  const hintSteps = 18;
  const hintPath = Array.from({ length: hintSteps + 1 }, (_, i) => {
    const p = dronePosition(state, (i / hintSteps) * hintT);
    return `${i === 0 ? "M" : "L"} ${sx(p.x)} ${sy(p.y)}`;
  }).join(" ");

  // Animated drone position + trail up to flightT.
  let drone: { x: number; y: number } | null = null;
  let trail = "";
  if (flightT !== null) {
    const dp = dronePosition(state, flightT);
    drone = { x: sx(dp.x), y: sy(dp.y) };
    const steps = 40;
    trail = Array.from({ length: steps + 1 }, (_, i) => {
      const p = dronePosition(state, (i / steps) * flightT);
      return `${i === 0 ? "M" : "L"} ${sx(p.x)} ${sy(p.y)}`;
    }).join(" ");
  }

  // Velocity arrow at the drone's current shown position (start when idle).
  const head = drone ?? { x: sx(0), y: sy(0) };
  const vEnd = drone
    ? { x: drone.x, y: drone.y }
    : { x: sx(velNow.x * 0.6), y: sy(velNow.y * 0.6) };

  // Gridlines along the x-axis (y = 0) and y-axis (x = 0) if in view.
  const showXAxis = yMin <= 0 && yMax >= 0;
  const showYAxis = xMin <= 0 && xMax >= 0;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-xl bg-slate-50"
      role="img"
      aria-label="2D plane: route the delivery drone onto the target waypoints"
    >
      {/* frame */}
      <rect
        x={PAD}
        y={PAD}
        width={W - 2 * PAD}
        height={H - 2 * PAD}
        fill="none"
        stroke="#e2e8f0"
      />
      {showXAxis && (
        <line x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} stroke="#cbd5e1" />
      )}
      {showYAxis && (
        <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} stroke="#cbd5e1" />
      )}
      <text x={W - PAD} y={H - PAD + 16} textAnchor="end" className="fill-slate-400 text-[9px]">
        x (m)
      </text>
      <text x={PAD - 6} y={PAD - 8} textAnchor="start" className="fill-slate-400 text-[9px]">
        y (m)
      </text>

      {/* launch pad */}
      <circle cx={sx(0)} cy={sy(0)} r={4} fill="#94a3b8" />
      <text x={sx(0) + 7} y={sy(0) + 12} className="fill-slate-400 text-[9px]">
        launch
      </text>

      {/* short dotted aim hint — only while idle, only the first slice */}
      {flightT === null && (
        <path
          d={hintPath}
          fill="none"
          stroke="#0a5fe6"
          strokeWidth={2}
          strokeDasharray="1.5 5"
          strokeLinecap="round"
          opacity={0.6}
        />
      )}

      {/* waypoint rings — light up green when reached */}
      {round.waypoints.map((wp) => {
        const hit = distanceToWaypoint(state, wp) <= TOL;
        const color = hit ? "#10b981" : "#64748b";
        return (
          <g key={wp.id}>
            <circle
              cx={sx(wp.x)}
              cy={sy(wp.y)}
              r={9}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
            />
            <circle cx={sx(wp.x)} cy={sy(wp.y)} r={2.5} fill={color} />
            {hit && <DeliveryBurst cx={sx(wp.x)} cy={sy(wp.y)} />}
            <text
              x={sx(wp.x)}
              y={sy(wp.y) - 13}
              textAnchor="middle"
              className="fill-slate-500 text-[9px] font-semibold"
            >
              {wp.label}
            </text>
          </g>
        );
      })}

      {/* animated trail + drone */}
      {flightT !== null && (
        <path d={trail} fill="none" stroke="#f59e0b" strokeWidth={2.5} />
      )}

      {/* velocity arrow (shows the initial launch direction when idle) */}
      {!drone && (
        <Arrow
          x1={sx(0)}
          y1={sy(0)}
          x2={vEnd.x}
          y2={vEnd.y}
          color="#1f7aff"
          label="initial velocity vector"
        />
      )}

      {drone && (
        <circle cx={head.x} cy={head.y} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
      )}
    </svg>
  );
}

function DeliveryBurst({ cx, cy }: { cx: number; cy: number }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <g>
      {rays.map((deg) => {
        const r = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={cx + Math.cos(r) * 11}
            y1={cy + Math.sin(r) * 11}
            x2={cx + Math.cos(r) * 16}
            y2={cy + Math.sin(r) * 16}
            stroke="#10b981"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        );
      })}
    </g>
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
      data-testid="courier-result"
      className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200 sm:p-6"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-brand-600">
        Deliveries complete
      </p>
      <div className={`mt-2 font-display text-5xl font-bold ${tone}`}>
        {overall}%
      </div>
      <p className="mt-1 text-slate-500">
        Average accuracy across {bestByRound.length} routes
      </p>

      <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left">
        {bestByRound.map((s, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
          >
            <span className="text-slate-600">Route {i + 1}</span>
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
