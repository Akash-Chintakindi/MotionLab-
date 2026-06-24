import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Slider } from "../components/Slider";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  G_DEFAULT as G,
  components,
  peakHeight,
  range,
  scoreShot,
  timeOfFlight,
  trajectoryPoint,
  overallScore,
  type ShotConfig,
  type Target,
  type Wall,
} from "./lib/cannonScoring";

interface Round extends ShotConfig {
  id: string;
  title: string;
  instruction: string;
  target: Target;
  wall?: Wall;
}

// World extents (metres) used to project physics → SVG. Sized to comfortably
// hold the steepest/longest round so arcs never clip.
const WORLD_X = 66;
const WORLD_Y = 46;

const ROUNDS: Round[] = [
  {
    id: "r1",
    title: "Flat ground",
    instruction:
      "Range only. The target sits on level ground 40 m out. Pick an angle and speed so the arc lands on it — remember range peaks at 45°.",
    target: { x: 40, y: 0 },
    tolerance: 2.5,
    scale: 22,
  },
  {
    id: "r2",
    title: "On the platform",
    instruction:
      "Now height matters. The target is perched on a 15 m platform. Your arc has to be coming DOWN through that point, not just reach the distance.",
    target: { x: 45, y: 15 },
    tolerance: 3,
    scale: 22,
  },
  {
    id: "r3",
    title: "Over the wall",
    instruction:
      "A 18 m wall blocks the low road. Clear it with enough peak height, then drop onto the target behind. A flat, fast shot is useless here.",
    target: { x: 50, y: 0 },
    tolerance: 3,
    scale: 22,
    wall: { x: 25, height: 18 },
  },
];

const ANGLE_MIN = 10;
const ANGLE_MAX = 80;
const SPEED_MIN = 5;
const SPEED_MAX = 40;
const PASS = 80;

export function CannonRangeGame({
  onScore,
  next,
}: {
  onScore?: (bestScore: number) => void;
  next?: { href: string; label: string };
}) {
  const reduced = usePrefersReducedMotion();
  const [roundIdx, setRoundIdx] = useState(0);
  const [angle, setAngle] = useState(45);
  const [speed, setSpeed] = useState(20);
  const [bestByRound, setBestByRound] = useState<number[]>(() =>
    Array(ROUNDS.length).fill(0),
  );
  const [finished, setFinished] = useState(false);

  // Animation / fired-shot state.
  const [flightT, setFlightT] = useState<number | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [exploded, setExploded] = useState(false);
  const rafRef = useRef<number | null>(null);

  const round = ROUNDS[roundIdx];

  const tof = timeOfFlight(speed, angle, G);
  const liveRange = range(speed, angle, G);
  const livePeak = peakHeight(speed, angle, G);

  useEffect(() => () => cancelAnim(rafRef), []);

  function loadRound(i: number) {
    cancelAnim(rafRef);
    setRoundIdx(i);
    setAngle(45);
    setSpeed(20);
    setFlightT(null);
    setLastScore(null);
    setExploded(false);
  }

  function recordScore(sc: number) {
    setBestByRound((prev) => {
      if (sc <= prev[roundIdx]) return prev;
      const nextBest = [...prev];
      nextBest[roundIdx] = sc;
      return nextBest;
    });
  }

  function fire() {
    cancelAnim(rafRef);
    const sc = scoreShot(speed, angle, round, G);
    const hit = sc >= 100;
    setExploded(false);

    const flightDuration = Math.max(tof, 0.4);

    if (reduced) {
      // Draw the whole arc and resolve the shot instantly (no rAF).
      setFlightT(flightDuration);
      setLastScore(sc);
      setExploded(hit);
      recordScore(sc);
      return;
    }

    setLastScore(null);
    const start = performance.now();
    const animMs = 1400;
    const tick = (now: number) => {
      const frac = Math.min(1, (now - start) / animMs);
      setFlightT(frac * flightDuration);
      if (frac < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setLastScore(sc);
        setExploded(hit);
        recordScore(sc);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  const overall = overallScore(bestByRound);

  function finish() {
    cancelAnim(rafRef);
    setFinished(true);
    onScore?.(overall);
  }

  if (finished) {
    return (
      <ResultScreen
        bestByRound={bestByRound}
        overall={overall}
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
  const roundBest = bestByRound[roundIdx];

  return (
    <div data-testid="practice-game">
      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wide">
            Round {roundIdx + 1} of {ROUNDS.length} · {round.title}
          </span>
          <span data-testid="cannon-best">Best {roundBest}%</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-slate-600">
          {round.instruction}
        </p>

        <CannonField
          round={round}
          speed={speed}
          angle={angle}
          flightT={flightT}
          exploded={exploded}
        />

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <Stat label="Time of flight" value={`${tof.toFixed(1)} s`} />
          <Stat label="Peak height" value={`${livePeak.toFixed(1)} m`} />
          <Stat label="Range" value={`${liveRange.toFixed(1)} m`} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            data-testid="cannon-fire"
            onClick={fire}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            🔥 Fire
          </button>
          {lastScore !== null && (
            <span
              data-testid="cannon-shot-score"
              className={`text-sm font-semibold ${
                lastScore >= 100
                  ? "text-emerald-600"
                  : lastScore >= 50
                    ? "text-amber-600"
                    : "text-rose-600"
              }`}
            >
              {lastScore >= 100
                ? "Direct hit! 🎯"
                : lastScore === 0 && round.wall
                  ? "Blocked by the wall"
                  : `Shot scored ${lastScore}%`}
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-600">Aim the cannon</h3>
        <div className="space-y-3">
          <Slider
            label="Launch angle"
            value={angle}
            min={ANGLE_MIN}
            max={ANGLE_MAX}
            step={1}
            unit="°"
            onChange={setAngle}
          />
          <Slider
            label="Launch speed"
            value={speed}
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={1}
            unit="m/s"
            onChange={setSpeed}
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Horizontal speed v·cosθ stays constant; vertical motion accelerates down
          at g = {G} m/s². Air resistance is ignored.
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
          {roundBest >= PASS ? "Target down! 🎯" : "Land a shot on the target"}
        </span>

        {isLast ? (
          <button
            type="button"
            data-testid="cannon-finish"
            onClick={finish}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Finish
          </button>
        ) : (
          <button
            type="button"
            data-testid="cannon-next"
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

const W = 340;
const H = 240;
const PAD = { left: 30, right: 14, top: 14, bottom: 26 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const sx = (x: number) => PAD.left + (x / WORLD_X) * PLOT_W;
const sy = (y: number) => PAD.top + PLOT_H - (y / WORLD_Y) * PLOT_H;

function CannonField({
  round,
  speed,
  angle,
  flightT,
  exploded,
}: {
  round: Round;
  speed: number;
  angle: number;
  flightT: number | null;
  exploded: boolean;
}) {
  // Trajectory polyline up to the current animated time (or the full arc when
  // idle so the learner can preview where the shot is pointed... only after a
  // shot is fired — flightT === null means no trail yet).
  const trail = useMemo(() => {
    if (flightT === null) return "";
    const N = 48;
    let d = "";
    for (let i = 0; i <= N; i++) {
      const t = (flightT * i) / N;
      const p = trajectoryPoint(speed, angle, t, G);
      if (p.y < 0) break;
      d += `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)} `;
    }
    return d.trim();
  }, [flightT, speed, angle]);

  const ball =
    flightT !== null ? trajectoryPoint(speed, angle, flightT, G) : null;
  const ballOnScreen = ball && ball.y >= 0;

  const { x: vx, y: vy } = components(speed, angle);
  // Short barrel pointing in the launch direction.
  const barrelLen = 18;
  const mag = Math.hypot(vx, vy) || 1;
  const bx = sx(0) + (vx / mag) * barrelLen;
  const by = sy(0) - (vy / mag) * barrelLen;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-xl bg-gradient-to-b from-sky-50 to-emerald-50"
      role="img"
      aria-label="Cannon range: aim the arc onto the target"
    >
      {/* ground */}
      <line
        x1={PAD.left}
        y1={sy(0)}
        x2={PAD.left + PLOT_W}
        y2={sy(0)}
        stroke="#94a3b8"
        strokeWidth={1.5}
      />
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={sy(0)}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      <text
        x={PAD.left + PLOT_W / 2}
        y={H - 6}
        textAnchor="middle"
        className="fill-slate-500 text-[10px]"
      >
        horizontal distance (m)
      </text>

      {/* wall */}
      {round.wall && (
        <rect
          x={sx(round.wall.x) - 4}
          y={sy(round.wall.height)}
          width={8}
          height={sy(0) - sy(round.wall.height)}
          fill="#78716c"
          rx={1}
        />
      )}

      {/* platform under an elevated target */}
      {round.target.y > 0 && (
        <line
          x1={sx(round.target.x)}
          y1={sy(round.target.y)}
          x2={sx(round.target.x)}
          y2={sy(0)}
          stroke="#cbd5e1"
          strokeWidth={2}
          strokeDasharray="3 3"
        />
      )}

      {/* target */}
      <g>
        <circle
          cx={sx(round.target.x)}
          cy={sy(round.target.y)}
          r={8}
          fill="none"
          stroke={exploded ? "#10b981" : "#ef4444"}
          strokeWidth={2.5}
        />
        <circle
          cx={sx(round.target.x)}
          cy={sy(round.target.y)}
          r={3}
          fill={exploded ? "#10b981" : "#ef4444"}
        />
        {exploded &&
          EXPLOSION_RAYS.map((a, i) => {
            const rad = (a * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={sx(round.target.x)}
                y1={sy(round.target.y)}
                x2={sx(round.target.x) + Math.cos(rad) * 14}
                y2={sy(round.target.y) - Math.sin(rad) * 14}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}
      </g>

      {/* cannon barrel + base */}
      <line
        x1={sx(0)}
        y1={sy(0)}
        x2={bx}
        y2={by}
        stroke="#1f2937"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <circle cx={sx(0)} cy={sy(0)} r={6} fill="#1f2937" />

      {/* trajectory trail */}
      {trail && (
        <path
          d={trail}
          fill="none"
          stroke="#1f7aff"
          strokeWidth={2.5}
          strokeDasharray="2 3"
        />
      )}

      {/* projectile */}
      {ballOnScreen && (
        <circle
          cx={sx(ball!.x)}
          cy={sy(ball!.y)}
          r={5}
          fill="#0f172a"
          stroke="#fff"
          strokeWidth={1.5}
          data-testid="cannon-ball"
        />
      )}
    </svg>
  );
}

const EXPLOSION_RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 px-2 py-2">
      <div className="text-[11px] text-slate-600">{label}</div>
      <div className="text-sm font-bold text-ink">{value}</div>
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
      data-testid="cannon-result"
      className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200 sm:p-6"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-brand-600">
        Practice complete
      </p>
      <div className={`mt-2 font-display text-5xl font-bold ${tone}`}>
        {overall}%
      </div>
      <p className="mt-1 text-slate-500">
        Average accuracy across {bestByRound.length} rounds
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
