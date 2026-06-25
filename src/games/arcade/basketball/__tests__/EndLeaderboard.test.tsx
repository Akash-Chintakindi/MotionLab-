import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EndLeaderboard } from "../EndLeaderboard";
import type { ArcadeLeaderboard } from "../../types";

function makeLeaderboard(
  over: Partial<ArcadeLeaderboard> = {},
): ArcadeLeaderboard {
  return {
    playerId: "me",
    playerName: "Bob",
    publish: vi.fn().mockResolvedValue(undefined),
    fetchTop: vi.fn().mockResolvedValue([
      { uid: "a", name: "Ada", score: 99 },
      { uid: "me", name: "Bob", score: 42 },
    ]),
    ...over,
  };
}

describe("EndLeaderboard (game-over opt-in)", () => {
  it("offers to post under the player's name", () => {
    render(<EndLeaderboard leaderboard={makeLeaderboard()} score={42} />);
    expect(
      screen.getByText("Add your score to the leaderboard?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("publishes the score and then shows the board incl. other users", async () => {
    const lb = makeLeaderboard();
    render(<EndLeaderboard leaderboard={lb} score={42} />);

    await userEvent.click(screen.getByTestId("bball-add-leaderboard"));

    expect(lb.publish).toHaveBeenCalledWith(42);
    const board = await screen.findByTestId("bball-end-leaderboard");
    // Other users' scores are displayed alongside the player's own row.
    expect(within(board).getByText("Ada")).toBeInTheDocument();
    expect(within(board).getByText("99")).toBeInTheDocument();
    expect(within(board).getByText(/\(you\)/)).toBeInTheDocument();
  });

  it("does not publish when the player declines", async () => {
    const lb = makeLeaderboard();
    render(<EndLeaderboard leaderboard={lb} score={42} />);

    await userEvent.click(screen.getByRole("button", { name: "No thanks" }));

    expect(lb.publish).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Add your score to the leaderboard?"),
    ).toBeNull();
  });

  it("surfaces a retry when publishing fails", async () => {
    const lb = makeLeaderboard({
      publish: vi.fn().mockRejectedValue(new Error("offline")),
    });
    render(<EndLeaderboard leaderboard={lb} score={42} />);

    await userEvent.click(screen.getByTestId("bball-add-leaderboard"));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Try again" }),
      ).toBeInTheDocument(),
    );
  });
});
