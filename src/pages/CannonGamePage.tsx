import { useMemo } from "react";
import { useAuth } from "../auth/AuthProvider";
import { AppShell } from "../components/AppShell";
import { CannonGame } from "../games/arcade/cannon/CannonGame";
import { useHighScore } from "../games/arcade/useHighScore";
import { useMastery } from "../services/masteryStore";
import type { ArcadeLeaderboard } from "../games/arcade/types";
import {
  getLeaderboard,
  recordLeaderboardScore,
} from "../services/leaderboardService";

const GAME_ID = "cannon";

export default function CannonGamePage() {
  const { user } = useAuth();
  const { highScore, submit } = useHighScore(GAME_ID);
  const { record } = useMastery();

  // Opt-in cross-user leaderboard, wired here so the game never imports Firebase.
  const leaderboard = useMemo<ArcadeLeaderboard | undefined>(() => {
    if (!user) return undefined;
    const name = user.displayName || user.email?.split("@")[0] || "Anonymous";
    return {
      playerId: user.uid,
      playerName: name,
      publish: (score) => recordLeaderboardScore(user.uid, name, GAME_ID, score),
      fetchTop: (topN) => getLeaderboard(GAME_ID, topN),
    };
  }, [user]);

  return (
    <AppShell>
      <CannonGame
        highScore={highScore}
        onGameOver={({ score }) => submit(score)}
        leaderboard={leaderboard}
        onTopicResult={record}
      />
    </AppShell>
  );
}
