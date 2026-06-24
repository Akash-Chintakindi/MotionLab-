// Pure helpers for the "Acceleration Pilot" game so scoring is unit-testable.
//
// The player controls an ACCELERATION profile (piecewise-constant a over each
// second). The engine integrates a -> v starting from v0 using the kinematic
// update v[k+1] = v[k] + a*dt, and we grade the produced velocity curve against
// a target velocity curve with RMS error -> 0..100. This mirrors driveScoring
// (which controls velocity and matches position) but one derivative "up".

/**
 * Integrates a piecewise-constant acceleration profile into a velocity curve.
 * Returns boundary velocities (length = accelerations.length + 1).
 */
export function integrateAccelerations(
  accelerations: number[],
  dt: number,
  v0 = 0,
): number[] {
  const curve = [v0];
  let v = v0;
  for (const a of accelerations) {
    v += a * dt;
    curve.push(v);
  }
  return curve;
}

/** Per-segment acceleration that reproduces a target boundary velocity curve. */
export function idealAccelerations(
  targetVelocities: number[],
  dt: number,
): number[] {
  const out: number[] = [];
  for (let i = 1; i < targetVelocities.length; i++) {
    out.push((targetVelocities[i] - targetVelocities[i - 1]) / dt);
  }
  return out;
}

/** Root-mean-square difference between two equal-length velocity curves. */
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
 * Maps an RMS velocity error to a 0–100 score. A perfect match scores 100;
 * an error of `scale` (or worse) scores 0.
 */
export function errorToScore(rms: number, scale: number): number {
  if (scale <= 0) return rms === 0 ? 100 : 0;
  const frac = Math.max(0, Math.min(1, 1 - rms / scale));
  return Math.round(frac * 100);
}

/** Convenience: score an acceleration profile against a target velocity curve. */
export function scoreProfile(
  accelerations: number[],
  targetVelocities: number[],
  dt: number,
  scale: number,
): number {
  const produced = integrateAccelerations(accelerations, dt, targetVelocities[0]);
  return errorToScore(rmsError(produced, targetVelocities), scale);
}
