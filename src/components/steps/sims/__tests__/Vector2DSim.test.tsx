import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Vector2DSim } from "../Vector2DSim";

describe("Vector2DSim", () => {
  it("renders position, velocity, and acceleration component readouts", () => {
    render(<Vector2DSim />);
    expect(screen.getByTestId("pos")).toBeInTheDocument();
    expect(screen.getByTestId("vel")).toBeInTheDocument();
    expect(screen.getByTestId("acc")).toBeInTheDocument();
    expect(screen.getByText("v (velocity)")).toBeInTheDocument();
  });
});
