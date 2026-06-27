import { useCallback, useEffect, useRef, useState } from "react";
import { generatePracticeQuestion } from "../ai/practiceService";
import { bankQuestionToAi } from "../ai/practiceQuestion";
import { getRandomQuestion } from "../content/practiceBank";
import { isAiEnabled } from "../lib/aiSettings";
import { adaptiveSuggestion, type AdaptiveSuggestion } from "../ai/adaptive";
import type {
  AIPracticeQuestion,
  Difficulty,
  PracticeTopic,
} from "../ai/practiceTypes";

/** UI phases for a single adaptive practice session. */
export type PracticePhase = "loading" | "question" | "feedback" | "error";

/** How many recent prompts we ask the model to avoid repeating. */
const AVOID_WINDOW = 6;

export interface UseAdaptivePractice {
  phase: PracticePhase;
  question: AIPracticeQuestion | null;
  /** One entry per answered question (true = correct). */
  results: boolean[];
  /** Result of the most recent submission, null until something is answered. */
  lastCorrect: boolean | null;
  error: string | null;
  /** Adaptive nudge derived from the recent run of answers. */
  suggestion: AdaptiveSuggestion;
  difficulty: Difficulty;
  topic: PracticeTopic;
  /** Number of questions answered this session (for display). */
  answeredCount: number;
  /** Grade an answer locally and move to feedback. */
  submit: (answer: string) => void;
  /** Clear feedback and generate the next question. */
  next: () => void;
  /** Re-attempt generation after an error. */
  retry: () => void;
  /** Switch difficulty (e.g. accepting a level nudge) and load fresh. */
  setDifficulty: (d: Difficulty) => void;
}

/** True when the grading data needed for a numeric answer is present. */
function gradeNumeric(question: AIPracticeQuestion, answer: string): boolean {
  const value = question.value ?? 0;
  const tolerance =
    question.tolerance ?? Math.max(0.01, Math.abs(value) * 0.02);
  const parsed = Number(answer);
  if (Number.isNaN(parsed)) return false;
  return Math.abs(parsed - value) <= tolerance;
}

function gradeAnswer(question: AIPracticeQuestion, answer: string): boolean {
  if (question.type === "multipleChoice") {
    return answer === question.correctOptionId;
  }
  return gradeNumeric(question, answer);
}

/**
 * Orchestrates an AI practice session for a chosen topic + difficulty:
 * load a question, grade it client-side, surface feedback, and compute an
 * adaptive difficulty nudge from the recent run of answers.
 */
export function useAdaptivePractice(
  topic: PracticeTopic,
  initialDifficulty: Difficulty,
): UseAdaptivePractice {
  const [difficulty, setDifficultyState] =
    useState<Difficulty>(initialDifficulty);
  const [phase, setPhase] = useState<PracticePhase>("loading");
  const [question, setQuestion] = useState<AIPracticeQuestion | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prompts already shown this session, fed back to the model to avoid repeats.
  const seenPromptsRef = useRef<string[]>([]);
  // Bank ids already shown this session, excluded when AI is off.
  const seenBankIdsRef = useRef<string[]>([]);
  // Latest difficulty, readable from callbacks without stale closures.
  const difficultyRef = useRef<Difficulty>(initialDifficulty);
  // Monotonic request id so stale/aborted generations are ignored.
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    (forDifficulty: Difficulty) => {
      difficultyRef.current = forDifficulty;
      const reqId = (requestIdRef.current += 1);
      setPhase("loading");
      setError(null);
      setLastCorrect(null);

      // AI off (the default): serve the static bank directly — no network call.
      if (!isAiEnabled()) {
        const bank = getRandomQuestion(forDifficulty, seenBankIdsRef.current);
        if (!mountedRef.current || reqId !== requestIdRef.current) return;
        if (!bank) {
          setError("No practice questions are available.");
          setPhase("error");
          return;
        }
        seenBankIdsRef.current = [...seenBankIdsRef.current, bank.id];
        setQuestion(bankQuestionToAi(bank));
        setPhase("question");
        return;
      }

      const avoidPrompts = seenPromptsRef.current.slice(-AVOID_WINDOW);
      generatePracticeQuestion({ topic, difficulty: forDifficulty, avoidPrompts })
        .then((next) => {
          if (!mountedRef.current || reqId !== requestIdRef.current) return;
          seenPromptsRef.current = [...seenPromptsRef.current, next.prompt];
          setQuestion(next);
          setPhase("question");
        })
        .catch((err: unknown) => {
          if (!mountedRef.current || reqId !== requestIdRef.current) return;
          const message =
            err instanceof Error && err.message
              ? err.message
              : "We couldn't generate a problem right now.";
          setError(message);
          setPhase("error");
        });
    },
    [topic],
  );

  // Load the first question when the session begins.
  useEffect(() => {
    load(initialDifficulty);
    // Intentionally run once on mount; `load` is stable for a fixed topic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback(
    (answer: string) => {
      if (phase !== "question" || !question) return;
      const correct = gradeAnswer(question, answer);
      setResults((prev) => [...prev, correct]);
      setLastCorrect(correct);
      setPhase("feedback");
    },
    [phase, question],
  );

  const next = useCallback(() => {
    load(difficultyRef.current);
  }, [load]);

  const retry = useCallback(() => {
    load(difficultyRef.current);
  }, [load]);

  const setDifficulty = useCallback(
    (d: Difficulty) => {
      setDifficultyState(d);
      // Fresh start at the new level so the nudge banner resets.
      setResults([]);
      load(d);
    },
    [load],
  );

  const suggestion = adaptiveSuggestion(results, difficulty);

  return {
    phase,
    question,
    results,
    lastCorrect,
    error,
    suggestion,
    difficulty,
    topic,
    answeredCount: results.length,
    submit,
    next,
    retry,
    setDifficulty,
  };
}
