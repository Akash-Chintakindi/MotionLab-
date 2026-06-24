// Pure helpers for the "Drive the Cart" game so scoring is unit-testable.

/**
 * Integrates a piecewise-constant velocity profile into a position path.
 * Returns boundary positions (length = velocities.length + 1).
 */
export function integrateVelocities(
  velocities: number[],
  dt: number,
  x0 = 0,
): number[] {
  const path = [x0];
  let x = x0;
  for (const v of velocities) {
    x += v * dt;
    path.push(x);
  }
  return path;
}

/** Per-segment average velocity that reproduces a target boundary path. */
export function idealVelocities(
  targetBoundaries: number[],
  dt: number,
): number[] {
  const out: number[] = [];
  for (let i = 1; i < targetBoundaries.length; i++) {
    out.push((targetBoundaries[i] - targetBoundaries[i - 1]) / dt);
  }
  return out;
}

/** Root-mean-square difference between two equal-length position paths. */
export function rmsError(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum / n);
}

/**
 * Maps an RMS position error to a 0–100 score. A perfect match scores 100;
 * an error of `scale` (or worse) scores 0.
 */
export function errorToScore(rms: number, scale: number): number {
  if (scale <= 0) return rms === 0 ? 100 : 0;
  const frac = Math.max(0, Math.min(1, 1 - rms / scale));
  return Math.round(frac * 100);
}

/** Convenience: score a velocity profile against a target boundary path. */
export function scoreProfile(
  velocities: number[],
  targetBoundaries: number[],
  dt: number,
  scale: number,
): number {
  const produced = integrateVelocities(velocities, dt, targetBoundaries[0]);
  return errorToScore(rmsError(produced, targetBoundaries), scale);
}
