import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import {
  getGameHighScores,
  recordGameHighScore,
} from "../../services/gameScoreService";

const lsKey = (gameId: string) => `motionlab.highscore.${gameId}`;

function readLocal(gameId: string): number {
  try {
    return Number(localStorage.getItem(lsKey(gameId)) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeLocal(gameId: string, score: number): void {
  try {
    localStorage.setItem(lsKey(gameId), String(score));
  } catch {
    /* ignore (private mode / SSR) */
  }
}

/**
 * Tracks the best score for an arcade game. Reads/writes localStorage
 * immediately and syncs with Firestore when signed in.
 */
export function useHighScore(gameId: string) {
  const { user } = useAuth();
  const [highScore, setHighScore] = useState<number>(() => readLocal(gameId));

  useEffect(() => {
    let active = true;
    if (!user) return;
    getGameHighScores(user.uid)
      .then((scores) => {
        if (!active) return;
        const remote = scores[gameId] ?? 0;
        if (remote > 0) setHighScore((prev) => Math.max(prev, remote));
      })
      .catch(() => {
        /* offline / permission — keep local value */
      });
    return () => {
      active = false;
    };
  }, [user, gameId]);

  const submit = useCallback(
    async (score: number) => {
      setHighScore((prev) => {
        const best = Math.max(prev, score);
        writeLocal(gameId, best);
        return best;
      });
      if (user) {
        try {
          await recordGameHighScore(user.uid, gameId, score);
        } catch {
          /* ignore — local value already saved */
        }
        // NOTE: the public cross-user leaderboard is posted explicitly (opt-in)
        // from the game-over screen, not silently here.
      }
    },
    [user, gameId],
  );

  return { highScore, submit };
}
