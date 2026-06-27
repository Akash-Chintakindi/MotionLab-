import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LeaderboardPage from "../LeaderboardPage";
import type { LeaderboardEntry } from "../../services/leaderboardService";

vi.mock("../../services/leaderboardService", async () => {
  const actual = await vi.importActual<
    typeof import("../../services/leaderboardService")
  >("../../services/leaderboardService");
  return { ...actual, getLeaderboard: vi.fn() };
});

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

import { getLeaderboard } from "../../services/leaderboardService";
import { useAuth } from "../../auth/AuthProvider";

const mockGetLeaderboard = vi.mocked(getLeaderboard);
const mockUseAuth = vi.mocked(useAuth);

function entry(over: Partial<LeaderboardEntry>): LeaderboardEntry {
  return { uid: "u1", name: "Player", score: 10, updatedAt: 1, ...over };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockGetLeaderboard.mockReset();
  mockUseAuth.mockReturnValue({
    user: { uid: "me" },
  } as unknown as ReturnType<typeof useAuth>);
});

describe("LeaderboardPage", () => {
  it("defaults to basketball and renders ranked rows", async () => {
    mockGetLeaderboard.mockResolvedValue([
      entry({ uid: "a", name: "Ada", score: 99 }),
      entry({ uid: "b", name: "Bert", score: 50 }),
    ]);

    renderPage();

    expect(screen.getByTestId("leaderboard-page")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("leaderboard-list")).toBeInTheDocument(),
    );

    expect(mockGetLeaderboard).toHaveBeenCalledWith("basketball");
    const list = screen.getByTestId("leaderboard-list");
    expect(within(list).getByText("Ada")).toBeInTheDocument();
    expect(within(list).getByText("Bert")).toBeInTheDocument();
    expect(within(list).getByText("99")).toBeInTheDocument();
  });

  it("switches the queried game when the picker changes", async () => {
    mockGetLeaderboard.mockResolvedValue([entry({ uid: "a", name: "Ada" })]);

    renderPage();
    await waitFor(() =>
      expect(mockGetLeaderboard).toHaveBeenCalledWith("basketball"),
    );

    await userEvent.click(screen.getByTestId("lb-game-pool"));

    await waitFor(() =>
      expect(mockGetLeaderboard).toHaveBeenCalledWith("pool"),
    );

    await userEvent.click(screen.getByTestId("lb-game-cannon"));

    await waitFor(() =>
      expect(mockGetLeaderboard).toHaveBeenCalledWith("cannon"),
    );
  });

  it("highlights the current user's row", async () => {
    mockGetLeaderboard.mockResolvedValue([
      entry({ uid: "me", name: "Me", score: 80 }),
      entry({ uid: "other", name: "Other", score: 70 }),
    ]);

    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("leaderboard-list")).toBeInTheDocument(),
    );

    const myRow = screen.getByTestId("lb-row-me");
    expect(within(myRow).getByText("You")).toBeInTheDocument();
    expect(myRow.className).toContain("ring-brand-300");
  });

  it("shows an empty state when there are no scores", async () => {
    mockGetLeaderboard.mockResolvedValue([]);

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText("No scores yet — be the first!"),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("leaderboard-list")).toBeNull();
  });
});
