import { describe, expect, it } from "vitest";
import { computeLayout } from "../basketballLayout";
import {
  TIME_BONUS,
  TIME_LIMITS,
  QUESTION_INTERVAL,
  WRONG_PENALTY,
  applyTimeDelta,
  aimRange,
  aimAngleAt,
  aimGood,
  greenBand,
  idealSpeed,
  powerToSpeed,
  previewArc,
  simulateShot,
  solveSpeedWindow,
  speedToPower,
} from "../basketballPhysics";

const lay = computeLayout(360, 450);
const HALF_PI = Math.PI / 2;

describe("timed-question economy", () => {
  it("keeps the question constants", () => {
    expect(TIME_BONUS).toEqual({ easy: 2, medium: 5, hard: 10 });
    expect(WRONG_PENALTY).toBe(5);
    expect(QUESTION_INTERVAL).toBe(15);
    expect(TIME_LIMITS).toEqual([30, 60, 120]);
  });

  it("clamps remaining time at zero", () => {
    expect(applyTimeDelta(8, 5)).toBe(13);
    expect(applyTimeDelta(3, -5)).toBe(0);
  });
});

describe("aimRange adapts to ball position", () => {
  it("leans right when the ball is left of the hoop", () => {
    const r = aimRange({ x: lay.hoop.x - 120, y: lay.spawnY }, lay.hoop);
    expect(r.centerRad).toBeLessThan(HALF_PI);
  });

  it("leans left when the ball is right of the hoop", () => {
    const r = aimRange({ x: lay.hoop.x + 120, y: lay.spawnY }, lay.hoop);
    expect(r.centerRad).toBeGreaterThan(HALF_PI);
  });

  it("points roughly straight up for a centered ball", () => {
    const r = aimRange({ x: lay.hoop.x, y: lay.spawnY }, lay.hoop);
    expect(Math.abs(r.centerRad - HALF_PI)).toBeLessThan(0.01);
  });
});

describe("aimAngleAt", () => {
  const range = { centerRad: HALF_PI, halfRad: 0.7 };
  it("offsets from center by osc·half", () => {
    expect(aimAngleAt(range, 0)).toBeCloseTo(HALF_PI);
    expect(aimAngleAt(range, 1)).toBeCloseTo(HALF_PI + 0.7);
    expect(aimAngleAt(range, -1)).toBeCloseTo(HALF_PI - 0.7);
  });
  it("clamps to a sane elevation window", () => {
    const steep = { centerRad: HALF_PI, halfRad: 5 };
    const up = aimAngleAt(steep, 1);
    const down = aimAngleAt(steep, -1);
    expect(up).toBeLessThan(Math.PI);
    expect(down).toBeGreaterThan(0);
  });
});

describe("idealSpeed", () => {
  const ball = { x: lay.hoop.x - 130, y: lay.spawnY };

  it("returns a positive speed for a steep, feasible direction", () => {
    const center = aimRange(ball, lay.hoop).centerRad;
    const v = idealSpeed(ball, lay.hoop, center, lay.gravity);
    expect(v).not.toBeNull();
    expect(v!).toBeGreaterThan(0);
    expect(Number.isFinite(v!)).toBe(true);
  });

  it("returns null for a too-shallow direction (would need infinite speed)", () => {
    expect(idealSpeed(ball, lay.hoop, 0.34, lay.gravity)).toBeNull();
  });

  it("handles the near-vertical (overhead) case", () => {
    const v = idealSpeed({ x: lay.hoop.x, y: lay.spawnY }, lay.hoop, HALF_PI, lay.gravity);
    expect(v).not.toBeNull();
    expect(v!).toBeGreaterThan(0);
  });
});

describe("power <-> speed mapping", () => {
  it("round-trips", () => {
    const s = powerToSpeed(0.5, lay);
    expect(speedToPower(s, lay)).toBeCloseTo(0.5);
  });
  it("greenBand centers on the ideal speed and aimGood agrees", () => {
    const ball = { x: lay.hoop.x - 130, y: lay.spawnY };
    const center = aimRange(ball, lay.hoop).centerRad;
    const ideal = idealSpeed(ball, lay.hoop, center, lay.gravity);
    const band = greenBand(ideal, lay);
    expect(band.center).toBeGreaterThanOrEqual(0);
    expect(band.center).toBeLessThanOrEqual(1);
    expect(aimGood(ideal, lay)).toBe(true);
  });
  it("greenBand is absent for an unreachable shot", () => {
    expect(greenBand(null, lay).center).toBe(-1);
    expect(aimGood(null, lay)).toBe(false);
  });
});

describe("simulateShot", () => {
  const ball = { x: lay.hoop.x - 130, y: lay.spawnY };
  const dir = aimRange(ball, lay.hoop).centerRad;
  const ideal = idealSpeed(ball, lay.hoop, dir, lay.gravity)!;

  it("sinks the shot at the ideal speed (descending through the rim)", () => {
    const sim = simulateShot(lay, ball, dir, ideal);
    expect(sim.made).toBe(true);
    expect(Math.abs(sim.crossDx)).toBeLessThanOrEqual(lay.rimRx);
    expect(sim.points[0]).toEqual(ball);
  });

  it("comes up short when the power is far too low", () => {
    const sim = simulateShot(lay, ball, dir, ideal * 0.5);
    expect(sim.made).toBe(false);
  });

  it("overshoots long when the power is far too high", () => {
    const sim = simulateShot(lay, ball, dir, ideal * 1.8);
    expect(sim.made).toBe(false);
  });

  it("always returns an animation polyline starting at the ball", () => {
    const sim = simulateShot(lay, ball, dir, ideal);
    expect(sim.points.length).toBeGreaterThan(1);
    expect(sim.points[0]).toEqual(ball);
  });
});

describe("true-aim speed window (green band correctness)", () => {
  // Exercise a few spawn positions so the band logic is robust, not lucky.
  const spawns = [-150, -60, 0, 70, 160];

  for (const off of spawns) {
    const ball = { x: lay.hoop.x + off, y: lay.spawnY };
    const center = aimRange(ball, lay.hoop).centerRad;

    it(`finds a make window that actually scores (spawn ${off})`, () => {
      const win = solveSpeedWindow(lay, ball, center);
      expect(win).not.toBeNull();
      expect(win!.lo).toBeLessThan(win!.hi);
      // Every speed in the window must genuinely go in — this is the guarantee
      // the user asked for: "in the green" == the ball goes in.
      const mid = (win!.lo + win!.hi) / 2;
      expect(simulateShot(lay, ball, center, win!.lo).made).toBe(true);
      expect(simulateShot(lay, ball, center, win!.hi).made).toBe(true);
      expect(simulateShot(lay, ball, center, mid).made).toBe(true);
    });

    it(`misses just outside the window (spawn ${off})`, () => {
      const win = solveSpeedWindow(lay, ball, center)!;
      const step = (lay.speedMax - lay.speedMin) / 56;
      if (win.lo > lay.speedMin + step * 2) {
        expect(simulateShot(lay, ball, center, win.lo - step * 2).made).toBe(
          false,
        );
      }
      if (win.hi < lay.speedMax - step * 2) {
        expect(simulateShot(lay, ball, center, win.hi + step * 2).made).toBe(
          false,
        );
      }
    });
  }
});

describe("rim rattle for slightly-off aim (physics-intuition)", () => {
  const ball = { x: lay.hoop.x - 120, y: lay.spawnY };
  const center = aimRange(ball, lay.hoop).centerRad;
  const trueSpeed = idealSpeed(ball, lay.hoop, center, lay.gravity)!;

  it("swishes when the aim is dead-on at true speed", () => {
    const sim = simulateShot(lay, ball, center, trueSpeed);
    expect(sim.made).toBe(true);
  });

  it("spans swish → rim make → bounce-out as the aim drifts off", () => {
    const results: { d: number; result: string; made: boolean }[] = [];
    for (let d = 0; d <= 0.6; d += 0.02) {
      const sim = simulateShot(lay, ball, center + d, trueSpeed);
      results.push({ d, result: sim.result, made: sim.made });
    }
    // Dead-on scores; a slightly-off aim can still drop in; a far-off aim misses.
    expect(results[0].made).toBe(true);
    expect(results.some((r) => r.made && r.d > 0)).toBe(true);
    expect(results.some((r) => !r.made)).toBe(true);
    // The ring is actually engaged somewhere in the drift (rattle, not a clean
    // fly-by everywhere).
    expect(
      results.some((r) => r.result === "rimIn" || r.result === "rimOut"),
    ).toBe(true);
  });

  it("far-off aim with perfect power does not score", () => {
    const sim = simulateShot(lay, ball, center + 0.8, trueSpeed);
    expect(sim.made).toBe(false);
  });
});

describe("backboard carom (physics-intuition: real reflection, not a funnel)", () => {
  // Spawned LEFT of the hoop, so "away from the hoop" means back toward the
  // shooter (smaller x). The board sits behind the rim; a too-deep ball should
  // strike its front face and rebound the way it came, NOT get pulled inward.
  const ball = { x: lay.hoop.x - 130, y: lay.spawnY };
  const center = aimRange(ball, lay.hoop).centerRad;
  const ideal = idealSpeed(ball, lay.hoop, center, lay.gravity)!;

  it("caroms an off-target overthrow AWAY from the hoop off the board", () => {
    // Aimed slightly shooter-ward but over-powered: the ball sails PAST the rim
    // center into the board, reflects, and comes back toward the shooter side.
    const sim = simulateShot(lay, ball, center - 0.2, ideal * 1.1);
    expect(sim.made).toBe(false);
    const maxX = Math.max(...sim.points.map((p) => p.x));
    const late = sim.points[sim.points.length - 1];
    // Travelled past center (into the board) then reversed: the tail of the path
    // sits well on the shooter side, i.e. heading AWAY from the rim.
    expect(maxX).toBeGreaterThan(lay.hoop.x);
    expect(late.x).toBeLessThan(lay.hoop.x - lay.rimRx);
  });

  it("banks a flush, well-paced shot IN (bankIn)", () => {
    const sim = simulateShot(lay, ball, center, ideal * 1.1);
    expect(sim.made).toBe(true);
    expect(sim.result).toBe("bankIn");
  });

  it("still swishes the dead-on shot at ideal power", () => {
    const sim = simulateShot(lay, ball, center, ideal);
    expect(sim.made).toBe(true);
    expect(sim.result).toBe("swish");
  });

  it("does NOT funnel every overthrow toward the rim", () => {
    // The old bug: any mis-hit drifted toward the hoop. Now an over-powered
    // sweep must produce at least one shot that caroms onto the shooter side.
    let awayMisses = 0;
    for (let dd = -0.25; dd <= 0.05 + 1e-9; dd += 0.05) {
      const sim = simulateShot(lay, ball, center + dd, ideal * 1.2);
      const late = sim.points[sim.points.length - 1];
      if (!sim.made && late.x < lay.hoop.x - lay.rimRx) awayMisses++;
    }
    expect(awayMisses).toBeGreaterThan(0);
  });
});

describe("solveSpeedWindow still yields makes after the board change", () => {
  it("finds a non-empty make window for a well-aimed direction", () => {
    const ball = { x: lay.hoop.x - 110, y: lay.spawnY };
    const center = aimRange(ball, lay.hoop).centerRad;
    const win = solveSpeedWindow(lay, ball, center);
    expect(win).not.toBeNull();
    expect(win!.lo).toBeLessThan(win!.hi);
    const mid = (win!.lo + win!.hi) / 2;
    expect(simulateShot(lay, ball, center, mid).made).toBe(true);
  });
});

describe("previewArc", () => {
  it("returns a polyline starting at the ball", () => {
    const ball = { x: lay.hoop.x - 100, y: lay.spawnY };
    const dir = aimRange(ball, lay.hoop).centerRad;
    const pts = previewArc(lay, ball, dir, powerToSpeed(0.5, lay));
    expect(pts.length).toBeGreaterThan(1);
    expect(pts[0]).toEqual(ball);
  });
});
