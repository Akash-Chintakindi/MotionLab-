// Pure helpers + shared data shapes for the live multiplayer quiz ("Squad
// Clash"). No Firebase here so the logic is unit-testable; I/O lives in
// services/liveGameService.ts.

import type { BankQuestion } from "../content/practiceBank/types";

/** Max points for a correct answer — awarded for a near-instant answer. */
export const POINTS_PER_CORRECT = 1000;
/** Floor points for a correct-but-slow answer (correctness still beats speed). */
export const MIN_CORRECT_POINTS = 500;
/** Default number of questions in a game. */
export const DEFAULT_QUESTION_COUNT = 6;
/** Seconds a question stays open before the host auto-reveals. */
export const QUESTION_SECONDS = 25;

export type GameStatus = "lobby" | "active" | "ended";
export type GamePhase = "question" | "reveal";

/** The shared game document (Firestore: games/{pin}). */
export interface LiveGame {
  pin: string;
  hostUid: string;
  hostName: string;
  status: GameStatus;
  phase: GamePhase;
  /** Index into questionIds; -1 while in the lobby. */
  currentIndex: number;
  questionIds: string[];
  /** epoch ms when the current question opened (for the countdown). */
  questionStartedAt: number;
  createdAt: number;
}

/** One participant (Firestore: games/{pin}/players/{uid}). */
export interface LivePlayer {
  uid: string;
  name: string;
  score: number;
  /** Highest question index this player has already answered (anti double-answer). */
  answeredIndex: number;
  lastCorrect: boolean;
  joinedAt: number;
}

/** A 6-digit numeric join PIN, Kahoot-style. rng is injectable for tests. */
export function generateGamePin(rng: () => number = Math.random): string {
  let pin = "";
  for (let i = 0; i < 6; i += 1) pin += Math.floor(rng() * 10).toString();
  return pin;
}

export function isValidGamePin(pin: string): boolean {
  return /^[0-9]{6}$/.test(pin);
}

export function normalizeGamePin(input: string): string {
  return (input ?? "").replace(/\D+/g, "").slice(0, 6);
}

/** Picks `count` distinct question ids from the bank (Fisher–Yates with rng). */
export function sampleQuestionIds(
  all: BankQuestion[],
  count: number,
  rng: () => number = Math.random,
): string[] {
  const ids = all.map((q) => q.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, Math.max(0, Math.min(count, ids.length)));
}

/** Players ranked for the leaderboard: highest score first, then earliest join. */
export function sortPlayers(players: LivePlayer[]): LivePlayer[] {
  return [...players].sort(
    (a, b) => b.score - a.score || a.joinedAt - b.joinedAt,
  );
}

/** Top `n` ranked players. */
export function topPlayers(players: LivePlayer[], n: number): LivePlayer[] {
  return sortPlayers(players).slice(0, n);
}

/**
 * Speed-weighted points for an answer. A correct answer slides linearly from
 * POINTS_PER_CORRECT (instant) down to MIN_CORRECT_POINTS at the time limit;
 * a wrong (or out-of-time) answer scores 0. Result is rounded to a whole number.
 */
export function answerPoints(
  correct: boolean,
  elapsedMs: number,
  totalSeconds = QUESTION_SECONDS,
): number {
  if (!correct) return 0;
  const totalMs = Math.max(1, totalSeconds * 1000);
  const frac = Math.max(0, Math.min(1, elapsedMs / totalMs));
  return Math.round(
    POINTS_PER_CORRECT - (POINTS_PER_CORRECT - MIN_CORRECT_POINTS) * frac,
  );
}

/** Whole seconds left on the current question, floored at 0. */
export function secondsLeft(
  questionStartedAt: number,
  now: number,
  total = QUESTION_SECONDS,
): number {
  const elapsed = Math.floor((now - questionStartedAt) / 1000);
  return Math.max(0, total - elapsed);
}
