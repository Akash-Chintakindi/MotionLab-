import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useProgress } from "../hooks/useProgress";
import { getLesson } from "../content/course";
import { getQuiz } from "../content/quizzes";
import { nextDestination } from "../lib/lessonFlow";
import { QUIZ_PASS_PERCENT, modesUnlocked, quizPassed } from "../lib/gating";
import {
  awardProgressMilestones,
  recordDailyActivity,
  recordQuizScore,
  unlockNextLesson,
} from "../services/progressService";
import { AppShell } from "../components/AppShell";
import { Spinner } from "../components/Spinner";
import { QuizRunner } from "../components/quiz/QuizRunner";

export default function QuizPage() {
  const { lessonId = "" } = useParams();
  const { user } = useAuth();
  const { loading, isUnlocked, courseProgress } = useProgress();
  const lesson = getLesson(lessonId);
  const quiz = getQuiz(lessonId);
  const next = nextDestination(lessonId, "quiz") ?? undefined;
  const masteryReady = modesUnlocked(courseProgress, lessonId);

  const onComplete = useCallback(
    async (scorePct: number) => {
      if (!user) return;
      await recordQuizScore(user.uid, lessonId, scorePct);
      await recordDailyActivity(user.uid);
      // Only a passing score (>= 70%) unlocks the next topic.
      if (quizPassed(scorePct)) {
        await unlockNextLesson(user.uid, lessonId);
      }
      await awardProgressMilestones(user.uid);
    },
    [user, lessonId],
  );

  if (!lesson || !quiz) {
    return (
      <Frame>
        <Empty title="Quiz coming soon">
          <p className="mb-4 text-slate-500">
            This lesson doesn't have a quiz yet.
          </p>
          <BackLink />
        </Empty>
      </Frame>
    );
  }

  if (loading) {
    return (
      <Frame>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner label="Loading quiz…" />
        </div>
      </Frame>
    );
  }

  if (!isUnlocked(lessonId)) {
    return (
      <Frame>
        <Empty title="This quiz is locked">
          <p className="mb-4 text-slate-500">
            Finish the earlier lessons to unlock it.
          </p>
          <BackLink />
        </Empty>
      </Frame>
    );
  }

  if (!masteryReady) {
    return (
      <Frame>
        <Empty title="Master the lesson first">
          <p className="mb-4 text-slate-500">
            Score 80%+ on the Learn section to unlock this quiz.
          </p>
          <Link
            to={`/lesson/${lessonId}`}
            className="font-semibold text-brand-600"
          >
            Go to the lesson
          </Link>
        </Empty>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="mb-4">
        <Link
          to="/"
          className="mb-3 inline-block text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Course
        </Link>
        <h1 className="font-display text-xl font-bold tracking-tight text-ink">
          {lesson.title}
        </h1>
        <p className="text-sm text-slate-500">Quiz · {quiz.questions.length} questions</p>
      </div>
      <QuizRunner
        quiz={quiz}
        onComplete={onComplete}
        next={next}
        passThreshold={QUIZ_PASS_PERCENT}
      />
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </AppShell>
  );
}

function BackLink() {
  return (
    <Link to="/" className="font-semibold text-brand-600">
      Back to course
    </Link>
  );
}

function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-xl font-bold">{title}</h1>
      {children}
    </div>
  );
}
