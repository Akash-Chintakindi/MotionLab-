import { computeIdealShot, type Ball, type PoolTable } from "./poolPhysics";
import { EIGHT, groupOf, type Group } from "./poolGameLogic";
import type { BankDifficulty } from "../../../content/practiceBank/types";
import type { Vec2 } from "../types";

// ---------------------------------------------------------------------------
// Pure learning-perk logic for the full pool game. No React/canvas here: a
// correct physics answer grants ONE per-turn perk, and these helpers compute
// the perk effects so they can be unit-tested in isolation. Coordinates are in
// the same TABLE UNITS the rest of the pool code uses (origin bottom-left).
// ---------------------------------------------------------------------------

export type PerkKind = "aimAssist" | "ballInHand" | "undoScratch" | "spin";

export interface PerkInfo {
  kind: PerkKind;
  label: string;
  /** Emoji glyph for the reward buttons + HUD badge. */
  icon: string;
  blurb: string;
}

/** Display metadata for each perk (button copy + HUD badge). */
export const PERK_INFO: Record<PerkKind, PerkInfo> = {
  aimAssist: {
    kind: "aimAssist",
    label: "Aim Assist",
    icon: "🎯",
    blurb: "Reveal the optimal line for your best makeable shot.",
  },
  ballInHand: {
    kind: "ballInHand",
    label: "Ball in Hand",
    icon: "✋",
    blurb: "Drag the cue ball to any legal spot before you shoot.",
  },
  undoScratch: {
    kind: "undoScratch",
    label: "Scratch Shield",
    icon: "🛡️",
    blurb: "Scratch this turn? Keep your turn instead of losing it.",
  },
  spin: {
    kind: "spin",
    label: "Add Spin",
    icon: "🌀",
    blurb: "Set english on the cue — follow, draw or side — before you shoot.",
  },
};

/** Stable order the perks are offered in. */
export const PERK_ORDER: PerkKind[] = ["aimAssist", "ballInHand", "undoScratch", "spin"];

/** Bonus score for a correct answer, scaling with the chosen difficulty. */
export const QUESTION_POINTS: Record<BankDifficulty, number> = {
  easy: 50,
  medium: 100,
  hard: 150,
};

/** Hardest cut (cue→object→pocket) the assist will consider makeable. */
const MAX_CUT_RAD = (75 * Math.PI) / 180;

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}
function len(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}
function angleBetween(a: Vec2, b: Vec2): number {
  const la = len(a);
  const lb = len(b);
  if (la < 1e-9 || lb < 1e-9) return 0;
  const c = (a.x * b.x + a.y * b.y) / (la * lb);
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

/**
 * Shortest distance from point `p` to the segment a→b. Used to detect balls
 * that sit in the path of a planned shot (cue→ghost or object→pocket).
 */
function pointToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a);
  const abLen2 = ab.x * ab.x + ab.y * ab.y;
  if (abLen2 < 1e-9) return len(sub(p, a));
  let t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / abLen2;
  t = Math.max(0, Math.min(1, t));
  return len(sub(p, { x: a.x + ab.x * t, y: a.y + ab.y * t }));
}

/** True if no live ball (other than the ignored ids) blocks the a→b path. */
function pathClear(
  a: Vec2,
  b: Vec2,
  balls: Ball[],
  ignoreIds: string[],
  table: PoolTable,
): boolean {
  const clearance = table.ballRadius * 2;
  for (const ball of balls) {
    if (ball.pocketed || ignoreIds.includes(ball.id)) continue;
    if (pointToSegment(ball.pos, a, b) < clearance) return false;
  }
  return true;
}

export interface BestShot {
  targetBallId: string;
  pocketId: string;
  /** Cue aim direction (deg from +x) via the ghost-ball method. */
  aimAngleDeg: number;
  /** Cue-center position at contact. */
  ghostBall: Vec2;
  objectPos: Vec2;
  pocketPos: Vec2;
  /** Unit direction the object ball travels toward the pocket. */
  objectDir: Vec2;
  idealSpeed: number;
  /** Lower is a better/easier shot. */
  score: number;
}

/**
 * Aim-Assist core: scan the player's group balls × every pocket with the
 * ghost-ball solver (`computeIdealShot`) and return the single highest-quality
 * MAKEABLE shot, or null if nothing clean exists.
 *
 * "Makeable" means: the cut angle is within reach, the cue's path to the ghost
 * ball is unobstructed, and the object ball's path to the pocket is clear. The
 * physics is the same ghost-ball cut the One-Shot lab teaches, so the revealed
 * line is genuinely correct, not a hint.
 */
export function bestMakeableShot(
  balls: Ball[],
  table: PoolTable,
  group: Group | null,
): BestShot | null {
  const cue = balls.find((b) => b.isCue && !b.pocketed);
  if (!cue) return null;

  const onTable = balls.filter((b) => !b.isCue && !b.pocketed && b.number != null);
  if (onTable.length === 0) return null;

  // Target the player's own group; once cleared, the 8-ball. On an open table
  // (no group yet) any numbered ball except the 8 is fair game.
  let targets: Ball[];
  if (group) {
    const own = onTable.filter((b) => groupOf(b.number as number) === group);
    targets = own.length > 0 ? own : onTable.filter((b) => b.number === EIGHT);
  } else {
    const nonEight = onTable.filter((b) => b.number !== EIGHT);
    targets = nonEight.length > 0 ? nonEight : onTable;
  }
  if (targets.length === 0) return null;

  let best: BestShot | null = null;
  for (const ball of targets) {
    for (const p of table.pockets) {
      const cut = angleBetween(sub(ball.pos, cue.pos), sub(p.pos, ball.pos));
      if (cut > MAX_CUT_RAD) continue;

      const ideal = computeIdealShot(cue.pos, ball.pos, p.pos, table);
      // The cue must reach the ghost ball cleanly, and the object ball must have
      // an open lane to the pocket.
      if (!pathClear(cue.pos, ideal.ghostBall, balls, [cue.id, ball.id], table)) continue;
      if (!pathClear(ball.pos, p.pos, balls, [ball.id], table)) continue;

      const dist = len(sub(ball.pos, cue.pos)) + len(sub(p.pos, ball.pos));
      const score = cut * 3 + dist * 0.02;
      if (!best || score < best.score) {
        const objectDir = norm(sub(p.pos, ball.pos));
        best = {
          targetBallId: ball.id,
          pocketId: p.id,
          aimAngleDeg: ideal.aimAngleDeg,
          ghostBall: ideal.ghostBall,
          objectPos: { ...ball.pos },
          pocketPos: { ...p.pos },
          objectDir,
          idealSpeed: ideal.idealSpeed,
          score,
        };
      }
    }
  }
  return best;
}

function norm(a: Vec2): Vec2 {
  const l = len(a);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/**
 * Ball-in-Hand validity: a candidate cue-ball position is legal when it is
 * fully in bounds, clear of every pocket mouth, and not overlapping any other
 * resting ball.
 */
export function legalCuePlacement(
  pos: Vec2,
  balls: Ball[],
  table: PoolTable,
): boolean {
  const r = table.ballRadius;
  if (pos.x < r || pos.x > table.width - r || pos.y < r || pos.y > table.height - r) {
    return false;
  }
  for (const p of table.pockets) {
    if (len(sub(pos, p.pos)) < p.radius + r) return false;
  }
  for (const b of balls) {
    if (b.isCue || b.pocketed) continue;
    if (len(sub(pos, b.pos)) < r * 2) return false;
  }
  return true;
}

export interface UndoScratchResult {
  /** True if the shield fires and the player keeps their turn. */
  keepTurn: boolean;
  /** Whether the token is still armed afterward (consumed on use). */
  armedLeft: boolean;
}

/**
 * Scratch-Shield resolution: if the token is armed AND the player scratched,
 * the shield fires (keep the turn) and the token is consumed. Otherwise it is
 * untouched.
 */
export function consumeUndoScratch(
  armed: boolean,
  scratched: boolean,
): UndoScratchResult {
  if (armed && scratched) return { keepTurn: true, armedLeft: false };
  return { keepTurn: false, armedLeft: armed };
}
