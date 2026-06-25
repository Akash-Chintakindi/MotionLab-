import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BasketballGame } from "../BasketballGame";

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

describe("BasketballGame", () => {
  it("shows the start screen with the high score and clock options", () => {
    render(<BasketballGame highScore={37} onGameOver={() => {}} />);
    expect(screen.getByTestId("basketball-game")).toBeInTheDocument();
    expect(screen.getByText("Buzzer Beater")).toBeInTheDocument();
    expect(screen.getByText(/High score: 37/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "60s" })).toBeInTheDocument();
  });

  it("starts play and reveals the action button on Start", () => {
    render(<BasketballGame highScore={0} onGameOver={() => {}} />);
    fireEvent.click(screen.getByTestId("bball-start"));
    expect(screen.getByTestId("bball-action")).toBeInTheDocument();
    // No score has been recorded yet, so the game must not have ended.
    expect(screen.queryByText("Play again")).not.toBeInTheDocument();
  });

  it("does not call onGameOver before the session ends", () => {
    const onGameOver = vi.fn();
    render(<BasketballGame highScore={0} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByTestId("bball-start"));
    expect(onGameOver).not.toHaveBeenCalled();
  });
});
