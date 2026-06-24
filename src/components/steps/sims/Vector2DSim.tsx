import { useEffect, useRef, useState } from "react";
import { Arrow } from "../../graph/Arrow";
import { roundTo } from "../../../lib/curves";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";

const W = 320;
const H = 280;
const PAD = 24;
const PLOT = Math.min(W, H) - PAD * 2;

const DOMAIN = 6; // plane spans [-6, 6] in both axes
const R = 4; // radius of circular motion
const OMEGA = 1; // angular speed (rad/s)

/**
 * Uniform circular motion: shows the position vector r, the velocity vector v
 * (tangent), and the acceleration vector a (toward the center), with live
 * component readouts. Demonstrates 2D motion as two linked 1D motions.
 */
export function Vector2DSim() {
  const [theta, setTheta] = useState(0.6);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      setTheta(((ts - startRef.current) / 1000) * OMEGA);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  // Map graph coords (-DOMAIN..DOMAIN) to pixels.
  const gx = (x: number) => PAD + ((x + DOMAIN) / (2 * DOMAIN)) * PLOT;
  const gy = (y: number) => PAD + ((DOMAIN - y) / (2 * DOMAIN)) * PLOT;

  const x = R * Math.cos(theta);
  const y = R * Math.sin(theta);
  const vx = -R * OMEGA * Math.sin(theta);
  const vy = R * OMEGA * Math.cos(theta);
  const ax = -R * OMEGA * OMEGA * Math.cos(theta);
  const ay = -R * OMEGA * OMEGA * Math.sin(theta);

  const vScale = 1.2;
  const aScale = 0.8;

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl bg-white"
        role="img"
        aria-label="Object moving in a circle with velocity and acceleration vectors"
      >
        {/* axes */}
        <line x1={gx(-DOMAIN)} y1={gy(0)} x2={gx(DOMAIN)} y2={gy(0)} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={gx(0)} y1={gy(-DOMAIN)} x2={gx(0)} y2={gy(DOMAIN)} stroke="#cbd5e1" strokeWidth={1} />
        {/* circular path */}
        <circle cx={gx(0)} cy={gy(0)} r={(R / (2 * DOMAIN)) * PLOT} fill="none" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="4 3" />

        {/* position vector */}
        <Arrow x1={gx(0)} y1={gy(0)} x2={gx(x)} y2={gy(y)} color="#94a3b8" width={2} label="position vector" />
        {/* velocity vector (tangent) */}
        <Arrow x1={gx(x)} y1={gy(y)} x2={gx(x + vx * vScale)} y2={gy(y + vy * vScale)} color="#1f7aff" label="velocity vector" />
        {/* acceleration vector (toward center) */}
        <Arrow x1={gx(x)} y1={gy(y)} x2={gx(x + ax * aScale)} y2={gy(y + ay * aScale)} color="#ef4444" label="acceleration vector" />

        {/* object */}
        <circle cx={gx(x)} cy={gy(y)} r={6} fill="#0f172a" />

        <text x={gx(DOMAIN) - 6} y={gy(0) - 6} fontSize={10} textAnchor="end" className="fill-slate-400">x</text>
        <text x={gx(0) + 6} y={gy(DOMAIN) + 10} fontSize={10} className="fill-slate-400">y</text>
      </svg>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Legend color="#94a3b8" label="r (position)" />
        <Legend color="#1f7aff" label="v (velocity)" />
        <Legend color="#ef4444" label="a (acceleration)" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <Component label="position" x={roundTo(x, 1)} y={roundTo(y, 1)} testid="pos" />
        <Component label="velocity" x={roundTo(vx, 1)} y={roundTo(vy, 1)} testid="vel" />
        <Component label="accel." x={roundTo(ax, 1)} y={roundTo(ay, 1)} testid="acc" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}

function Component({
  label,
  x,
  y,
  testid,
}: {
  label: string;
  x: number;
  y: number;
  testid: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2" data-testid={testid}>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-mono text-xs">
        x: {x}
        <br />y: {y}
      </div>
    </div>
  );
}
