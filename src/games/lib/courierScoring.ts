// Pure helpers for the "Coordinate Courier" game so scoring is unit-testable.
//
// A delivery drone moves on a 2D plane following independent x and y motions:
//   x(t) = x0 + v_x*t + ½*a_x*t²
//   y(t) = y0 + v_y*t + ½*a_y*t²
// The player tunes the initial components (and, later, an acceleration) to route
// the drone onto target waypoints at specific times. Scoring grades how close
// the drone passes to each waypoint at its scheduled time.

export interface DroneState {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
}

export interface Waypoint {
  /** Time (s) at which the drone should be at (x, y). */
  t: number;
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Drone position at time t — x and y evolve as two independent 1D motions. */
export function dronePosition(state: DroneState, t: number): Point {
  return {
    x: state.x0 + state.vx * t + 0.5 * state.ax * t * t,
    y: state.y0 + state.vy * t + 0.5 * state.ay * t * t,
  };
}

/** Straight-line (Euclidean) distance from the drone to a waypoint at its time. */
export function distanceToWaypoint(state: DroneState, wp: Waypoint): number {
  const p = dronePosition(state, wp.t);
  return Math.hypot(p.x - wp.x, p.y - wp.y);
}

/**
 * Maps a miss distance to a 0–100 score. Landing within `tolerance` earns full
 * marks; the score then decays linearly to 0 once the miss exceeds
 * `tolerance + scale`.
 */
export function closenessScore(
  distance: number,
  tolerance: number,
  scale: number,
): number {
  if (distance <= tolerance) return 100;
  if (scale <= 0) return 0;
  const frac = Math.max(0, Math.min(1, 1 - (distance - tolerance) / scale));
  return Math.round(frac * 100);
}

/** Average closeness across every waypoint in a round → 0–100. */
export function scoreRound(
  state: DroneState,
  waypoints: Waypoint[],
  tolerance: number,
  scale: number,
): number {
  if (waypoints.length === 0) return 0;
  const total = waypoints.reduce(
    (acc, wp) =>
      acc + closenessScore(distanceToWaypoint(state, wp), tolerance, scale),
    0,
  );
  return Math.round(total / waypoints.length);
}

/** A waypoint counts as "delivered" when the drone is within tolerance of it. */
export function isDelivered(
  state: DroneState,
  wp: Waypoint,
  tolerance: number,
): boolean {
  return distanceToWaypoint(state, wp) <= tolerance;
}

/** Samples the trajectory into `steps + 1` points for drawing the flight path. */
export function trajectoryPoints(
  state: DroneState,
  tMax: number,
  steps: number,
): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    out.push(dronePosition(state, (i / steps) * tMax));
  }
  return out;
}
