import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { db } from "../lib/firebase";

const scoresDoc = (uid: string, fdb?: Firestore) =>
  doc(fdb ?? db, "users", uid, "gameScores", "arcade");

/** Returns the per-game best scores map, e.g. { pool: 12, basketball: 30 }. */
export async function getGameHighScores(
  uid: string,
  fdb?: Firestore,
): Promise<Record<string, number>> {
  const snap = await getDoc(scoresDoc(uid, fdb));
  if (!snap.exists()) return {};
  const data = snap.data() as { scores?: Record<string, number> };
  return data.scores ?? {};
}

/** Persists `score` as the new best for `gameId` if it beats the stored value. */
export async function recordGameHighScore(
  uid: string,
  gameId: string,
  score: number,
  fdb?: Firestore,
): Promise<number> {
  const current = await getGameHighScores(uid, fdb);
  const best = Math.max(score, current[gameId] ?? 0);
  await setDoc(
    scoresDoc(uid, fdb),
    { scores: { ...current, [gameId]: best }, updatedAt: Date.now() },
    { merge: true },
  );
  return best;
}
