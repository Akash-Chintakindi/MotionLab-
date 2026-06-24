import { describe, expect, it } from "vitest";
import { getPlotFn, integrate, totalDistance } from "../functions";
import { roundTo } from "../curves";

describe("integration helpers", () => {
  const v = getPlotFn("vDecelToNeg"); // 8 - 2t, zero at t=4

  it("net displacement is the signed area", () => {
    expect(roundTo(integrate(v, 0, 4))).toBe(16);
    expect(roundTo(integrate(v, 0, 6))).toBe(12);
  });

  it("total distance is the area of |v|", () => {
    expect(roundTo(totalDistance(v, 0, 6))).toBe(20);
  });

  it("net and total agree when velocity keeps one sign", () => {
    expect(roundTo(integrate(v, 0, 4))).toBe(roundTo(totalDistance(v, 0, 4)));
  });
});
