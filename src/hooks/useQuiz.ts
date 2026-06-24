import { useCallback, useMemo, useState } from "react";
import type { QuizQuestion } from "../types/content";
import { gradeQuestion, quizScorePct, type QuizAnswer } from "../lib/quiz";

export type QuizPhase = "answering" | "feedback" | "done";

export interface QuizItemResult {
  questionId: string;
  correct: boolean;
}

export interface QuizController {
  index: number;
  total: number;
  question: QuizQuestion;
  phase: QuizPhase;
  /** Result of the most recent submission (null while answering). */
  lastCorrect: boolean | null;
  results: QuizItemResult[];
  correctCount: number;
  scorePct: number;
  isLast: boolean;
  submit: (answer: QuizAnswer) => void;
  next: () => void;
  restart: () => void;
}

/** Drives the quiz flow: answer -> feedback -> next, ending in a score screen. */
export function useQuiz(questions: QuizQuestion[]): QuizController {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<QuizPhase>("answering");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<QuizItemResult[]>([]);

  const total = questions.length;
  const question = questions[index];
  const isLast = index === total - 1;
  const correctCount = useMemo(
    () => results.filter((r) => r.correct).length,
    [results],
  );

  const submit = useCallback(
    (answer: QuizAnswer) => {
      if (phase !== "answering" || !question) return;
      const correct = gradeQuestion(question, answer);
      setLastCorrect(correct);
      setResults((prev) => [...prev, { questionId: question.id, correct }]);
      setPhase("feedback");
    },
    [phase, question],
  );

  const next = useCallback(() => {
    if (phase !== "feedback") return;
    if (isLast) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setLastCorrect(null);
    setPhase("answering");
  }, [phase, isLast]);

  const restart = useCallback(() => {
    setIndex(0);
    setPhase("answering");
    setLastCorrect(null);
    setResults([]);
  }, []);

  return {
    index,
    total,
    question,
    phase,
    lastCorrect,
    results,
    correctCount,
    scorePct: quizScorePct(correctCount, total),
    isLast,
    submit,
    next,
    restart,
  };
}
