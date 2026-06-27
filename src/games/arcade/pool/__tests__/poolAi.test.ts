import { describe, it, expect } from "vitest";
import { POOL_TABLE } from "../poolLevels";
import { chooseAiShot } from "../poolAi";
import { angleDelta, type Ball } from "../poolPhysics";

function cue(x: number, y: number): Ball {
  return { id: "cue", pos: { x, y }, vel: { x: 0, y: 0 }, radius: POOL_TABLE.ballRadius, color: "#fff", pocketed: false, isCue: true };
}
function obj(id: string, n: number, x: number, y: number): Ball {
  return { id, pos: { x, y }, vel: { x: 0, y: 0 }, radius: POOL_TABLE.ballRadius, color: "#fff", pocketed: false, number: n, stripe: n > 8 };
}

describe("chooseAiShot", () => {
  it("returns null when there are no object balls left", () => {
    expect(chooseAiShot([cue(25, 25)], POOL_TABLE, "solids", "hard")).toBeNull();
  });

  it("targets a ball of the AI's own group", () => {
    const balls = [cue(25, 25), obj("b3", 3, 50, 25), obj("b11", 11, 60, 30)];
    const shot = chooseAiShot(balls, POOL_TABLE, "stripes", "hard", () => 0.5);
    expect(shot).not.toBeNull();
    expect(shot!.targetBall).toBe("b11");
  });

  it("aims more precisely on hard than on easy (same chosen shot)", () => {
    // A near-straight makeable shot toward the bottom-right pocket.
    const balls = [cue(20, 25), obj("b3", 3, 60, 18)];
    // rng=0 -> picks the top candidate for every difficulty and applies the
    // full negative aim noise, so the angle error magnitude equals aimErrorDeg.
    const easy = chooseAiShot(balls, POOL_TABLE, "solids", "easy", () => 0)!;
    const hard = chooseAiShot(balls, POOL_TABLE, "solids", "hard", () => 0)!;
    expect(easy.targetBall).toBe("b3");
    expect(hard.targetBall).toBe("b3");
    // Compare each to the ideal (hard with rng=0.5 has zero noise -> the ideal).
    const ideal = chooseAiShot(balls, POOL_TABLE, "solids", "hard", () => 0.5)!.angleDeg;
    const easyError = Math.abs(angleDelta(easy.angleDeg, ideal));
    const hardError = Math.abs(angleDelta(hard.angleDeg, ideal));
    expect(hardError).toBeLessThan(easyError);
    expect(hardError).toBeLessThan(2);
    expect(easyError).toBeGreaterThan(6);
  });

  it("produces a forward-moving shot with positive speed", () => {
    const balls = [cue(20, 25), obj("b3", 3, 60, 25)];
    const shot = chooseAiShot(balls, POOL_TABLE, "solids", "medium", () => 0.5)!;
    expect(shot.speed).toBeGreaterThan(0);
    expect(Number.isFinite(shot.angleDeg)).toBe(true);
  });

  it("goes for the 8-ball once its group is cleared", () => {
    const balls = [cue(25, 25), obj("b8", 8, 70, 25), obj("b11", 11, 55, 30)];
    // AI is solids but has none left -> should target the 8.
    const shot = chooseAiShot(balls, POOL_TABLE, "solids", "hard", () => 0.5)!;
    expect(shot.targetBall).toBe("b8");
  });
});
