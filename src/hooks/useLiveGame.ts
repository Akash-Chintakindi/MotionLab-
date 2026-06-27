import { useEffect, useState } from "react";
import {
  subscribeGame,
  subscribePlayers,
} from "../services/liveGameService";
import type { LiveGame, LivePlayer } from "../lib/liveGame";

/** Subscribes to a live game's doc + player roster while `pin` is set. */
export function useLiveGame(pin: string | null): {
  game: LiveGame | null;
  players: LivePlayer[];
} {
  const [game, setGame] = useState<LiveGame | null>(null);
  const [players, setPlayers] = useState<LivePlayer[]>([]);

  useEffect(() => {
    if (!pin) {
      setGame(null);
      setPlayers([]);
      return;
    }
    const unsubGame = subscribeGame(pin, setGame);
    const unsubPlayers = subscribePlayers(pin, setPlayers);
    return () => {
      unsubGame();
      unsubPlayers();
    };
  }, [pin]);

  return { game, players };
}
