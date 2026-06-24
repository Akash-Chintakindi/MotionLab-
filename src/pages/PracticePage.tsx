import { Suspense, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useProgress } from "../hooks/useProgress";
import { getLesson } from "../content/course";
import { getGame } from "../games/registry";
import { nextDestination } from "../lib/lessonFlow";
import {
  recordDailyActivity,
  recordPracticeScore,
} from "../services/progressService";
import { AppShell } from "../components/AppShell";
import { Spinner } from "../components/Spinner";

const GAME_NAMES: Record<string, string> = {
  "lesson-1-position-velocity": "Drive the Cart",
  "lesson-2-velocity-acceleration": "Acceleration Pilot",
  "lesson-3-displacement-area": "Area Painter",
  "lesson-4-acceleration-to-position": "Integral Stack",
  "lesson-5-two-dimensions": "Coordinate Courier",
  "lesson-6-projectile-motion": "Cannon Range",
  "lesson-7-mastery-challenge": "Boss Rush",
};

export default function PracticePage() {
  const { lessonId = "" } = useParams();
  const { user } = useAuth();
  const { loading, isUnlocked } = useProgress();
  const lesson = getLesson(lessonId);
  const Game = getGame(lessonId);
  const next = nextDestination(lessonId, "practice") ?? undefined;

  const onScore = useCallback(
    async (best: number) => {
      if (!user) return;
      await recordPracticeScore(user.uid, lessonId, best);
      await recordDailyActivity(user.uid);
    },
    [user, lessonId],
  );

  if (!lesson || !Game) {
    return (
      <AppShell>
        <Empty title="Practice coming soon">
          <p className="mb-4 text-slate-500">
            This lesson's practice game is on the way.
          </p>
          <Link to="/" className="font-semibold text-brand-600">
            Back to course
          </Link>
        </Empty>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner label="Loading practice…" />
        </div>
      </AppShell>
    );
  }

  if (!isUnlocked(lessonId)) {
    return (
      <AppShell>
        <Empty title="This practice is locked">
          <p className="mb-4 text-slate-500">
            Finish the earlier lessons to unlock it.
          </p>
          <Link to="/" className="font-semibold text-brand-600">
            Back to course
          </Link>
        </Empty>
      </AppShell>
    );
  }

  return (
    <AppShell>
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
        <p className="text-sm text-slate-500">
          Practice{GAME_NAMES[lessonId] ? ` · ${GAME_NAMES[lessonId]}` : ""}
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner label="Loading game…" />
          </div>
        }
      >
        <Game onScore={onScore} next={next} />
      </Suspense>
    </AppShell>
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
