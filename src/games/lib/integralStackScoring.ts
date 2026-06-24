// Pure, unit-testable helpers for the "Integral Stack" practice game (Lesson 4).
//
// The game integrates a piecewise-constant acceleration profile up the stack:
//   v(t) = v0 + ∫a dt      x(t) = x0 + ∫v dt
// Each segment uses the constant-acceleration equations exactly, so these
// helpers double as a check on v = v0 + a·t and x = x0 + v0·t + ½·a·t².

/** A constant-acceleration segment lasting `duration` seconds. */
export interface AccelSegment {
  a: number;
  duration: number;
}

/** Total elapsed time of a piecewise-constant acceleration profile. */
export function totalDuration(segments: AccelSegment[]): number {
  return segments.reduce((sum, seg) => sum + seg.duration, 0);
}

/**
 * Velocity at time `t` for an initial velocity `v0` integrated through a
 * piecewise-constant acceleration profile (v = v0 + ∫a dt).
 */
export function velocityAtTime(
  v0: number,
  segments: AccelSegment[],
  t: number,
): number {
  let v = v0;
  let elapsed = 0;
  for (const seg of segments) {
    if (t <= elapsed) break;
    const dt = Math.min(seg.duration, t - elapsed);
    v += seg.a * dt;
    elapsed += seg.duration;
  }
  return v;
}

/**
 * Position at time `t` for initial conditions `x0`, `v0` integrated through a
 * piecewise-constant acceleration profile (x = x0 + ∫v dt). Within each
 * segment this is the exact constant-acceleration result x += v·dt + ½·a·dt².
 */
export function positionAtTime(
  x0: number,
  v0: number,
  segments: AccelSegment[],
  t: number,
): number {
  let x = x0;
  let v = v0;
  let elapsed = 0;
  for (const seg of segments) {
    if (t <= elapsed) break;
    const dt = Math.min(seg.duration, t - elapsed);
    x += v * dt + 0.5 * seg.a * dt * dt;
    v += seg.a * dt;
    elapsed += seg.duration;
  }
  return x;
}

/** Final velocity at the end of the whole profile. */
export function finalVelocity(v0: number, segments: AccelSegment[]): number {
  return velocityAtTime(v0, segments, totalDuration(segments));
}

/** Final position at the end of the whole profile. */
export function finalPosition(
  x0: number,
  v0: number,
  segments: AccelSegment[],
): number {
  return positionAtTime(x0, v0, segments, totalDuration(segments));
}

/**
 * Maps the gap between an achieved value and its target to a 0–100 score.
 * A perfect match scores 100; a gap of `scale` (or larger) scores 0.
 */
export function targetScore(
  actual: number,
  target: number,
  scale: number,
): number {
  if (scale <= 0) return actual === target ? 100 : 0;
  const frac = Math.max(0, Math.min(1, 1 - Math.abs(actual - target) / scale));
  return Math.round(frac * 100);
}

/** Average of the supplied sub-scores, rounded to a 0–100 integer. */
export function blendScore(parts: number[]): number {
  if (parts.length === 0) return 0;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

/** Whether an achieved value is within `tol` of its target (snaps green). */
export function isHit(actual: number, target: number, tol: number): boolean {
  return Math.abs(actual - target) <= tol;
}
