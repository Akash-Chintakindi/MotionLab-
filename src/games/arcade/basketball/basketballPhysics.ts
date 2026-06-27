import type { Vec2 } from "../types";
import type { Layout } from "./basketballLayout";
import type { BankDifficulty } from "../../../content/practiceBank/types";

// ---------------------------------------------------------------------------
// Pure physics + game math for the front-facing basketball game. Angles are in
// RADIANS measured from the +x axis in a y-UP sense (so π/2 = straight up,
// < π/2 leans right, > π/2 leans left). Screen space has y growing DOWNWARD, so
// a launch with upward velocity has a NEGATIVE screen vy.
//
// The shot is a genuine projectile: given a launch direction + speed from the
// ball's position, we integrate gravity and check whether the descending path
// passes through the rim (swish), clips it (rattle in / bank / clank out), or
// misses. Aim AND power both matter — pointing the arc at the hoop sets the
// direction; nailing the power sets the speed that actually drops it in.
// ---------------------------------------------------------------------------

// --- timed-question economy (unchanged contract) ---------------------------

/** Time (s) added for a correct answer, by difficulty. */
export const TIME_BONUS: Record<BankDifficulty, number> = {
  easy: 2,
  medium: 5,
  hard: 10,
};

/** Time (s) removed for a wrong answer. */
export const WRONG_PENALTY = 5;

/** Selectable session lengths, in seconds. */
export const TIME_LIMITS = [30, 60, 120] as const;
export type TimeLimit = (typeof TIME_LIMITS)[number];

/** Seconds between question prompts. */
export const QUESTION_INTERVAL = 15;

/** Clamps remaining time to [0, ∞); a session ends when it hits 0. */
export function applyTimeDelta(remaining: number, delta: number): number {
  return Math.max(0, remaining + delta);
}

// --- aim --------------------------------------------------------------------

export interface AimRange {
  /** Center launch direction (rad, y-up) the sweep oscillates around. */
  centerRad: number;
  /** Half-width of the sweep (rad). */
  halfRad: number;
}

const AIM_MIN = 0.34; // ~19° above horizontal — never aim flat/at the floor
const AIM_MAX = Math.PI - 0.34; // ~161°
const AIM_HALF = 0.72; // ~41° sweep either side

/**
 * The aim sweep adapts to where the ball spawned. We point the center somewhere
 * BETWEEN the straight line to the hoop and vertical (you must arc OVER and drop
 * IN, so the launch is steeper than the direct line). A ball far to the left of
 * the hoop sweeps through up-and-to-the-right directions; far right mirrors it;
 * a centered ball sweeps around straight-up.
 */
export function aimRange(ball: Vec2, hoop: Vec2): AimRange {
  const dxh = hoop.x - ball.x;
  const riseUp = Math.max(1, ball.y - hoop.y); // hoop is above ⇒ positive
  const straight = Math.atan2(riseUp, dxh); // (0, π), y-up
  // Bias strongly toward vertical (π/2) so the shot arcs HIGH and drops down
  // into the rim (a real swish) rather than firing flat at it.
  const center = Math.PI / 2 + (straight - Math.PI / 2) * 0.34;
  return {
    centerRad: clamp(center, AIM_MIN + AIM_HALF * 0.4, AIM_MAX - AIM_HALF * 0.4),
    halfRad: AIM_HALF,
  };
}

/** Current launch direction (rad) given the oscillator value osc ∈ [-1, 1]. */
export function aimAngleAt(range: AimRange, osc: number): number {
  return clamp(range.centerRad + osc * range.halfRad, AIM_MIN, AIM_MAX);
}

/** Launch velocity (screen coords) for a direction + speed. */
export function launchVelocity(dir: number, speed: number): Vec2 {
  return { x: speed * Math.cos(dir), y: -speed * Math.sin(dir) };
}

// --- ideal speed + power meter ---------------------------------------------

/**
 * The launch speed (px/s) that makes a projectile from `ball` pass exactly
 * through the hoop center for the given direction, or null if no positive speed
 * can (the direction is too shallow / points the wrong way). Derived from the
 * projectile equations:
 *   speed² = ½·g·A² / (Δy_screen + sin(dir)·A),  where A = Δx / cos(dir).
 */
export function idealSpeed(
  ball: Vec2,
  hoop: Vec2,
  dir: number,
  gravity: number,
): number | null {
  const dxh = hoop.x - ball.x;
  const dyScreen = hoop.y - ball.y; // negative (hoop above)
  const cos = Math.cos(dir);

  // Near-vertical launch to a roughly-overhead hoop: cos→0 makes A blow up.
  // Treat it as a straight-up shot whose apex must clear the rim height.
  if (Math.abs(cos) < 1e-3 || Math.abs(dxh) < 1e-3) {
    const sin = Math.sin(dir);
    if (sin < 1e-3) return null;
    // Arc clearly ABOVE the rim so the ball drops back down through it.
    const apexNeeded = Math.max(1, ball.y - hoop.y) * 1.15 + 1;
    return Math.sqrt(2 * gravity * apexNeeded) / sin;
  }

  const A = dxh / cos;
  if (A <= 0) return null; // direction points away from the hoop
  const denom = dyScreen + Math.sin(dir) * A;
  if (denom <= 0) return null; // too shallow — would need infinite speed
  const sq = (0.5 * gravity * A * A) / denom;
  if (!isFinite(sq) || sq <= 0) return null;
  return Math.sqrt(sq);
}

export function powerToSpeed(power: number, lay: Layout): number {
  return lay.speedMin + clamp01(power) * (lay.speedMax - lay.speedMin);
}

export function speedToPower(speed: number, lay: Layout): number {
  return clamp01((speed - lay.speedMin) / (lay.speedMax - lay.speedMin));
}

export interface GreenBand {
  /** Center of the green band on the 0..1 meter, or -1 if unreachable. */
  center: number;
  half: number;
}

/** The power-meter green band that corresponds to the ideal speed. */
export function greenBand(ideal: number | null, lay: Layout): GreenBand {
  if (ideal == null) return { center: -1, half: 0 };
  const center = speedToPower(ideal, lay);
  if (center < -0.001 || center > 1.001) return { center: -1, half: 0 };
  return { center: clamp01(center), half: 0.06 };
}

/** Whether a launch direction can feasibly drop the ball in (ideal in range). */
export function aimGood(ideal: number | null, lay: Layout): boolean {
  return (
    ideal != null &&
    ideal >= lay.speedMin * 0.92 &&
    ideal <= lay.speedMax * 1.06
  );
}

// --- shot simulation --------------------------------------------------------

export type ShotResult =
  | "swish"
  | "rimIn"
  | "bankIn"
  | "rimOut"
  | "short"
  | "long"
  | "wide";

export interface ShotSim {
  /** Animation polyline (includes any rim bounce / drop into the net). */
  points: Vec2[];
  result: ShotResult;
  made: boolean;
  apex: Vec2;
  /** Horizontal offset from rim center at the descending crossing (px). */
  crossDx: number;
}

const SIM_DT = 1 / 120;
const SIM_MAX_STEPS = 1400;

const MAX_RIM_CONTACTS = 2;

// Backboard front-face collision. The board is a vertical surface mounted
// behind the rim; a ball that reaches its face while still high reflects off
// it — the HORIZONTAL (depth-proxy) velocity flips and loses energy, the
// vertical velocity is only damped so the ball keeps falling under gravity.
// physics-intuition: a real board bounce sheds energy (slow-out) and sends the
// ball back the way it came, so off-angle hits carom AWAY from the hoop while
// a flush, well-paced hit banks down into the rim.
const BOARD_REST = 0.58; // horizontal coefficient of restitution
const BOARD_VKEEP = 0.72; // vertical energy retained through the contact
// How far PAST the rim center (toward the board) the ball must reach while at
// board height to count as striking the face. Clean makes crest in FRONT of
// this plane (verified against the rim geometry), so swishes never bank.
const BOARD_FACE_INSET = 0.32; // × rimRx

/**
 * Integrates a projectile from `ball` launched at `dir`/`speed` and resolves it
 * against the backboard and rim. The returned polyline is ready to animate.
 *
 * physics-intuition: the ball is a real falling mass. A near-centered descent
 * drops straight through (swish). A ball that sails too deep strikes the
 * BACKBOARD's front face and rebounds — horizontal velocity reverses with
 * energy loss, vertical is merely damped — so it caroms back the way it came;
 * a flush hit banks down into the rim, an off one kicks AWAY toward the
 * shooter. A descent that instead catches the ring RATTLES — deflecting off the
 * rim and losing energy each contact (damped bounce, slow-out) — and may still
 * drop in or finally clank out. Deterministic (no rng): the outcome depends
 * only on HOW far the aim/power was off, so being closer to true is rewarded.
 */
export function simulateShot(
  lay: Layout,
  ball: Vec2,
  dir: number,
  speed: number,
): ShotSim {
  const g = lay.gravity;
  const v = launchVelocity(dir, speed);
  let vx = v.x;
  let vy = v.y;
  let x = ball.x;
  let y = ball.y;

  const hoopX = lay.hoop.x;
  const hoopY = lay.hoop.y;
  const travelSign = Math.sign(vx || hoopX - ball.x) || 1;
  const clipOuter = lay.rimRx + lay.ballR;

  // Backboard face: a vertical plane just past the rim center, only reachable
  // while the ball is within the board's vertical extent + horizontal span.
  const board = lay.board;
  const boardTop = board.y;
  const boardBot = board.y + board.h;
  const boardLeft = board.x - lay.ballR;
  const boardRight = board.x + board.w + lay.ballR;
  const faceX = hoopX + travelSign * lay.rimRx * BOARD_FACE_INSET;

  const pts: Vec2[] = [{ x, y }];
  let apexX = x;
  let apexY = y;
  let everCrossed = false;
  let classified = false;
  let contacts = 0;
  let banked = false;
  let crossDx = 0;
  let result: ShotResult = "wide";
  let made = false;

  for (let step = 0; step < SIM_MAX_STEPS; step++) {
    const prevX = x;
    const prevY = y;
    vy += g * SIM_DT;
    x += vx * SIM_DT;
    y += vy * SIM_DT;
    if (y < apexY) {
      apexY = y;
      apexX = x;
    }
    if (step % 2 === 0) pts.push({ x, y });

    // Backboard front-face strike: the ball, still up at board height and over
    // the board, reaches the face plane heading toward the board. Reflect the
    // horizontal component (energy loss) and damp the vertical — the ball then
    // keeps falling and may bank into the rim or carom back out.
    if (
      !banked &&
      y <= boardBot &&
      y >= boardTop &&
      x >= boardLeft &&
      x <= boardRight &&
      (x - faceX) * travelSign >= 0 &&
      (prevX - faceX) * travelSign < 0
    ) {
      banked = true;
      x = faceX;
      vx = -vx * BOARD_REST;
      vy = vy * BOARD_VKEEP;
      pts.push({ x, y });
      continue;
    }

    // Descending crossing of the rim plane (was above, now at/below, moving down).
    if (!classified && vy > 0 && prevY < hoopY && y >= hoopY) {
      everCrossed = true;
      const f = (hoopY - prevY) / (y - prevY || 1);
      const cx = prevX + (x - prevX) * f;
      crossDx = cx - hoopX;
      const a = Math.abs(crossDx);
      const far = crossDx * travelSign > 0; // past center, toward the backboard

      if (a <= lay.rimInner) {
        made = true;
        result = banked ? "bankIn" : contacts > 0 ? "rimIn" : "swish";
        pts.push({ x: cx, y: hoopY });
        pts.push({ x: hoopX + crossDx * 0.22, y: hoopY + lay.netDrop * 0.55 });
        return { points: pts, result, made, apex: { x: apexX, y: apexY }, crossDx };
      }
      if (a <= lay.rimRx) {
        made = true;
        result = banked || far ? "bankIn" : "rimIn";
        pts.push({ x: cx, y: hoopY });
        pts.push({ x: hoopX + crossDx * 0.18, y: hoopY + lay.netDrop * 0.5 });
        return { points: pts, result, made, apex: { x: apexX, y: apexY }, crossDx };
      }
      if (a <= clipOuter && contacts < MAX_RIM_CONTACTS) {
        // Grazes the ring → bounce. Funnel inward when near the hole, kick out
        // near the outer edge. Energy is lost each contact (damped slow-out).
        contacts++;
        const span = clipOuter - lay.rimInner;
        const t = Math.min(1, Math.max(0, (a - lay.rimInner) / (span || 1)));
        const side = crossDx < 0 ? -1 : 1;
        x = hoopX + side * lay.rimRx;
        y = hoopY;
        const inward = t < 0.5 ? -side : side; // close→toward center, far→outward
        vx = inward * lay.ballR * (4 + t * 9);
        vy = -Math.abs(vy) * 0.4 - lay.ballR * 2.2; // pop up, damped
        continue;
      }
      // Outer strike with no contacts left, or a clean over-throw: it's out.
      made = false;
      result = a <= clipOuter ? "rimOut" : far ? "long" : "wide";
      classified = true;
      // Deflect outward and let it keep falling for the animation.
      const side = crossDx < 0 ? -1 : 1;
      x = hoopX + side * lay.rimRx;
      y = hoopY;
      vx = side * lay.ballR * 6;
      vy = -Math.abs(vy) * 0.3;
    }

    if (y > lay.h + lay.ballR * 2) break;
    if (x < -lay.ballR * 3 || x > lay.w + lay.ballR * 3) break;
  }

  if (!everCrossed) {
    // Never reached the rim on the way down: the apex stayed below rim height.
    const aApex = Math.abs(apexX - hoopX);
    if (apexY > hoopY - lay.ballR && aApex <= clipOuter) {
      result = "rimOut"; // came up just short and kissed the front rim
    } else {
      result = "short";
    }
    made = false;
    crossDx = aApex;
  }

  return { points: pts, result, made, apex: { x: apexX, y: apexY }, crossDx };
}

/**
 * Scans launch speeds across the meter range and returns the [lo, hi] speed
 * window for which a shot at `dir` actually goes IN. The component uses the
 * window at the TRUE aim direction to place the power meter's green band, so
 * "stop it in the green" genuinely corresponds to a make. Returns null if no
 * speed in range makes it (the direction can't score).
 */
export function solveSpeedWindow(
  lay: Layout,
  ball: Vec2,
  dir: number,
  samples = 56,
): { lo: number; hi: number } | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i <= samples; i++) {
    const s = lay.speedMin + (i / samples) * (lay.speedMax - lay.speedMin);
    if (simulateShot(lay, ball, dir, s).made) {
      if (s < lo) lo = s;
      if (s > hi) hi = s;
    }
  }
  if (lo === Infinity) return null;
  return { lo, hi };
}

/**
 * A clean aim-preview arc (no collision handling) from the ball along the given
 * direction/speed, trimmed once it returns to the shooting line or sails off.
 * Used to draw the sweeping Madden-style trajectory line.
 */
export function previewArc(
  lay: Layout,
  ball: Vec2,
  dir: number,
  speed: number,
): Vec2[] {
  const g = lay.gravity;
  const v = launchVelocity(dir, speed);
  let vx = v.x;
  let vy = v.y;
  let x = ball.x;
  let y = ball.y;
  const pts: Vec2[] = [{ x, y }];

  for (let step = 0; step < SIM_MAX_STEPS; step++) {
    const prevY = y;
    vy += g * SIM_DT;
    x += vx * SIM_DT;
    y += vy * SIM_DT;
    if (step % 3 === 0) pts.push({ x, y });
    // Stop just after passing the rim plane on the way down (the useful part),
    // or once it falls back to the shooting line, or leaves the canvas.
    if (vy > 0 && prevY < lay.hoop.y && y >= lay.hoop.y) {
      pts.push({ x, y });
      break;
    }
    if (y > lay.spawnY) break;
    if (x < -lay.ballR * 2 || x > lay.w + lay.ballR * 2) break;
    if (pts.length > 160) break;
  }
  return pts;
}

// --- difficulty pacing ------------------------------------------------------

/** Power-meter sweep speed multiplier by difficulty (harder = faster). */
export function meterSpeedForDifficulty(difficulty: BankDifficulty): number {
  const byDifficulty: Record<BankDifficulty, number> = {
    easy: 0.9,
    medium: 1.25,
    hard: 1.65,
  };
  return byDifficulty[difficulty];
}

/** Aim-sweep speed multiplier by difficulty (harder = faster swing). */
export function aimSpeedForDifficulty(difficulty: BankDifficulty): number {
  const byDifficulty: Record<BankDifficulty, number> = {
    easy: 0.55,
    medium: 0.75,
    hard: 1.0,
  };
  return byDifficulty[difficulty];
}

// --- helpers ----------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
