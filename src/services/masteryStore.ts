// Shared, live store for per-topic spaced-repetition mastery. A module-level
// singleton caches the signed-in user's mastery map so any answer surface
// (lessons, quizzes, Lab, AI hub, games) can record a result WITHOUT a
// read-before-write per answer, while the dashboard meters and review queue stay
// live via useSyncExternalStore. The pure scheduling math lives in lib/srs.

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  getCourseProgress,
  persistTopicMastery,
  recordDailyProgress,
} from "./progressService";
import {
  dueTopics,
  initialMastery,
  reviewMastery,
  type TopicMasteryEntry,
} from "../lib/srs";
import type { Difficulty } from "../ai/practiceTypes";

interface StoreState {
  uid: string | null;
  loaded: boolean;
  map: Record<string, TopicMasteryEntry>;
}

let state: StoreState = { uid: null, loaded: false, map: {} };
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function setState(next: Partial<StoreState>): void {
  state = { ...state, ...next };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StoreState {
  return state;
}

/** Load a user's mastery map once. Re-loads only when the uid changes. */
export async function loadMastery(uid: string): Promise<void> {
  if (state.uid === uid && state.loaded) return;
  // Attribute subsequent records to this uid right away.
  setState({ uid, loaded: false, map: {} });
  try {
    const cp = await getCourseProgress(uid);
    if (state.uid !== uid) return; // a newer load superseded this one
    setState({ uid, loaded: true, map: cp?.topicMastery ?? {} });
  } catch {
    if (state.uid !== uid) return;
    setState({ uid, loaded: true, map: {} });
  }
}

/** Clear on sign-out so the next user never sees stale data. */
export function resetMastery(): void {
  setState({ uid: null, loaded: false, map: {} });
}

/**
 * Fold one graded answer into a topic's mastery and persist it. Ensures the
 * user's map is loaded first (so we never overwrite existing Firestore state
 * with a fresh entry), optimistically updates the in-memory map so meters/queue
 * react live, then writes the single nested field. No-op without a uid/topic.
 */
export async function recordTopicResult(
  uid: string,
  topicId: string,
  correct: boolean,
  difficulty: Difficulty,
  now: number = Date.now(),
): Promise<void> {
  if (!uid || !topicId) return;
  if (state.uid !== uid || !state.loaded) {
    await loadMastery(uid);
  }
  const prev = state.map[topicId] ?? initialMastery(now);
  const next = reviewMastery(prev, correct, difficulty, now);
  setState({ map: { ...state.map, [topicId]: next } });
  try {
    await persistTopicMastery(uid, topicId, next);
  } catch {
    // Best-effort: a failed write just means this answer wasn't scheduled; the
    // next successful answer re-persists from the optimistic in-memory state.
  }
  // Count this answer toward the daily goal + streak. Deferred + caught so a
  // failure (or a test that mocks progressService without this fn) never breaks
  // the mastery write above.
  Promise.resolve()
    .then(() => recordDailyProgress(uid))
    .catch(() => {});
}

/** Non-React getter for the current map (e.g. for the review session). */
export function getMasteryMap(): Record<string, TopicMasteryEntry> {
  return state.map;
}

/** Non-React getter for the due topic ids, weakest/most-overdue first. */
export function getDueTopicIds(now: number = Date.now()): string[] {
  return dueTopics(state.map, now);
}

export interface UseMastery {
  loaded: boolean;
  map: Record<string, TopicMasteryEntry>;
  /** Topic ids due for review now, most in need first. */
  dueTopicIds: string[];
  /** Record one graded answer for a topic (no-op when signed out). */
  record: (topicId: string, correct: boolean, difficulty: Difficulty) => void;
}

/**
 * React hook over the shared mastery store. Loads the signed-in user's map on
 * mount, exposes a live snapshot + due queue, and a `record` helper that any
 * answer surface can fire on each graded answer.
 */
export function useMastery(): UseMastery {
  const { user } = useAuth();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (user) void loadMastery(user.uid);
    else resetMastery();
  }, [user]);

  const record = useCallback(
    (topicId: string, correct: boolean, difficulty: Difficulty) => {
      if (user) void recordTopicResult(user.uid, topicId, correct, difficulty);
    },
    [user],
  );

  const dueTopicIds = useMemo(
    () => dueTopics(snap.map, Date.now()),
    [snap.map],
  );

  return { loaded: snap.loaded, map: snap.map, dueTopicIds, record };
}
