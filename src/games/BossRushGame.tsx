import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { scoreRun, summarizeRun } from "./lib/bossRushScoring";

/**
 * Boss Rush — a fast, scored gauntlet of six mixed mini-challenges, one drawing
 * on each prior lesson (slope, acceleration, area, constant-accel equations, 2D
 * components, projectile). Each boss is a quick multiple-choice or short-numeric
 * round with a combo/streak feel. Per-stage correctness aggregates into a 0–100
 * score (pure logic in lib/bossRushScoring.ts).
 */

type Choice = {
  kind: "choice";
  options: { id: string; label: string }[];
  correctId: string;
};

type Numeric = {
  kind: "numeric";
  value: number;
  tolerance: number;
  unit: string;
  placeholder: string;
};

interface Stage {
  id: string;
  boss: string;
  topic: string;
  prompt: string;
  /** Optional inline illustration. */
  art?: "fallingLine" | "areaTriangle" | "vectorComponents";
  ask: Choice | Numeric;
  explain: string;
}

const STAGES: Stage[] = [
  {
    id: "s1",
    boss: "The Slope Sentinel",
    topic: "Reading velocity from x(t)",
    prompt:
      "This is a position–time graph. It falls steadily to the right. What is the sign of the velocity?",
    art: "fallingLine",
    ask: {
      kind: "choice",
      options: [
        { id: "pos", label: "Positive" },
        { id: "neg", label: "Negative" },
        { id: "zero", label: "Zero" },
      ],
      correctId: "neg",
    },
    explain:
      "Velocity is the slope of x(t). A line falling to the right has a negative slope, so v < 0.",
  },
  {
    id: "s2",
    boss: "The Accelerator",
    topic: "a(t) vs. speeding up / slowing down",
    prompt:
      "An object is moving in the +x direction but its acceleration points in the −x direction. The object is:",
    ask: {
      kind: "choice",
      options: [
        { id: "up", label: "Speeding up" },
        { id: "down", label: "Slowing down" },
        { id: "const", label: "Moving at constant speed" },
      ],
      correctId: "down",
    },
    explain:
      "When velocity and acceleration point in opposite directions, speed decreases — the object slows down.",
  },
  {
    id: "s3",
    boss: "The Area Reaper",
    topic: "Displacement = area under v(t)",
    prompt:
      "A velocity graph is the line v(t) = 2t. What is the net displacement from t = 0 to t = 4 s? (The shaded triangle is the area.)",
    art: "areaTriangle",
    ask: {
      kind: "numeric",
      value: 16,
      tolerance: 0.5,
      unit: "m",
      placeholder: "metres",
    },
    explain:
      "Displacement is the area under v(t). The triangle has base 4 and height v(4) = 8, so area = ½ · 4 · 8 = 16 m.",
  },
  {
    id: "s4",
    boss: "The Constant Crusher",
    topic: "Constant-acceleration equations",
    prompt:
      "A cart starts at v₀ = 3 m/s and accelerates at a constant 2 m/s². What is its velocity after 4 s?",
    ask: {
      kind: "numeric",
      value: 11,
      tolerance: 0.2,
      unit: "m/s",
      placeholder: "m/s",
    },
    explain: "v = v₀ + a·t = 3 + (2)(4) = 11 m/s.",
  },
  {
    id: "s5",
    boss: "The Vector Warden",
    topic: "Combining 2D components",
    prompt:
      "A ball moves with a horizontal velocity of 6 m/s and a vertical velocity of 8 m/s. What is its speed?",
    art: "vectorComponents",
    ask: {
      kind: "numeric",
      value: 10,
      tolerance: 0.2,
      unit: "m/s",
      placeholder: "m/s",
    },
    explain:
      "Speed combines the components: √(6² + 8²) = √(36 + 64) = √100 = 10 m/s.",
  },
  {
    id: "s6",
    boss: "The Projectile King",
    topic: "Projectile range",
    prompt:
      "A projectile is launched at 20 m/s at 45° on level ground (g = 10 m/s²). What is its range? Range = v²·sin(2θ)/g.",
    ask: {
      kind: "numeric",
      value: 40,
      tolerance: 0.5,
      unit: "m",
      placeholder: "metres",
    },
    explain:
      "Range = v²·sin(2θ)/g = (20²)(sin 90°)/10 = (400)(1)/10 = 40 m.",
  },
];

const TOTAL = STAGES.length;

export function BossRushGame({
  onScore,
  next,
}: {
  onScore?: (bestScore: number) => void;
  next?: { href: string; label: string };
}) {
  const reduced = usePrefersReducedMotion();
  const [stageIdx, setStageIdx] = useState(0);
  const [flags, setFlags] = useState<boolean[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [finished, setFinished] = useState(false);
  const [health, setHealth] = useState(1);
  const rafRef = useRef<number | null>(null);

  const stage = STAGES[stageIdx];
  const isLast = stageIdx === TOTAL - 1;

  useEffect(() => () => cancelAnim(rafRef), []);

  function animateHealthToZero() {
    cancelAnim(rafRef);
    if (reduced) {
      setHealth(0);
      return;
    }
    const start = performance.now();
    const duration = 520;
    const tick = (now: number) => {
      const frac = Math.min(1, (now - start) / duration);
      setHealth(1 - frac);
      if (frac < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function grade() {
    if (revealed) return;
    let correct = false;
    if (stage.ask.kind === "choice") {
      if (selected === null) return;
      correct = selected === stage.ask.correctId;
    } else {
      const parsed = Number(input);
      if (input.trim() === "" || Number.isNaN(parsed)) return;
      correct = Math.abs(parsed - stage.ask.value) <= stage.ask.tolerance;
    }

    setFlags((prev) => [...prev, correct]);
    setRevealed(true);
    setLastCorrect(correct);
    if (correct) {
      animateHealthToZero();
      setCombo((c) => {
        const nc = c + 1;
        setBestCombo((b) => Math.max(b, nc));
        return nc;
      });
    } else {
      setHealth(1);
      setCombo(0);
    }
  }

  function nextStage() {
    cancelAnim(rafRef);
    if (isLast) {
      finish();
      return;
    }
    setStageIdx((i) => i + 1);
    setSelected(null);
    setInput("");
    setRevealed(false);
    setHealth(1);
  }

  function finish() {
    cancelAnim(rafRef);
    setFinished(true);
    onScore?.(scoreRun(flags));
  }

  function replay() {
    cancelAnim(rafRef);
    setFinished(false);
    setStageIdx(0);
    setFlags([]);
    setSelected(null);
    setInput("");
    setRevealed(false);
    setLastCorrect(false);
    setCombo(0);
    setBestCombo(0);
    setHealth(1);
  }

  const cleared = useMemo(() => flags.filter(Boolean).length, [flags]);

  if (finished) {
    return (
      <ResultScreen flags={flags} bestCombo={bestCombo} next={next} onReplay={replay} />
    );
  }

  return (
    <div data-testid="practice-game">
      {/* Status bar: combo + cleared count. */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-slate-400">
            Boss
          </span>
          <span className="font-display text-lg font-bold">
            {stageIdx + 1}
            <span className="text-slate-500">/{TOTAL}</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            data-testid="boss-combo"
            className={`font-mono text-sm font-semibold ${
              combo >= 2 ? "text-amber-400" : "text-slate-400"
            }`}
          >
            {combo >= 2 ? `🔥 Combo ×${combo}` : "Combo —"}
          </span>
          <span className="font-mono text-sm text-emerald-400">
            {cleared} cleared
          </span>
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">{stage.boss}</h2>
        </div>
        <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-brand-600">
          {stage.topic}
        </p>

        {/* Boss health bar — drains when you land a correct hit. */}
        <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-none ${
              revealed && lastCorrect ? "bg-emerald-500" : "bg-rose-500"
            }`}
            style={{ width: `${Math.round(health * 100)}%` }}
          />
        </div>

        {stage.art && (
          <div className="mb-4">
            <StageArt art={stage.art} />
          </div>
        )}

        <p className="mb-4 text-sm leading-relaxed text-slate-700">{stage.prompt}</p>

        {stage.ask.kind === "choice" ? (
          <div className="grid gap-2">
            {stage.ask.options.map((o) => {
              const choice = stage.ask as Choice;
              const isCorrectOpt = o.id === choice.correctId;
              const isPicked = selected === o.id;
              let cls =
                "border-slate-300 bg-white text-slate-700 hover:border-brand-400";
              if (revealed) {
                if (isCorrectOpt) cls = "border-emerald-500 bg-emerald-50 text-emerald-800";
                else if (isPicked) cls = "border-rose-400 bg-rose-50 text-rose-700";
                else cls = "border-slate-200 bg-white text-slate-400";
              } else if (isPicked) {
                cls = "border-brand-600 bg-brand-50 text-brand-800";
              }
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={revealed}
                  onClick={() => setSelected(o.id)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${cls}`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={input}
              disabled={revealed}
              placeholder={stage.ask.placeholder}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") grade();
              }}
              className="w-40 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none disabled:bg-slate-50"
            />
            <span className="text-sm font-medium text-slate-500">{stage.ask.unit}</span>
          </div>
        )}

        {revealed && (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              lastCorrect
                ? "bg-emerald-50 text-emerald-800"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            <p className="font-semibold">
              {lastCorrect ? "Hit! Boss down. 💥" : "Missed — the boss strikes back."}
            </p>
            <p className="mt-1 leading-relaxed">{stage.explain}</p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          {!revealed ? (
            <button
              type="button"
              data-testid="boss-attack"
              onClick={grade}
              disabled={stage.ask.kind === "choice" ? selected === null : input.trim() === ""}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
            >
              Strike
            </button>
          ) : (
            <button
              type="button"
              data-testid="boss-next"
              onClick={nextStage}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              {isLast ? "Finish gauntlet" : "Next boss →"}
            </button>
          )}
        </div>
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

const W = 280;
const H = 150;
const PAD = 26;

function StageArt({ art }: { art: NonNullable<Stage["art"]> }) {
  if (art === "fallingLine") {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="A position-time graph falling to the right">
        <Axes yLabel="position (m)" />
        <line x1={PAD} y1={PAD + 8} x2={W - PAD} y2={H - PAD - 8} stroke="#0a5fe6" strokeWidth={2.5} />
        <circle cx={PAD} cy={PAD + 8} r={3} fill="#0a5fe6" />
        <circle cx={W - PAD} cy={H - PAD - 8} r={3} fill="#0a5fe6" />
      </svg>
    );
  }
  if (art === "areaTriangle") {
    // v(t) = 2t over t = 0..4 (graph drawn to t = 6 for context).
    const sx = (t: number) => PAD + (t / 6) * (W - 2 * PAD);
    const sy = (v: number) => H - PAD - (v / 12) * (H - 2 * PAD);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Velocity graph v(t)=2t with the area from 0 to 4 shaded">
        <Axes yLabel="velocity (m/s)" />
        <polygon
          points={`${sx(0)},${sy(0)} ${sx(4)},${sy(8)} ${sx(4)},${sy(0)}`}
          fill="#0a5fe6"
          fillOpacity={0.18}
        />
        <line x1={sx(0)} y1={sy(0)} x2={sx(6)} y2={sy(12)} stroke="#0a5fe6" strokeWidth={2.5} />
        <line x1={sx(4)} y1={sy(0)} x2={sx(4)} y2={sy(8)} stroke="#0a5fe6" strokeDasharray="3 3" />
        <text x={sx(4)} y={H - PAD + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">
          t = 4
        </text>
      </svg>
    );
  }
  // vectorComponents: 6 right, 8 up, hypotenuse 10.
  const ox = PAD + 10;
  const oy = H - PAD - 6;
  const scale = 11;
  const hx = ox + 6 * scale;
  const hy = oy - 8 * scale;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Velocity vector with horizontal component 6 and vertical component 8">
      <line x1={ox} y1={oy} x2={hx} y2={oy} stroke="#94a3b8" strokeWidth={2} />
      <line x1={hx} y1={oy} x2={hx} y2={hy} stroke="#94a3b8" strokeWidth={2} />
      <line x1={ox} y1={oy} x2={hx} y2={hy} stroke="#0a5fe6" strokeWidth={2.5} />
      <text x={(ox + hx) / 2} y={oy + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">
        6 m/s
      </text>
      <text x={hx + 6} y={(oy + hy) / 2} className="fill-slate-500 text-[9px]">
        8 m/s
      </text>
      <text x={(ox + hx) / 2 - 8} y={(oy + hy) / 2 - 6} className="fill-brand-600 text-[9px] font-semibold">
        v = ?
      </text>
    </svg>
  );
}

function Axes({ yLabel }: { yLabel: string }) {
  return (
    <>
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#cbd5e1" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#cbd5e1" />
      <text x={W - PAD} y={H - PAD + 14} textAnchor="end" className="fill-slate-400 text-[9px]">
        time (s)
      </text>
      <text x={PAD - 6} y={PAD - 8} textAnchor="start" className="fill-slate-400 text-[9px]">
        {yLabel}
      </text>
    </>
  );
}

function ResultScreen({
  flags,
  bestCombo,
  next,
  onReplay,
}: {
  flags: boolean[];
  bestCombo: number;
  next?: { href: string; label: string };
  onReplay: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const summary = useMemo(() => summarizeRun(flags), [flags]);
  const [shown, setShown] = useState(reduced ? summary.score : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setShown(summary.score);
      return;
    }
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const frac = Math.min(1, (now - start) / duration);
      setShown(Math.round(frac * summary.score));
      if (frac < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [reduced, summary.score]);

  const tone =
    summary.score >= 80
      ? "text-emerald-500"
      : summary.score >= 50
        ? "text-amber-500"
        : "text-rose-500";

  return (
    <div
      data-testid="boss-result"
      className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200 sm:p-6"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-brand-600">
        Gauntlet complete
      </p>
      <div className={`mt-2 font-display text-5xl font-bold ${tone}`}>{shown}%</div>
      <p className="mt-1 text-slate-500">
        {summary.correct} of {summary.total} bosses defeated
        {summary.bonus > 0 ? ` · +${summary.bonus} combo bonus` : ""}
      </p>

      <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left">
        <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-600">Accuracy</span>
          <span className="font-mono font-semibold text-ink">{summary.base}%</span>
        </li>
        <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-600">Best combo</span>
          <span className="font-mono font-semibold text-ink">×{bestCombo}</span>
        </li>
        <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-600">Combo bonus</span>
          <span className="font-mono font-semibold text-ink">+{summary.bonus}</span>
        </li>
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
        <Link to="/" className="text-sm font-semibold text-slate-500 hover:text-slate-700">
          Back to course
        </Link>
      </div>
    </div>
  );
}
