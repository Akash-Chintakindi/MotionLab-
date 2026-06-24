// Pure, unit-testable physics + scoring helpers for the "Cannon Range" game.
//
// Conventions (kept consistent with Lesson 6 + ProjectileSim):
//   - gravity g = 10 m/s² (downward)
//   - launch from the origin (0, 0)
//   - x(t) = v·cosθ·t          (constant horizontal velocity)
//   - y(t) = v·sinθ·t − ½·g·t² (constant vertical acceleration)
// Angles are passed in DEGREES; the helpers convert internally.

export const G_DEFAULT = 10;

export interface Vec {
  x: number;
  y: number;
}

/** A point the player is trying to hit. y > 0 means it sits on a raised platform. */
export type Target = Vec;

/** A vertical obstacle the shot must clear (height measured from the ground). */
export interface Wall {
  x: number;
  height: number;
}

/** Everything needed to score a single shot at a round. */
export interface ShotConfig {
  target: Target;
  /** A landing/path within this distance of the target is a direct hit (100). */
  tolerance: number;
  /** Distance (beyond tolerance) at which the score decays to 0. */
  scale: number;
  /** Optional wall: a shot that fails to clear it scores 0. */
  wall?: Wall;
}

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Initial velocity components for a launch speed + angle. */
export function components(speed: number, angleDeg: number): Vec {
  const rad = toRadians(angleDeg);
  return { x: speed * Math.cos(rad), y: speed * Math.sin(rad) };
}

/** Time to return to launch height y = 0 (flat-ground time of flight). */
export function timeOfFlight(
  speed: number,
  angleDeg: number,
  g: number = G_DEFAULT,
): number {
  const vy = speed * Math.sin(toRadians(angleDeg));
  return (2 * vy) / g;
}

/** Horizontal distance covered before returning to launch height. */
export function range(
  speed: number,
  angleDeg: number,
  g: number = G_DEFAULT,
): number {
  const vx = speed * Math.cos(toRadians(angleDeg));
  return vx * timeOfFlight(speed, angleDeg, g);
}

/** Maximum height reached: depends only on the vertical component. */
export function peakHeight(
  speed: number,
  angleDeg: number,
  g: number = G_DEFAULT,
): number {
  const vy = speed * Math.sin(toRadians(angleDeg));
  return (vy * vy) / (2 * g);
}

/** Position on the trajectory at time t (may be below ground for t past flight). */
export function trajectoryPoint(
  speed: number,
  angleDeg: number,
  t: number,
  g: number = G_DEFAULT,
): Vec {
  const rad = toRadians(angleDeg);
  return {
    x: speed * Math.cos(rad) * t,
    y: speed * Math.sin(rad) * t - 0.5 * g * t * t,
  };
}

/**
 * Closest the trajectory ever passes to the target, sampled densely from launch
 * until the projectile returns to the ground (y = 0). This rewards a path that
 * sweeps near an elevated target even if the eventual landing is elsewhere.
 */
export function minDistanceToTarget(
  speed: number,
  angleDeg: number,
  target: Target,
  g: number = G_DEFAULT,
  samples = 400,
): number {
  const tof = timeOfFlight(speed, angleDeg, g);
  if (tof <= 0) {
    // Degenerate launch (no vertical component): just measure the origin.
    return Math.hypot(target.x, target.y);
  }
  let best = Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = (tof * i) / samples;
    const p = trajectoryPoint(speed, angleDeg, t, g);
    const d = Math.hypot(p.x - target.x, p.y - target.y);
    if (d < best) best = d;
  }
  return best;
}

/** Trajectory height at the wall's horizontal position (NaN if it never reaches it). */
export function heightAtX(
  speed: number,
  angleDeg: number,
  x: number,
  g: number = G_DEFAULT,
): number {
  const vx = speed * Math.cos(toRadians(angleDeg));
  if (vx <= 0) return Number.NaN;
  const t = x / vx;
  return trajectoryPoint(speed, angleDeg, t, g).y;
}

/** Whether the shot is high enough to pass over the wall. */
export function clearsWall(
  speed: number,
  angleDeg: number,
  wall: Wall,
  g: number = G_DEFAULT,
): boolean {
  const y = heightAtX(speed, angleDeg, wall.x, g);
  return Number.isFinite(y) && y >= wall.height;
}

/**
 * Maps a miss distance to a 0–100 score. A hit within `tolerance` is full marks;
 * the score falls linearly to 0 at `tolerance + scale`.
 */
export function distanceToScore(
  dist: number,
  tolerance: number,
  scale: number,
): number {
  if (dist <= tolerance) return 100;
  if (scale <= 0) return 0;
  const frac = Math.max(0, 1 - (dist - tolerance) / scale);
  return Math.round(frac * 100);
}

/** Score a single shot at a round (0–100). A blocked shot scores 0. */
export function scoreShot(
  speed: number,
  angleDeg: number,
  config: ShotConfig,
  g: number = G_DEFAULT,
): number {
  if (config.wall && !clearsWall(speed, angleDeg, config.wall, g)) return 0;
  const dist = minDistanceToTarget(speed, angleDeg, config.target, g);
  return distanceToScore(dist, config.tolerance, config.scale);
}

/** Overall score: the average of the best score from each round (0–100). */
export function overallScore(bestByRound: number[]): number {
  if (bestByRound.length === 0) return 0;
  const sum = bestByRound.reduce((a, b) => a + b, 0);
  return Math.round(sum / bestByRound.length);
}
