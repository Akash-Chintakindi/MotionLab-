import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPracticeQuestion } from "../ai/practiceQuestion";
import { practiceTopics } from "../ai/topics";
import { gradeQuestion, type QuizAnswer } from "../lib/quiz";
import type { Difficulty } from "../ai/practiceTypes";
import {
  INITIAL_ADAPTIVE,
  aiToLabQuestion,
  applyAnswer,
  bankToLabQuestion,
  weakAreas,
  type AdaptiveState,
  type AnswerRecord,
  type LabQuestion,
  type WeakArea,
} from "../lib/labAdaptive";

/** Wrong answers (Xs) that end a Survival run. */
export const MAX_STRIKES = 3;

/** Allowed range for a Time-mode run, in minutes. */
export const MIN_TIME_MINUTES = 1;
export const MAX_TIME_MINUTES = 30;

/** How many recent prompts we ask the model to avoid repeating. */
const AVOID_WINDOW = 6;

export type LabMode = "survival" | "time";

/** UI phases. "menu" is the pre-game mode picker; the rest drive a live run. */
export type LabPhase = "menu" | "loading" | "question" | "feedback" | "over";

export interface LabRunConfig {
  mode: LabMode;
  /** Time mode only: total run length in seconds. */
  durationSec?: number;
}

export interface UseLabSurvival {
  phase: LabPhase;
  /** Which mode the active (or last) run used; null before the first run. */
  mode: LabMode | null;
  /** +1 per correct answer. */
  score: number;
  /** Wrong answers so far (Survival mode), 0..MAX_STRIKES. */
  strikes: number;
  maxStrikes: number;
  /** Seconds left in a Time run, or null in Survival. */
  timeRemaining: number | null;
  /** Total seconds a Time run was configured for, or null. */
  durationSec: number | null;
  /** The current (or last) question; kept around on game over for feedback. */
  question: LabQuestion | null;
  /** Current adaptive difficulty level. */
  difficulty: Difficulty;
  /** Result of the most recent submission; null before anything is answered. */
  lastCorrect: boolean | null;
  /** Topic to review when the easy-wrong streak fires, else null. */
  reviewTopicId: string | null;
  /** One record per answered question. */
  records: AnswerRecord[];
  /** Topics/difficulties missed this run, most missed first. */
  report: WeakArea[];
  answeredCount: number;
  /** Begin a run with the chosen mode (called after the 3-2-1 countdown). */
  begin: (config: LabRunConfig) => void;
  /** Grade an answer, update score/strikes/difficulty, advance the phase. */
  submit: (answer: string) => void;
  /** Clear feedback and load the next question. */
  next: () => void;
  /** Return to the mode-select menu (resets the run). */
  toMenu: () => void;
}

/**
 * Drives a Lab run in either Survival (3 strikes) or Time (countdown) mode. It
 * loads mixed-topic questions (AI first, static bank as a graceful fallback),
 * grades them locally, tracks score and an adaptive difficulty level, and
 * compiles a weak-areas report for game over. Persistence (high score,
 * leaderboard) is intentionally left to the page.
 */
export function useLabSurvival(): UseLabSurvival {
  const [phase, setPhase] = useState<LabPhase>("menu");
  const [mode, setMode] = useState<LabMode | null>(null);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [question, setQuestion] = useState<LabQuestion | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [adaptive, setAdaptive] = useState<AdaptiveState>(INITIAL_ADAPTIVE);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [reviewTopicId, setReviewTopicId] = useState<string | null>(null);

  const topicsRef = useRef(practiceTopics());
  // Authoritative copies read from callbacks without stale closures.
  const modeRef = useRef<LabMode | null>(null);
  const adaptiveRef = useRef<AdaptiveState>(INITIAL_ADAPTIVE);
  const scoreRef = useRef(0);
  const strikesRef = useRef(0);
  const phaseRef = useRef<LabPhase>("menu");
  const questionRef = useRef<LabQuestion | null>(null);
  // Avoid repeats: prompts fed back to the model; bank ids excluded locally.
  const seenPromptsRef = useRef<string[]>([]);
  const seenBankIdsRef = useRef<string[]>([]);
  // Monotonic request id so stale/aborted loads are ignored.
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  const setPhaseBoth = useCallback((p: LabPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const endRun = useCallback(() => {
    clearTimer();
    setPhaseBoth("over");
  }, [clearTimer, setPhaseBoth]);

  const load = useCallback(
    (difficulty: Difficulty) => {
      const reqId = (requestIdRef.current += 1);
      setPhaseBoth("loading");
      setLastCorrect(null);

      const topics = topicsRef.current;
      const topic =
        topics[Math.floor(Math.random() * topics.length)] ?? topics[0];
      const avoidPrompts = seenPromptsRef.current.slice(-AVOID_WINDOW);

      // The gating helper honors the global AI toggle: AI questions when it's
      // enabled (with a graceful bank fallback on error), or the static bank
      // directly — with no network call — when it's off (the default).
      getPracticeQuestion({
        topic,
        difficulty,
        avoidPrompts,
        excludeBankIds: seenBankIdsRef.current,
      })
        .then((res) =>
          res.source === "ai"
            ? aiToLabQuestion(res.question, topic.id, difficulty)
            : bankToLabQuestion(res.question),
        )
        .then((q) => {
          if (!mountedRef.current || reqId !== requestIdRef.current) return;
          // A Time run can expire while a question is still loading.
          if (phaseRef.current === "over") return;
          if (q.source === "ai") {
            seenPromptsRef.current = [...seenPromptsRef.current, q.prompt];
          } else {
            seenBankIdsRef.current = [...seenBankIdsRef.current, q.id];
          }
          questionRef.current = q;
          setQuestion(q);
          setPhaseBoth("question");
        })
        .catch(() => {
          // Unreachable in practice (the bank always has questions), but never
          // dead-end the player: stay in loading so a retry can recover.
        });
    },
    [setPhaseBoth],
  );

  const resetRunState = useCallback(() => {
    requestIdRef.current += 1;
    clearTimer();
    scoreRef.current = 0;
    strikesRef.current = 0;
    adaptiveRef.current = INITIAL_ADAPTIVE;
    questionRef.current = null;
    seenPromptsRef.current = [];
    seenBankIdsRef.current = [];
    setScore(0);
    setStrikes(0);
    setAdaptive(INITIAL_ADAPTIVE);
    setRecords([]);
    setLastCorrect(null);
    setReviewTopicId(null);
    setQuestion(null);
  }, [clearTimer]);

  const begin = useCallback(
    (config: LabRunConfig) => {
      resetRunState();
      modeRef.current = config.mode;
      setMode(config.mode);

      if (config.mode === "time") {
        const total = Math.max(1, Math.round(config.durationSec ?? 0));
        setDurationSec(total);
        setTimeRemaining(total);
        timerRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            const left = (prev ?? 0) - 1;
            if (left <= 0) {
              endRun();
              return 0;
            }
            return left;
          });
        }, 1000);
      } else {
        setDurationSec(null);
        setTimeRemaining(null);
      }

      load("easy");
    },
    [resetRunState, load, endRun],
  );

  const submit = useCallback(
    (answer: string) => {
      if (phaseRef.current !== "question") return;
      const q = questionRef.current;
      if (!q) return;

      const quizAnswer: QuizAnswer =
        q.type === "multipleChoice"
          ? { kind: "option", optionId: answer }
          : { kind: "numeric", value: answer };
      const correct = gradeQuestion(q, quizAnswer);

      setLastCorrect(correct);
      setRecords((prev) => [
        ...prev,
        { topicId: q.topicId, difficulty: q.difficulty, correct },
      ]);

      const step = applyAnswer(adaptiveRef.current, correct);
      adaptiveRef.current = step.next;
      setAdaptive(step.next);
      setReviewTopicId(step.reviewLesson ? q.topicId : null);

      if (correct) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        setPhaseBoth("feedback");
        return;
      }

      // Strikes only end a Survival run; Time runs play on until the clock ends.
      if (modeRef.current === "survival") {
        strikesRef.current += 1;
        setStrikes(strikesRef.current);
        if (strikesRef.current >= MAX_STRIKES) {
          endRun();
          return;
        }
      }
      setPhaseBoth("feedback");
    },
    [setPhaseBoth, endRun],
  );

  const next = useCallback(() => {
    if (phaseRef.current !== "feedback") return;
    setReviewTopicId(null);
    load(adaptiveRef.current.difficulty);
  }, [load]);

  const toMenu = useCallback(() => {
    resetRunState();
    modeRef.current = null;
    setMode(null);
    setDurationSec(null);
    setTimeRemaining(null);
    setPhaseBoth("menu");
  }, [resetRunState, setPhaseBoth]);

  const report = useMemo(() => weakAreas(records), [records]);

  return {
    phase,
    mode,
    score,
    strikes,
    maxStrikes: MAX_STRIKES,
    timeRemaining,
    durationSec,
    question,
    difficulty: adaptive.difficulty,
    lastCorrect,
    reviewTopicId,
    records,
    report,
    answeredCount: records.length,
    begin,
    submit,
    next,
    toMenu,
  };
}
