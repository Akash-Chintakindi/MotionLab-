import { useEffect, useMemo, useRef, useState } from "react";
import type { SliderSimulationConfig } from "../../../types/content";
import { Slider } from "../../Slider";
import { roundTo } from "../../../lib/curves";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";

const W = 340;
const H = 240;
const PAD = { left: 34, right: 12, top: 12, bottom: 28 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const G = 10;

/**
 * Projectile launcher. The trajectory, stats, and animated ball update
 * continuously as the learner drags the angle/speed sliders. Horizontal motion
 * is constant velocity; vertical motion is constant acceleration (gravity).
 */
export function ProjectileSim({ config }: { config: SliderSimulationConfig }) {
  const [angle, setAngle] = useState(config.a ?? 45); // degrees
  const [speed, setSpeed] = useState(config.v0 ?? 20);
  const [simT, setSimT] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const rad = (angle * Math.PI) / 180;
  const vx = speed * Math.cos(rad);
  const vy = speed * Math.sin(rad);
  const tof = (2 * vy) / G;
  const range = vx * tof;
  const peak = (vy * vy) / (2 * G);

  // Continuously loop the flight so the ball keeps moving as sliders change.
  useEffect(() => {
    if (reducedMotion) {
      setSimT(tof / 2);
      return;
    }
    startRef.current = null;
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const t = ((ts - startRef.current) / 1000) % Math.max(tof, 0.5);
      setSimT(t);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tof, reducedMotion]);

  const xMax = Math.max(range * 1.1, 5);
  const yMax = Math.max(peak * 1.25, 5);

  const gx = (x: number) => PAD.left + (x / xMax) * PLOT_W;
  const gy = (y: number) => PAD.top + PLOT_H - (y / yMax) * PLOT_H;

  const path = useMemo(() => {
    const N = 60;
    let d = "";
    for (let i = 0; i <= N; i++) {
      const t = (tof * i) / N;
      const x = vx * t;
      const y = vy * t - 0.5 * G * t * t;
      d += `${i === 0 ? "M" : "L"}${roundTo(gx(x), 1)},${roundTo(gy(Math.max(y, 0)), 1)} `;
    }
    return d.trim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vx, vy, tof, xMax, yMax]);

  const ballX = vx * simT;
  const ballY = Math.max(vy * simT - 0.5 * G * simT * simT, 0);

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-white" role="img" aria-label="Projectile trajectory">
        {/* ground + axes */}
        <line x1={PAD.left} y1={gy(0)} x2={PAD.left + PLOT_W} y2={gy(0)} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={gy(0)} stroke="#94a3b8" strokeWidth={1.5} />
        <text x={PAD.left + PLOT_W / 2} y={H - 6} textAnchor="middle" fontSize={10} className="fill-slate-500">horizontal distance (m)</text>

        <path d={path} fill="none" stroke="#1f7aff" strokeWidth={2.5} />
        {/* peak marker */}
        <circle cx={gx(range / 2)} cy={gy(peak)} r={3} fill="#10b981" />
        <circle cx={gx(ballX)} cy={gy(ballY)} r={6} fill="#ef4444" data-testid="projectile-ball" />
      </svg>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <Stat label="Time of flight" value={`${roundTo(tof, 1)} s`} testid="tof" />
        <Stat label="Peak height" value={`${roundTo(peak, 1)} m`} testid="peak" />
        <Stat label="Range" value={`${roundTo(range, 1)} m`} testid="range" />
      </div>

      <div className="space-y-3 pt-1">
        <Slider label="Launch angle" value={angle} min={10} max={80} step={1} unit="°" onChange={setAngle} />
        <Slider label="Launch speed" value={speed} min={5} max={25} step={1} unit="m/s" onChange={setSpeed} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Drag either slider — the trajectory updates live. Using g = {G} m/s²; air resistance is ignored.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  testid,
}: {
  label: string;
  value: string;
  testid: string;
}) {
  return (
    <div className="rounded-xl bg-slate-100 px-2 py-2 text-center dark:bg-slate-800" data-testid={testid}>
      <div className="text-[11px] text-slate-600 dark:text-slate-300">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
