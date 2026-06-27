import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  generateGamePin,
  normalizeGamePin,
  sortPlayers,
  type LiveGame,
  type LivePlayer,
} from "../lib/liveGame";

const MAX_NAME_LENGTH = 24;
function sanitizeName(name: string): string {
  const trimmed = (name ?? "").trim();
  return trimmed ? trimmed.slice(0, MAX_NAME_LENGTH) : "Anonymous";
}

const gameDoc = (pin: string, fdb?: Firestore) => doc(fdb ?? db, "games", pin);
const playerDoc = (pin: string, uid: string, fdb?: Firestore) =>
  doc(fdb ?? db, "games", pin, "players", uid);
const playersCol = (pin: string, fdb?: Firestore) =>
  collection(fdb ?? db, "games", pin, "players");

/** Host creates a game with a unique PIN and a fixed (standardized) question set. */
export async function createGame(
  hostUid: string,
  hostName: string,
  questionIds: string[],
  fdb?: Firestore,
): Promise<LiveGame> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const pin = generateGamePin();
    const ref = gameDoc(pin, fdb);
    const snap = await getDoc(ref);
    if (snap.exists()) continue;
    const game: LiveGame = {
      pin,
      hostUid,
      hostName: sanitizeName(hostName),
      status: "lobby",
      phase: "question",
      currentIndex: -1,
      questionIds,
      questionStartedAt: 0,
      createdAt: Date.now(),
    };
    await setDoc(ref, game);
    return game;
  }
  throw new Error("Couldn't generate a game PIN. Please try again.");
}

/** Player joins a game by PIN. Throws if the game doesn't exist or already ended. */
export async function joinGame(
  rawPin: string,
  uid: string,
  name: string,
  fdb?: Firestore,
): Promise<LiveGame> {
  const pin = normalizeGamePin(rawPin);
  const snap = await getDoc(gameDoc(pin, fdb));
  if (!snap.exists()) throw new Error("No game found with that PIN.");
  const game = snap.data() as LiveGame;
  if (game.status === "ended") throw new Error("That game has already ended.");
  const player: LivePlayer = {
    uid,
    name: sanitizeName(name),
    score: 0,
    answeredIndex: -1,
    lastCorrect: false,
    joinedAt: Date.now(),
  };
  await setDoc(playerDoc(pin, uid, fdb), player);
  return game;
}

/** Host starts the game on the first question. */
export async function startGame(pin: string, fdb?: Firestore): Promise<void> {
  await updateDoc(gameDoc(pin, fdb), {
    status: "active",
    phase: "question",
    currentIndex: 0,
    questionStartedAt: Date.now(),
  });
}

/** Host closes answering and reveals the correct answer + standings. */
export async function revealAnswer(pin: string, fdb?: Firestore): Promise<void> {
  await updateDoc(gameDoc(pin, fdb), { phase: "reveal" });
}

/** Host advances to the next question, or ends the game after the last one. */
export async function nextQuestion(
  pin: string,
  nextIndex: number,
  total: number,
  fdb?: Firestore,
): Promise<void> {
  if (nextIndex >= total) {
    await updateDoc(gameDoc(pin, fdb), { status: "ended" });
    return;
  }
  await updateDoc(gameDoc(pin, fdb), {
    phase: "question",
    currentIndex: nextIndex,
    questionStartedAt: Date.now(),
  });
}

/**
 * Records a player's answer for question `index`. Idempotent per question: a
 * second submission for the same index is ignored. `points` is the speed-weighted
 * award (0 for a wrong answer), computed by the caller via `answerPoints`.
 */
export async function submitAnswer(
  pin: string,
  uid: string,
  index: number,
  correct: boolean,
  points: number,
  fdb?: Firestore,
): Promise<void> {
  const ref = playerDoc(pin, uid, fdb);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const player = snap.data() as LivePlayer;
  if ((player.answeredIndex ?? -1) >= index) return; // already answered this one
  await updateDoc(ref, {
    answeredIndex: index,
    lastCorrect: correct,
    score: increment(Math.max(0, Math.round(points))),
  });
}

/** Live subscription to the game document. Returns an unsubscribe fn. */
export function subscribeGame(
  pin: string,
  cb: (game: LiveGame | null) => void,
  fdb?: Firestore,
): () => void {
  return onSnapshot(
    gameDoc(pin, fdb),
    (snap) => cb(snap.exists() ? (snap.data() as LiveGame) : null),
    () => cb(null),
  );
}

/** Live subscription to the player roster, pre-sorted for the leaderboard. */
export function subscribePlayers(
  pin: string,
  cb: (players: LivePlayer[]) => void,
  fdb?: Firestore,
): () => void {
  return onSnapshot(
    playersCol(pin, fdb),
    (snap) => cb(sortPlayers(snap.docs.map((d) => d.data() as LivePlayer))),
    () => cb([]),
  );
}
