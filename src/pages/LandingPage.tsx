import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { course } from "../content/course";
import { getCurve, roundTo } from "../lib/curves";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main>
        <Hero />
        <Path />
        <Why />
        <BottomCta />
      </main>
      <Footer />
    </div>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      Motion<span className="text-brand-600">Lab</span>
    </span>
  );
}

function Nav() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link to="/" className="text-2xl text-ink">
        <Wordmark />
      </Link>
      <nav className="flex items-center gap-1 sm:gap-3">
        <Link
          to="/signin"
          className="rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:text-ink"
        >
          Sign in
        </Link>
        <Link
          to="/signup"
          className="rounded-lg bg-ink px-4 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Start learning
        </Link>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-6 sm:px-8 sm:pb-24 sm:pt-12 lg:grid-cols-[1.05fr_1fr]">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">
          AP Physics C · Kinematics
        </span>
        <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Motion you can
          <br />
          <span className="text-brand-600">actually feel.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
          Master AP Physics C kinematics with interactive graphs, simulations,
          and instant feedback.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="rounded-xl bg-brand-600 px-6 py-3.5 text-center text-base font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Create your free account
          </Link>
          <Link
            to="/signin"
            className="rounded-xl border border-slate-300 px-6 py-3.5 text-center text-base font-semibold text-slate-700 transition hover:border-slate-400"
          >
            I already have an account
          </Link>
        </div>
        <p className="mt-4 font-mono text-xs text-slate-400">
          7 lessons · derivatives, integrals &amp; 2D motion · built for the AP
          exam
        </p>
      </div>

      <HeroMotionDemo />
    </section>
  );
}

/**
 * Signature element: a particle traces a real position–time curve while a live
 * tangent and readout show that instantaneous velocity *is* the slope. The
 * subject of the course demonstrating itself.
 */
function HeroMotionDemo() {
  const reduced = usePrefersReducedMotion();
  const curve = getCurve("scurveSin");
  const T_MAX = 6;
  const X_MAX = 8.6;

  const [t, setT] = useState(reduced ? 2.4 : 0);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let start = 0;
    const period = 5600;
    const loop = (ts: number) => {
      if (!start) start = ts;
      const u = ((ts - start) % period) / period;
      setT(u * T_MAX);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const W = 520;
  const H = 380;
  const pad = { l: 50, r: 22, t: 26, b: 42 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const tx = (tt: number) => pad.l + (tt / T_MAX) * plotW;
  const xy = (xx: number) => pad.t + plotH - (xx / X_MAX) * plotH;

  const N = 140;
  const sample = (a: number, b: number) => {
    let d = "";
    for (let i = 0; i <= N; i++) {
      const tt = a + ((b - a) * i) / N;
      d += `${i === 0 ? "M" : "L"} ${tx(tt).toFixed(1)} ${xy(curve.x(tt)).toFixed(1)} `;
    }
    return d;
  };

  const v = curve.v(t);
  const px = tx(t);
  const py = xy(curve.x(t));
  // Tangent segment in data space → pixels (shows the slope = velocity).
  const span = 1.0;
  const t1 = Math.max(0, t - span);
  const t2 = Math.min(T_MAX, t + span);
  const tanX1 = tx(t1);
  const tanY1 = xy(curve.x(t) + v * (t1 - t));
  const tanX2 = tx(t2);
  const tanY2 = xy(curve.x(t) + v * (t2 - t));

  const gridT = [0, 1, 2, 3, 4, 5, 6];
  const gridX = [0, 2, 4, 6, 8];

  return (
    <div className="relative">
      <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-brand-200/30 blur-3xl" />
      <div className="overflow-hidden rounded-3xl bg-[#0b1220] p-4 shadow-2xl ring-1 ring-white/10 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
            position vs. time
          </span>
          <span className="rounded-md bg-white/5 px-2.5 py-1 font-mono text-sm font-semibold text-cyan-300">
            v = {roundTo(v, 1).toFixed(1)} m/s
          </span>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="A point moving along a position–time curve with a live tangent line showing its velocity."
        >
          <defs>
            <linearGradient id="trail" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1f7aff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="1" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {gridT.map((g) => (
            <line
              key={`gt${g}`}
              x1={tx(g)}
              y1={pad.t}
              x2={tx(g)}
              y2={pad.t + plotH}
              stroke="rgba(148,163,184,0.12)"
              strokeWidth={1}
            />
          ))}
          {gridX.map((g) => (
            <line
              key={`gx${g}`}
              x1={pad.l}
              y1={xy(g)}
              x2={pad.l + plotW}
              y2={xy(g)}
              stroke="rgba(148,163,184,0.12)"
              strokeWidth={1}
            />
          ))}

          {/* Axes */}
          <line
            x1={pad.l}
            y1={pad.t + plotH}
            x2={pad.l + plotW}
            y2={pad.t + plotH}
            stroke="rgba(148,163,184,0.5)"
            strokeWidth={1.5}
          />
          <line
            x1={pad.l}
            y1={pad.t}
            x2={pad.l}
            y2={pad.t + plotH}
            stroke="rgba(148,163,184,0.5)"
            strokeWidth={1.5}
          />
          {gridT.map((g) => (
            <text
              key={`lt${g}`}
              x={tx(g)}
              y={pad.t + plotH + 18}
              textAnchor="middle"
              className="font-mono"
              fontSize="11"
              fill="rgba(148,163,184,0.8)"
            >
              {g}
            </text>
          ))}
          <text
            x={pad.l + plotW}
            y={pad.t + plotH + 34}
            textAnchor="end"
            className="font-mono"
            fontSize="10"
            fill="rgba(148,163,184,0.6)"
          >
            time (s)
          </text>
          <text
            x={pad.l - 8}
            y={pad.t + 4}
            textAnchor="end"
            className="font-mono"
            fontSize="10"
            fill="rgba(148,163,184,0.6)"
          >
            x (m)
          </text>

          {/* Full curve (faint) and the traveled portion (bright) */}
          <path d={sample(0, T_MAX)} fill="none" stroke="rgba(148,163,184,0.28)" strokeWidth={2} />
          <path
            d={sample(0, Math.max(0.001, t))}
            fill="none"
            stroke="url(#trail)"
            strokeWidth={3.5}
            strokeLinecap="round"
            filter="url(#glow)"
          />

          {/* Tangent line = instantaneous velocity */}
          <line
            x1={tanX1}
            y1={tanY1}
            x2={tanX2}
            y2={tanY2}
            stroke="#fbbf24"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinecap="round"
          />

          {/* Guide down to the time axis */}
          <line
            x1={px}
            y1={py}
            x2={px}
            y2={pad.t + plotH}
            stroke="rgba(56,189,248,0.35)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* The moving particle */}
          <circle cx={px} cy={py} r={6.5} fill="#fff" filter="url(#glow)" />
          <circle cx={px} cy={py} r={11} fill="none" stroke="#38bdf8" strokeWidth={1.5} opacity={0.6} />
        </svg>

        <p className="mt-2 px-1 font-mono text-[11px] leading-relaxed text-slate-400">
          {reduced
            ? "The slope of this curve is the velocity at that instant."
            : "Watch the gold tangent tilt — its steepness is the velocity."}
        </p>
      </div>
    </div>
  );
}

function Path() {
  return (
    <section className="border-y border-slate-200 bg-slate-50/60 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            One path, start to mastery
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Each lesson unlocks the next, so concepts build instead of piling
            up. Your progress saves automatically — leave any time and pick up
            exactly where you stopped.
          </p>
        </div>

        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {course.lessons.map((lesson, i) => (
            <li
              key={lesson.id}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                  i === 0
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {String(lesson.order).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="font-display font-semibold leading-snug text-ink">
                  {lesson.title}
                </h3>
                {lesson.subtitle && (
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    {lesson.subtitle}
                  </p>
                )}
                {i === 0 && (
                  <span className="mt-2 inline-block font-mono text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                    Start here
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Why() {
  const items = [
    {
      k: "Do, don't watch",
      title: "Every step is interactive",
      body: "Drag tangent lines, shade the area under a velocity curve, and launch projectiles. The math happens under your hands.",
    },
    {
      k: "Know instantly",
      title: "Feedback the moment you answer",
      body: "Each question explains why your answer works or doesn't — so a wrong guess turns into the thing you actually remember.",
    },
    {
      k: "Keep going",
      title: "Streaks, mastery & milestones",
      body: "See your mastery on every lesson, build a daily streak, and earn milestones as the course opens up.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <div className="grid gap-8 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.k} className="border-t-2 border-ink pt-5">
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-brand-600">
              {it.k}
            </span>
            <h3 className="mt-3 font-display text-xl font-semibold text-ink">
              {it.title}
            </h3>
            <p className="mt-2 leading-relaxed text-slate-600">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BottomCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-14 text-center sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.6) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start with Lesson 1 today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Position, velocity, and acceleration — finally connected. It's free
            to begin.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="rounded-xl bg-brand-600 px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-brand-500"
            >
              Create your free account
            </Link>
            <Link
              to="/signin"
              className="rounded-xl border border-white/25 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-slate-500 sm:flex-row sm:px-8">
        <Wordmark className="text-base text-ink" />
        <span className="font-mono text-xs">
          AP Physics C Kinematics, learned by doing.
        </span>
      </div>
    </footer>
  );
}
