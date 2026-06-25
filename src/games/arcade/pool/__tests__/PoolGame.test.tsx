import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PoolGame } from "../PoolGame";

// jsdom has no canvas 2d context or ResizeObserver; stub just enough that the
// component's paint/observe calls are harmless no-ops.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => null,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

describe("PoolGame", () => {
  it("shows the start screen with the high score", () => {
    render(<PoolGame highScore={42} onGameOver={() => {}} />);
    expect(screen.getByTestId("pool-game")).toBeInTheDocument();
    expect(screen.getByText("Trick-Shot Lab")).toBeInTheDocument();
    expect(screen.getByText(/High score: 42/)).toBeInTheDocument();
  });

  it("starts play and reveals the shot HUD on Break", () => {
    render(<PoolGame highScore={0} onGameOver={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Break/ }));
    expect(screen.getByTestId("pool-shoot")).toBeInTheDocument();
    expect(screen.getByText(/Cue ball/)).toBeInTheDocument();
  });
});
