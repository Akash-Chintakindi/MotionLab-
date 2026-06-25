import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generatePracticeQuestion } from "../ai/practiceService";
import { getRandomQuestion } from "../content/practiceBank";
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

/** Wrong answers (Xs) that end a run. */
export const MAX_STRIKES = 3;

/** How many recent prompts we ask the model to avoid repeating. */
const AVOID_WINDOW = 6;

/** UI phases for a survival run. */
export type LabPhase = "loading" | "question" | "feedback" | "over";

export interface UseLabSurvival {
  phase: LabPhase;
  /** +1 per correct answer. */
  score: number;
  /** Wrong answers so far, 0..MAX_STRIKES. */
  strikes: number;
  maxStrikes: number;
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
  /** Grade an answer, update score/strikes/difficulty, advance the phase. */
  submit: (answer: string) => void;
  /** Clear feedback and load the next question. */
  next: () => void;
  /** Start a fresh run from scratch. */
  restart: () => void;
}

/**
 * Drives a Lab survival run: loads a mixed-topic question (AI first, static
 * bank as a graceful fallback), grades it locally, tracks score/strikes and an
 * adaptive difficulty level, and compiles a weak-areas report for game over.
 * Persistence (high score, leaderboard) is intentionally left to the page.
 */
export function useLabSurvival(): UseLabSurvival {
  const [phase, setPhase] = useState<LabPhase>("loading");
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [question, setQuestion] = useState<LabQuestion | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [adaptive, setAdaptive] = useState<AdaptiveState>(INITIAL_ADAPTIVE);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [reviewTopicId, setReviewTopicId] = useState<string | null>(null);

  const topicsRef = useRef(practiceTopics());
  // Authoritative copies read from callbacks without stale closures.
  const adaptiveRef = useRef<AdaptiveState>(INITIAL_ADAPTIVE);
  const scoreRef = useRef(0);
  const strikesRef = useRef(0);
  const phaseRef = useRef<LabPhase>("loading");
  const questionRef = useRef<LabQuestion | null>(null);
  // Avoid repeats: prompts fed back to the model; bank ids excluded locally.
  const seenPromptsRef = useRef<string[]>([]);
  const seenBankIdsRef = useRef<string[]>([]);
  // Monotonic request id so stale/aborted loads are ignored.
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setPhaseBoth = useCallback((p: LabPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const load = useCallback(
    (difficulty: Difficulty) => {
      const reqId = (requestIdRef.current += 1);
      setPhaseBoth("loading");
      setLastCorrect(null);

      const topics = topicsRef.current;
      const topic =
        topics[Math.floor(Math.random() * topics.length)] ?? topics[0];
      const avoidPrompts = seenPromptsRef.current.slice(-AVOID_WINDOW);

      // AI is the primary source; the static bank is a graceful fallback so the
      // run keeps going when AI isn't provisioned. When AI is later enabled
      // this path "just works" with no other changes.
      generatePracticeQuestion({ topic, difficulty, avoidPrompts })
        .then((q) => aiToLabQuestion(q, topic.id, difficulty))
        .catch(() => {
          const bank = getRandomQuestion(difficulty, seenBankIdsRef.current);
          if (!bank) throw new Error("No practice questions are available.");
          return bankToLabQuestion(bank);
        })
        .then((q) => {
          if (!mountedRef.current || reqId !== requestIdRef.current) return;
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

  // Load the first question once when the run begins.
  useEffect(() => {
    load("easy");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      strikesRef.current += 1;
      setStrikes(strikesRef.current);
      setPhaseBoth(strikesRef.current >= MAX_STRIKES ? "over" : "feedback");
    },
    [setPhaseBoth],
  );

  const next = useCallback(() => {
    if (phaseRef.current !== "feedback") return;
    setReviewTopicId(null);
    load(adaptiveRef.current.difficulty);
  }, [load]);

  const restart = useCallback(() => {
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
    load("easy");
  }, [load]);

  const report = useMemo(() => weakAreas(records), [records]);

  return {
    phase,
    score,
    strikes,
    maxStrikes: MAX_STRIKES,
    question,
    difficulty: adaptive.difficulty,
    lastCorrect,
    reviewTopicId,
    records,
    report,
    answeredCount: records.length,
    submit,
    next,
    restart,
  };
}
