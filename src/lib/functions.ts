// Generic time-functions used by velocity/acceleration plots in Lessons 2-4.
// Kept as named presets so lesson content stays declarative and reviewable.

export type PlotPreset =
  | "vConstantPos" // v = 4
  | "vAccelPos" // v = 1 + 1.5t  (positive v, positive a -> speeding up)
  | "vDecelToNeg" // v = 8 - 2t   (crosses zero at t=4)
  | "vTriangleUp"; // v = 2t

const PLOTS: Record<PlotPreset, (t: number) => number> = {
  vConstantPos: () => 4,
  vAccelPos: (t) => 1 + 1.5 * t,
  vDecelToNeg: (t) => 8 - 2 * t,
  vTriangleUp: (t) => 2 * t,
};

export function getPlotFn(preset: PlotPreset): (t: number) => number {
  return PLOTS[preset];
}

/** Numerical net (signed) integral of f over [a, b] via the trapezoid rule. */
export function integrate(
  f: (t: number) => number,
  a: number,
  b: number,
  steps = 600,
): number {
  if (b === a) return 0;
  const sign = b > a ? 1 : -1;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const h = (hi - lo) / steps;
  let sum = 0.5 * (f(lo) + f(hi));
  for (let i = 1; i < steps; i++) sum += f(lo + i * h);
  return sign * sum * h;
}

/** Total distance = integral of |f| (always positive). */
export function totalDistance(
  f: (t: number) => number,
  a: number,
  b: number,
  steps = 600,
): number {
  return integrate((t) => Math.abs(f(t)), a, b, steps);
}
