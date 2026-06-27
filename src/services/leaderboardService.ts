import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { db } from "../lib/firebase";

/** One leaderboard row: a user's best score for a single game. */
export interface LeaderboardEntry {
  uid: string;
  name: string;
  score: number;
  updatedAt: number;
}

/** Games that have a public leaderboard. Labels mirror GamesPage cards. */
export const LEADERBOARD_GAMES = [
  { id: "basketball", label: "Buzzer Beater" },
  { id: "pool", label: "Physics Pool" },
  { id: "cannon", label: "Cannon Duel" },
  { id: "lab", label: "Lab Survival" },
] as const;

const MAX_NAME_LENGTH = 24;

/** Trims a display name to a sane length, falling back to "Anonymous". */
function sanitizeName(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Anonymous";
  return trimmed.slice(0, MAX_NAME_LENGTH);
}

const entryDoc = (gameId: string, uid: string, fdb?: Firestore) =>
  doc(fdb ?? db, "leaderboards", gameId, "entries", uid);

const entriesCol = (gameId: string, fdb?: Firestore) =>
  collection(fdb ?? db, "leaderboards", gameId, "entries");

/**
 * Upserts a user's leaderboard entry for `gameId`, only ever raising the
 * stored score (reads the current value and writes the max).
 */
export async function recordLeaderboardScore(
  uid: string,
  name: string,
  gameId: string,
  score: number,
  fdb?: Firestore,
): Promise<void> {
  const ref = entryDoc(gameId, uid, fdb);
  const snap = await getDoc(ref);
  const current = snap.exists()
    ? ((snap.data() as { score?: number }).score ?? 0)
    : 0;
  const best = Math.max(score, current);
  await setDoc(ref, {
    uid,
    name: sanitizeName(name),
    score: best,
    updatedAt: Date.now(),
  });
}

/**
 * Returns the top `topN` entries for `gameId`, highest score first. Reads only
 * the per-game subcollection, so it needs no composite index.
 */
export async function getLeaderboard(
  gameId: string,
  topN = 20,
  fdb?: Firestore,
): Promise<LeaderboardEntry[]> {
  const q = query(
    entriesCol(gameId, fdb),
    orderBy("score", "desc"),
    limit(topN),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as LeaderboardEntry);
}
