import { describe, expect, it } from "vitest";
import { averageVelocity, getCurve, roundTo } from "../curves";

describe("curve math", () => {
  it("parabolaDown has +, 0, then - velocity", () => {
    const c = getCurve("parabolaDown");
    expect(roundTo(c.v(1))).toBe(4);
    expect(roundTo(c.v(3))).toBe(0);
    expect(roundTo(c.v(5))).toBe(-4);
  });

  it("scurveSin is flat at the ends and steepest in the middle", () => {
    const c = getCurve("scurveSin");
    expect(Math.abs(c.v(0))).toBeLessThan(0.001);
    expect(Math.abs(c.v(6))).toBeLessThan(0.001);
    expect(c.v(3)).toBeGreaterThan(c.v(1));
    expect(c.v(3)).toBeGreaterThan(c.v(5));
  });

  it("average velocity equals secant slope", () => {
    const c = getCurve("linearUp");
    expect(roundTo(averageVelocity(c, 1, 4))).toBe(1.5);
  });

  it("average velocity over a symmetric parabola interval can be zero", () => {
    const c = getCurve("parabolaDown");
    // x(0) = 0, x(6) = 0 -> net displacement 0 -> average velocity 0
    expect(roundTo(averageVelocity(c, 0, 6))).toBe(0);
  });
});
