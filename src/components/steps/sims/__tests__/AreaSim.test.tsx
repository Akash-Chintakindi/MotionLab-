import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AreaSim } from "../AreaSim";
import type { SliderSimulationConfig } from "../../../../types/content";

const config: SliderSimulationConfig = {
  scenario: "area",
  plot: {
    preset: "vDecelToNeg",
    tMin: 0,
    tMax: 6,
    yMin: -6,
    yMax: 9,
    yLabel: "velocity (m/s)",
  },
  initialFrom: 0,
  initialTo: 4,
};

describe("AreaSim", () => {
  it("computes net displacement and total distance for the initial interval", () => {
    render(<AreaSim config={config} />);
    // Over [0,4] velocity stays positive: net == total == 16 m.
    expect(screen.getByTestId("net-displacement")).toHaveTextContent("16 m");
    expect(screen.getByTestId("total-distance")).toHaveTextContent("16 m");
  });
});
