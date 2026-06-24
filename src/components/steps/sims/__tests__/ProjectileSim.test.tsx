import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectileSim } from "../ProjectileSim";
import type { SliderSimulationConfig } from "../../../../types/content";

const config: SliderSimulationConfig = {
  scenario: "projectile",
  a: 45,
  v0: 20,
};

describe("ProjectileSim", () => {
  it("computes peak height and range for the initial launch (g=10)", () => {
    render(<ProjectileSim config={config} />);
    // vy = 20 sin45 = 14.14 -> peak = vy^2/20 = 10 m, range = vx*tof = 40 m
    expect(screen.getByTestId("peak")).toHaveTextContent("10 m");
    expect(screen.getByTestId("range")).toHaveTextContent("40 m");
  });
});
