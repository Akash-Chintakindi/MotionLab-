import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PoolGame } from "../PoolGame";

// Force the pre-shot question to a known, gradeable item so a test can answer
// correctly and reach the perk-reward step deterministically (AI stays off, so
// nothing hits the network either way).
vi.mock("../../../../ai/practiceQuestion", () => ({
  getPracticeQuestion: vi.fn(async () => ({
    source: "bank" as const,
    question: {
      id: "q-spin-test",
      topicId: "kinematics",
      type: "multipleChoice" as const,
      category: "conceptual" as const,
      prompt: "Pick the right one.",
      options: [
        { id: "a", label: "Wrong" },
        { id: "b", label: "Right" },
      ],
      correctOptionId: "b",
      explanation: "Because b is right.",
      difficulty: "easy" as const,
    },
  })),
}));

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
  it("shows the mode-select screen with the high score", () => {
    render(<PoolGame highScore={42} onGameOver={() => {}} />);
    expect(screen.getByTestId("pool-game")).toBeInTheDocument();
    expect(screen.getByText("Pool Lab")).toBeInTheDocument();
    expect(screen.getByTestId("pool-mode-oneshot")).toBeInTheDocument();
    expect(screen.getByTestId("pool-mode-full")).toBeInTheDocument();
    expect(screen.getByText(/High score: 42/)).toBeInTheDocument();
  });

  it("opens the one-shot challenge from mode select", () => {
    render(<PoolGame highScore={0} onGameOver={() => {}} />);
    fireEvent.click(screen.getByTestId("pool-mode-oneshot"));
    expect(screen.getByText("Trick-Shot Lab")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Break/ }));
    expect(screen.getByTestId("pool-shoot")).toBeInTheDocument();
    expect(screen.getByText(/Cue ball/)).toBeInTheDocument();
  });

  it("opens the full game (gated by a pre-shot question) after picking a difficulty", () => {
    render(<PoolGame highScore={0} onGameOver={() => {}} />);
    fireEvent.click(screen.getByTestId("pool-mode-full"));
    expect(screen.getByText("Choose difficulty")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("pool-diff-medium"));
    expect(screen.getByTestId("pool-full")).toBeInTheDocument();
    expect(screen.getByTestId("pool-turn")).toHaveTextContent(/Your turn/);
    // The break is now gated by a pre-shot physics question.
    expect(screen.getByTestId("pool-question-modal")).toBeInTheDocument();
    // Skipping never hard-blocks play: it closes the modal and lets you aim.
    fireEvent.click(screen.getByTestId("pool-q-skip"));
    expect(screen.queryByTestId("pool-question-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("pool-full-shoot")).toBeInTheDocument();
  });

  it("loads a question after choosing a difficulty in the modal", async () => {
    render(<PoolGame highScore={0} onGameOver={() => {}} />);
    fireEvent.click(screen.getByTestId("pool-mode-full"));
    fireEvent.click(screen.getByTestId("pool-diff-medium"));
    // AI is off by default, so this resolves from the static bank (no network).
    fireEvent.click(screen.getByTestId("pool-q-difficulty-easy"));
    // The difficulty picker is replaced by the loaded question's Skip control.
    const skip = await screen.findByTestId("pool-q-skip");
    expect(screen.queryByTestId("pool-q-difficulty-easy")).not.toBeInTheDocument();
    fireEvent.click(skip);
    expect(screen.queryByTestId("pool-question-modal")).not.toBeInTheDocument();
  });

  it("offers the Spin perk and shows the spin selector after answering correctly", async () => {
    render(<PoolGame highScore={0} onGameOver={() => {}} />);
    fireEvent.click(screen.getByTestId("pool-mode-full"));
    fireEvent.click(screen.getByTestId("pool-diff-medium"));
    // Break question is open; pick a difficulty to load the (mocked) question.
    fireEvent.click(screen.getByTestId("pool-q-difficulty-easy"));
    // Answer correctly → the perk-choose step appears with the new Spin option.
    fireEvent.click(await screen.findByTestId("pool-q-opt-b"));
    const spinPerk = await screen.findByTestId("pool-perk-spin");
    expect(spinPerk).toBeInTheDocument();
    // Choosing it closes the modal and reveals the cue-ball spin selector.
    fireEvent.click(spinPerk);
    expect(screen.queryByTestId("pool-question-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("pool-spin-selector")).toBeInTheDocument();
    expect(screen.getByTestId("pool-spin-label")).toHaveTextContent(/Center/);
  });

  it("can return to the mode select from a sub-game", () => {
    render(<PoolGame highScore={0} onGameOver={() => {}} />);
    fireEvent.click(screen.getByTestId("pool-mode-full"));
    fireEvent.click(screen.getByTestId("pool-back-modes"));
    expect(screen.getByText("Pool Lab")).toBeInTheDocument();
  });
});
