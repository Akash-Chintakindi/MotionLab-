export interface Vec2 {
  x: number;
  y: number;
}

/** One public leaderboard row (a user's best score for the game). */
export interface LeaderboardRow {
  uid: string;
  name: string;
  score: number;
}

/**
 * Optional cross-user leaderboard integration handed to a game so its
 * game-over screen can OFFER to post the score (opt-in) and show the board.
 * The page wires these to Firestore so the game itself never imports Firebase.
 */
export interface ArcadeLeaderboard {
  /** The current player's display name (shown on the opt-in). */
  playerName: string;
  /** The current player's uid (used to highlight their own row). */
  playerId: string;
  /** Publishes `score` to the public board for this game. */
  publish: (score: number) => Promise<void>;
  /** Fetches the top entries for this game, highest first. */
  fetchTop: (topN?: number) => Promise<LeaderboardRow[]>;
}

/** Props every arcade game page passes to its game component. */
export interface ArcadeGameProps {
  /** The player's current best score for this game (0 if none). */
  highScore: number;
  /** Called once when a game session ends, with the final score. */
  onGameOver: (result: { score: number }) => void;
  /** Optional opt-in cross-user leaderboard (absent when signed out). */
  leaderboard?: ArcadeLeaderboard;
  /**
   * Optional sink for graded in-game physics questions, so the page can feed
   * them into the spaced-repetition mastery model. The game stays auth-free; the
   * page (under AuthProvider) supplies this. `topicId` is a course lesson id.
   */
  onTopicResult?: (
    topicId: string,
    correct: boolean,
    difficulty: "easy" | "medium" | "hard",
  ) => void;
}
