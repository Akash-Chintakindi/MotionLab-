import { computeIdealShot, type Ball, type PoolTable } from "./poolPhysics";
import { groupOf, EIGHT, type Difficulty, type Group } from "./poolGameLogic";
import type { Vec2 } from "../types";

// ---------------------------------------------------------------------------
// Computer opponent. Pure: given the table state it returns a shot, so the
// difficulty model can be unit-tested deterministically with a seeded RNG.
//
// Difficulty scales two things:
//   1. shot SELECTION — how wide a pool of ranked candidate shots it may pick
//      from (hard always takes the best makeable shot; easy may pick a poor one)
//   2. aim/speed ERROR — random noise added to the ideal angle & speed.
// ---------------------------------------------------------------------------

export interface AiShot {
  angleDeg: number;
  speed: number;
  targetBall: string;
  pocketId: string;
}

interface DifficultyParams {
  /** Max absolute aim noise, degrees. */
  aimErrorDeg: number;
  /** Fractional speed jitter (±). */
  speedJitter: number;
  /** How many of the top-ranked candidates it randomly chooses among. */
  poolSize: number;
}

const PARAMS: Record<Difficulty, DifficultyParams> = {
  easy: { aimErrorDeg: 11, speedJitter: 0.4, poolSize: 8 },
  medium: { aimErrorDeg: 4.5, speedJitter: 0.18, poolSize: 3 },
  hard: { aimErrorDeg: 1, speedJitter: 0.05, poolSize: 1 },
};

/** Hardest cut the AI will even consider (beyond this it's effectively a miss). */
const MAX_CUT_RAD = (82 * Math.PI) / 180;

/**
 * Fairness cap on the AI's launch speed. The player's bar now reaches a much
 * higher max; the AI keeps to the speeds its solver actually needs so it never
 * fires unrealistically hard.
 */
const AI_MAX_SPEED = 150;

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

interface Candidate {
  ball: Ball;
  pocketId: string;
  aimAngleDeg: number;
  minSpeed: number;
  idealSpeed: number;
  /** Lower is an easier / better shot. */
  score: number;
}

/**
 * Picks a shot for the AI on its turn. Returns `null` only when no balls remain
 * to target (caller should treat that as game over). The shot always names a
 * concrete target ball + pocket so the UI can highlight the AI's intent.
 */
export function chooseAiShot(
  balls: Ball[],
  table: PoolTable,
  group: Group | null,
  difficulty: Difficulty,
  rng: () => number = Math.random,
): AiShot | null {
  const cue = balls.find((b) => b.isCue && !b.pocketed);
  if (!cue) return null;

  const onTable = balls.filter((b) => !b.isCue && !b.pocketed && b.number != null);
  if (onTable.length === 0) return null;

  // Target the AI's own group; once it's cleared, go for the 8-ball. With an
  // open table (no group yet) any numbered ball except the 8 is fair game.
  let targets: Ball[];
  if (group) {
    const own = onTable.filter((b) => groupOf(b.number as number) === group);
    targets = own.length > 0 ? own : onTable.filter((b) => b.number === EIGHT);
  } else {
    const nonEight = onTable.filter((b) => b.number !== EIGHT);
    targets = nonEight.length > 0 ? nonEight : onTable;
  }
  if (targets.length === 0) targets = onTable;

  const candidates: Candidate[] = [];
  for (const ball of targets) {
    for (const p of table.pockets) {
      const cut = angleBetween(sub(ball.pos, cue.pos), sub(p.pos, ball.pos));
      if (cut > MAX_CUT_RAD) continue;
      const ideal = computeIdealShot(cue.pos, ball.pos, p.pos, table);
      const dist = len(sub(ball.pos, cue.pos)) + len(sub(p.pos, ball.pos));
      const score = cut * 3 + dist * 0.02;
      candidates.push({
        ball,
        pocketId: p.id,
        aimAngleDeg: ideal.aimAngleDeg,
        minSpeed: ideal.minSpeed,
        idealSpeed: ideal.idealSpeed,
        score,
      });
    }
  }

  const params = PARAMS[difficulty];

  // No makeable pot — take a safety: roll the nearest target toward its closest
  // pocket at a modest pace so at least something happens.
  if (candidates.length === 0) {
    let nearest = targets[0];
    let best = Infinity;
    for (const b of targets) {
      const dd = len(sub(b.pos, cue.pos));
      if (dd < best) {
        best = dd;
        nearest = b;
      }
    }
    const dir = sub(nearest.pos, cue.pos);
    const baseAngle = (Math.atan2(dir.y, dir.x) * 180) / Math.PI;
    const noise = (rng() * 2 - 1) * params.aimErrorDeg;
    return {
      angleDeg: baseAngle + noise,
      speed: Math.min(AI_MAX_SPEED, 32 * (1 + (rng() * 2 - 1) * params.speedJitter)),
      targetBall: nearest.id,
      pocketId: table.pockets[0]?.id ?? "",
    };
  }

  candidates.sort((a, b) => a.score - b.score);
  const poolSize = Math.max(1, Math.min(params.poolSize, candidates.length));
  const choice = candidates[Math.floor(rng() * poolSize)];

  const noise = (rng() * 2 - 1) * params.aimErrorDeg;
  const speed = choice.idealSpeed * (1 + (rng() * 2 - 1) * params.speedJitter);
  return {
    angleDeg: choice.aimAngleDeg + noise,
    speed: Math.min(AI_MAX_SPEED, Math.max(choice.minSpeed * 1.05, speed)),
    targetBall: choice.ball.id,
    pocketId: choice.pocketId,
  };
}
