import type { CurvePreset } from "../types/content";

export interface Curve {
  /** position x as a function of time t */
  x: (t: number) => number;
  /** exact instantaneous velocity v = dx/dt */
  v: (t: number) => number;
}

const CURVES: Record<CurvePreset, Curve> = {
  // Steepest in the middle, highest position at the end.
  // Great for separating "fastest" (slope) from "highest" (position).
  scurveSin: {
    x: (t) => 4 - 4 * Math.cos((t * Math.PI) / 6),
    v: (t) => ((4 * Math.PI) / 6) * Math.sin((t * Math.PI) / 6),
  },
  // Positive velocity, then zero at t=3, then negative velocity.
  parabolaDown: {
    x: (t) => 6 * t - t * t,
    v: (t) => 6 - 2 * t,
  },
  // Constantly speeding up from rest.
  accelerating: {
    x: (t) => 0.25 * t * t,
    v: (t) => 0.5 * t,
  },
  linearUp: {
    x: (t) => 1.5 * t,
    v: () => 1.5,
  },
  linearDown: {
    x: (t) => 12 - 1.5 * t,
    v: () => -1.5,
  },
  // Simple harmonic motion: x(t) = A·cos(ωt) with A = 2 m and ω = 1 rad/s.
  // Velocity is its derivative, v(t) = −Aω·sin(ωt) = −2·sin(t). Oscillates
  // about zero, so use symmetric y-bounds (e.g. xMin = −3, xMax = 3).
  cosineWave: {
    x: (t) => 2 * Math.cos(t),
    v: (t) => -2 * Math.sin(t),
  },
};

export function getCurve(preset: CurvePreset): Curve {
  return CURVES[preset];
}

/** Average velocity (secant slope) between two times on a curve. */
export function averageVelocity(
  curve: Curve,
  t1: number,
  t2: number,
): number {
  if (t2 === t1) return curve.v(t1);
  return (curve.x(t2) - curve.x(t1)) / (t2 - t1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Evenly spaced "nice" axis tick values (…1, 2, 5, 10…) covering [min, max].
 * Used to label graph axes so learners can read values off the grid.
 */
export function niceTicks(min: number, max: number, target = 6): number[] {
  if (!(max > min)) return [min];
  const rawStep = (max - min) / target;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const start = Math.ceil(min / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(roundTo(v, 6));
  return ticks;
}
