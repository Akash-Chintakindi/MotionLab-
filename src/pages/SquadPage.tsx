import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useMastery } from "../services/masteryStore";
import { AppShell } from "../components/AppShell";
import { Spinner } from "../components/Spinner";
import { GameLobby } from "../components/livegame/GameLobby";
import { QuestionStage } from "../components/livegame/QuestionStage";
import { Podium } from "../components/livegame/Podium";
import { Leaderboard } from "../components/livegame/Leaderboard";
import { useLiveGame } from "../hooks/useLiveGame";
import { bankQuestions } from "../content/practiceBank";
import {
  createGame,
  joinGame,
  nextQuestion,
  revealAnswer,
  startGame,
  submitAnswer,
} from "../services/liveGameService";
import {
  DEFAULT_QUESTION_COUNT,
  isValidGamePin,
  normalizeGamePin,
  sampleQuestionIds,
  secondsLeft as secondsLeftOf,
} from "../lib/liveGame";

type Role = "host" | "player";

export default function SquadPage() {
  const { user } = useAuth();
  const { record } = useMastery();

  const qMap = useMemo(
    () => new Map(bankQuestions().map((q) => [q.id, q] as const)),
    [],
  );

  const [pin, setPin] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const { game, players } = useLiveGame(pin);

  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "Anonymous";

  const exit = useCallback(() => {
    setPin(null);
    setRole(null);
  }, []);

  // --- Host countdown + auto-reveal -------------------------------------------
  const [now, setNow] = useState(() => Date.now());
  const revealedForIndex = useRef(-1);

  useEffect(() => {
    if (!game || game.status !== "active" || game.phase !== "question") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [game?.status, game?.phase, game?.currentIndex, game]);

  useEffect(() => {
    if (role !== "host" || !pin || !game) return;
    if (game.status !== "active" || game.phase !== "question") return;
    const left = secondsLeftOf(game.questionStartedAt, now);
    if (left <= 0 && revealedForIndex.current !== game.currentIndex) {
      revealedForIndex.current = game.currentIndex;
      void revealAnswer(pin);
    }
  }, [role, pin, game, now]);

  if (!user) return null;

  // --- Menu (not in a game yet) ----------------------------------------------
  if (!pin) {
    return (
      <AppShell>
        <section data-testid="squad-page" className="mx-auto w-full max-w-2xl py-2">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Squad Clash
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Host a live quiz and battle your class in real time — everyone gets the
            same questions, 1000 points each, fastest to the top.
          </p>
          <GameMenu
            displayName={displayName}
            uid={user.uid}
            onHosted={(p) => {
              setRole("host");
              setPin(p);
            }}
            onJoined={(p) => {
              setRole("player");
              setPin(p);
            }}
          />
        </section>
      </AppShell>
    );
  }

  // --- In a game --------------------------------------------------------------
  return (
    <AppShell>
      <section className="mx-auto w-full max-w-2xl py-2">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Squad Clash
          </h1>
          <button
            type="button"
            onClick={exit}
            className="text-sm font-medium text-slate-400 transition hover:text-rose-600"
          >
            Exit
          </button>
        </div>

        {!game ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner label="Connecting to the game…" />
          </div>
        ) : game.status === "lobby" ? (
          <GameLobby
            game={game}
            players={players}
            role={role!}
            meUid={user.uid}
            onStart={() => startGame(pin)}
          />
        ) : game.status === "ended" ? (
          <EndScreen
            players={players}
            meUid={user.uid}
            onExit={exit}
          />
        ) : (
          <ActiveQuestion
            pin={pin}
            game={game}
            players={players}
            role={role!}
            uid={user.uid}
            now={now}
            qMap={qMap}
            onAnswered={(topicId, correct, difficulty) =>
              record(topicId, correct, difficulty)
            }
          />
        )}
      </section>
    </AppShell>
  );
}

function ActiveQuestion({
  pin,
  game,
  players,
  role,
  uid,
  now,
  qMap,
  onAnswered,
}: {
  pin: string;
  game: import("../lib/liveGame").LiveGame;
  players: import("../lib/liveGame").LivePlayer[];
  role: Role;
  uid: string;
  now: number;
  qMap: Map<string, import("../content/practiceBank/types").BankQuestion>;
  onAnswered: (
    topicId: string,
    correct: boolean,
    difficulty: "easy" | "medium" | "hard",
  ) => void;
}) {
  const total = game.questionIds.length;
  const question = qMap.get(game.questionIds[game.currentIndex]);

  if (!question) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
        <p className="text-slate-600">Loading question…</p>
      </div>
    );
  }

  const left = secondsLeftOf(game.questionStartedAt, now);
  const answeredCount = players.filter(
    (p) => p.answeredIndex >= game.currentIndex,
  ).length;

  return (
    <QuestionStage
      key={game.currentIndex}
      question={question}
      role={role}
      phase={game.phase}
      meUid={uid}
      questionNumber={game.currentIndex + 1}
      totalQuestions={total}
      secondsLeft={left}
      questionStartedAt={game.questionStartedAt}
      players={players}
      answeredCount={answeredCount}
      totalPlayers={players.length}
      onAnswered={(correct, points) => {
        // Score the live game (speed-weighted points) AND feed the
        // spaced-repetition mastery model so a student's wrong answers here
        // still inform later grading.
        void submitAnswer(pin, uid, game.currentIndex, correct, points);
        onAnswered(question.topicId, correct, question.difficulty);
      }}
      onReveal={() => revealAnswer(pin)}
      onNext={() => nextQuestion(pin, game.currentIndex + 1, total)}
      isLast={game.currentIndex + 1 >= total}
    />
  );
}

function EndScreen({
  players,
  meUid,
  onExit,
}: {
  players: import("../lib/liveGame").LivePlayer[];
  meUid?: string;
  onExit: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-b from-brand-50 to-white p-6 ring-1 ring-slate-200/80">
        <p className="text-center font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent-600">
          Final results
        </p>
        <h2 className="mb-6 mt-1 text-center font-display text-2xl font-bold text-ink">
          🏆 Podium
        </h2>
        <Podium players={players} meUid={meUid} />
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <Leaderboard players={players} meUid={meUid} count={5} title="Top 5" />
      </div>

      <button
        type="button"
        onClick={onExit}
        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-700"
      >
        Back to Squad Clash
      </button>
    </div>
  );
}

function GameMenu({
  uid,
  displayName,
  onHosted,
  onJoined,
}: {
  uid: string;
  displayName: string;
  onHosted: (pin: string) => void;
  onJoined: (pin: string) => void;
}) {
  const [joinPin, setJoinPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const host = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const ids = sampleQuestionIds(bankQuestions(), DEFAULT_QUESTION_COUNT);
      const game = await createGame(uid, displayName, ids);
      onHosted(game.pin);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the game.");
      setBusy(false);
    }
  };

  const join = async () => {
    if (busy) return;
    const pin = normalizeGamePin(joinPin);
    if (!isValidGamePin(pin)) {
      setError("Enter the 6-digit game PIN.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await joinGame(pin, uid, displayName);
      onJoined(pin);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join that game.");
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
        >
          {error}
        </p>
      )}

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <h2 className="font-display text-lg font-bold text-ink">Host a game</h2>
        <p className="mt-1 text-sm text-slate-500">
          Get a PIN, share it with your class, and run the quiz live.
        </p>
        <button
          type="button"
          onClick={host}
          disabled={busy}
          data-testid="live-host"
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Host a new game"}
        </button>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <h2 className="font-display text-lg font-bold text-ink">Join a game</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter the 6-digit PIN your host shared.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={joinPin}
            onChange={(e) => setJoinPin(normalizeGamePin(e.target.value))}
            placeholder="123456"
            data-testid="live-join-pin"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-center font-display text-xl tabular-nums tracking-[0.3em] outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={join}
            disabled={busy || !joinPin}
            data-testid="live-join"
            className="shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
