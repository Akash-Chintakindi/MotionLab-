// Pure, unit-testable helpers for the "Area Painter" game (Lesson 3).
//
// The game asks the learner to drag an interval [a, b] under a velocity curve
// so the signed area (net displacement, Δx = ∫v dt) lands on a target value.
// Scoring rewards closeness of the chosen net area to the target.

import { integrate, totalDistance } from "../../lib/functions";

/** Net (signed) displacement Δx = ∫ v dt over [a, b]. */
export function netDisplacement(
  v: (t: number) => number,
  a: number,
  b: number,
): number {
  return integrate(v, a, b);
}

/** Total distance travelled = ∫ |v| dt over [a, b] (never negative). */
export function distanceTravelled(
  v: (t: number) => number,
  a: number,
  b: number,
): number {
  return totalDistance(v, a, b);
}

/**
 * Maps the distance between the chosen net area and the target to a 0–100
 * score. A perfect hit scores 100; being off by `scale` (or more) scores 0.
 * Falls linearly in between.
 */
export function closenessScore(
  net: number,
  target: number,
  scale: number,
): number {
  if (scale <= 0) return net === target ? 100 : 0;
  const frac = Math.max(0, Math.min(1, 1 - Math.abs(net - target) / scale));
  return Math.round(frac * 100);
}

/** Convenience: score an interval choice directly against a target net area. */
export function scoreInterval(
  v: (t: number) => number,
  a: number,
  b: number,
  target: number,
  scale: number,
): number {
  return closenessScore(netDisplacement(v, a, b), target, scale);
}

/** Overall best = average of the best score earned in each round (0–100). */
export function overallBest(bestByRound: number[]): number {
  if (bestByRound.length === 0) return 0;
  return Math.round(
    bestByRound.reduce((sum, s) => sum + s, 0) / bestByRound.length,
  );
}
