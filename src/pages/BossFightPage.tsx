// ---------------------------------------------------------------------------
// BossFightPage — route target for /games/boss/:bossId. Resolves the boss
// config, enforces the unlock gate, picks the themed weapon at the earned tier
// (mini-bosses) or shows the finale weapon picker (PRD 6.4), then mounts the
// BossFight and persists the outcome via recordBossResult + useHighScore.
// ---------------------------------------------------------------------------

import { useCallback, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AppShell } from "../components/AppShell";
import { Spinner } from "../components/Spinner";
import { useProgress } from "../hooks/useProgress";
import { useHighScore } from "../games/arcade/useHighScore";
import { recordBossResult } from "../services/progressService";
import {
  getLeaderboard,
  recordLeaderboardScore,
} from "../services/leaderboardService";
import { weaponTierFor } from "../lib/gating";
import { bossById, miniBosses } from "../games/arcade/boss/bossRegistry";
import { weaponForLesson } from "../games/arcade/boss/weapons";
import { BossFight } from "../games/arcade/boss/BossFight";
import type { ArcadeLeaderboard } from "../games/arcade/types";
import type {
  BossConfig,
  BossFightResult,
  WeaponConfig,
  WeaponTier,
} from "../games/arcade/boss/bossTypes";

export default function BossFightPage() {
  const { bossId = "" } = useParams();
  const config = bossById(bossId);
  if (!config) return <Navigate to="/games/bosses" replace />;
  return <BossFightResolved config={config} />;
}

function BossFightResolved({ config }: { config: BossConfig }) {
  const { user } = useAuth();
  const { loading, courseProgress, bossUnlocked, finaleUnlocked, refresh } =
    useProgress();
  const { highScore, submit } = useHighScore(`boss:${config.id}`);

  const isFinale = config.lessonId === null;

  const leaderboard = useMemo<ArcadeLeaderboard | undefined>(() => {
    if (!user) return undefined;
    const gameId = `boss:${config.id}`;
    const name = user.displayName || user.email?.split("@")[0] || "Anonymous";
    return {
      playerId: user.uid,
      playerName: name,
      publish: (score) => recordLeaderboardScore(user.uid, name, gameId, score),
      fetchTop: (topN) => getLeaderboard(gameId, topN),
    };
  }, [user, config.id]);

  const onResult = useCallback(
    async (r: BossFightResult) => {
      if (!user) return;
      submit(r.score);
      try {
        await recordBossResult(user.uid, config.id, {
          score: r.score,
          defeated: r.defeated,
          stars: r.stars,
          weaponTierUsed: r.weaponTierUsed,
        });
      } catch {
        /* local high score already saved; ignore remote failure */
      }
      await refresh();
    },
    [user, config.id, submit, refresh],
  );

  if (loading) {
    return (
      <Frame>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner label="Loading boss…" />
        </div>
      </Frame>
    );
  }

  const unlocked = isFinale
    ? finaleUnlocked()
    : config.lessonId
      ? bossUnlocked(config.lessonId)
      : false;

  if (!unlocked) {
    return (
      <Frame>
        <LockedPanel config={config} isFinale={isFinale} />
      </Frame>
    );
  }

  if (isFinale) {
    return (
      <Frame>
        <FinaleFight
          config={config}
          courseProgress={courseProgress}
          highScore={highScore}
          leaderboard={leaderboard}
          onResult={onResult}
        />
      </Frame>
    );
  }

  // Mini-boss: themed weapon at the best-score tier (defensively clamp null->1).
  const lessonId = config.lessonId!;
  const weapon = weaponForLesson(lessonId);
  const tier =
    weaponTierFor(courseProgress?.quizScores?.[lessonId] ?? 0) ?? 1;

  return (
    <Frame>
      <Heading />
      <BossFight
        config={config}
        weapon={weapon}
        tier={tier}
        highScore={highScore}
        leaderboard={leaderboard}
        onResult={onResult}
      />
    </Frame>
  );
}

interface EarnedWeapon {
  weapon: WeaponConfig;
  tier: WeaponTier;
  bossName: string;
  lessonId: string;
}

function FinaleFight({
  config,
  courseProgress,
  highScore,
  leaderboard,
  onResult,
}: {
  config: BossConfig;
  courseProgress: ReturnType<typeof useProgress>["courseProgress"];
  highScore: number;
  leaderboard?: ArcadeLeaderboard;
  onResult: (r: BossFightResult) => void;
}) {
  // PRD 6.4: the finale is the one fight where the player brings any earned
  // weapon at the tier they earned. Build the loadout from the mini-bosses'
  // lessons that have a passing (>= tier 1) quiz score.
  const earned = useMemo<EarnedWeapon[]>(() => {
    const out: EarnedWeapon[] = [];
    for (const boss of miniBosses) {
      if (!boss.lessonId) continue;
      const tier = weaponTierFor(courseProgress?.quizScores?.[boss.lessonId] ?? 0);
      if (!tier) continue;
      out.push({
        weapon: weaponForLesson(boss.lessonId),
        tier,
        bossName: boss.name,
        lessonId: boss.lessonId,
      });
    }
    return out;
  }, [courseProgress]);

  const [picked, setPicked] = useState<EarnedWeapon | null>(null);

  if (picked) {
    return (
      <>
        <Heading />
        <BossFight
          config={config}
          weapon={picked.weapon}
          tier={picked.tier}
          highScore={highScore}
          leaderboard={leaderboard}
          onResult={onResult}
        />
      </>
    );
  }

  return (
    <div data-testid="finale-weapon-picker" className="mx-auto max-w-2xl">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-fuchsia-400">
        The Singularity awaits
      </p>
      <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-white">
        Choose your weapon
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        For the climax you may wield any weapon you've earned, at its earned
        tier. Pick the one to collapse the void with.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {earned.map((e) => (
          <button
            key={e.weapon.id}
            type="button"
            data-testid={`finale-weapon-${e.weapon.id}`}
            onClick={() => setPicked(e)}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-violet-900/40 to-fuchsia-900/30 p-4 text-left text-white transition hover:-translate-y-0.5 hover:border-fuchsia-400/60 hover:shadow-lg hover:shadow-fuchsia-900/40"
          >
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-bold">
                {e.weapon.name}
              </span>
              <span className="block truncate text-xs text-slate-300">
                {e.weapon.special} · vs {e.bossName}
              </span>
            </span>
            <span className="shrink-0 rounded-lg bg-black/30 px-2.5 py-1 text-sm font-bold text-amber-300">
              T{e.tier}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <Link
          to="/games/bosses"
          className="text-sm font-semibold text-slate-400 hover:text-slate-200 dark:text-slate-500"
        >
          ← Back to the Boss Tower
        </Link>
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div className="mb-3">
      <Link
        to="/games/bosses"
        className="inline-block text-sm font-medium text-slate-400 hover:text-slate-200 dark:text-slate-500"
      >
        ← Boss Tower
      </Link>
    </div>
  );
}

function LockedPanel({
  config,
  isFinale,
}: {
  config: BossConfig;
  isFinale: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <div className="text-5xl" aria-hidden>
        🔒
      </div>
      <h1 className="mt-3 font-display text-2xl font-bold text-ink dark:text-slate-100">
        {config.name} is still locked
      </h1>
      <p className="mt-2 text-slate-500 dark:text-slate-400">
        {isFinale
          ? "Defeat all ten mini-bosses to summon The Singularity."
          : "Pass this lesson's quiz (70%+) to challenge this boss."}
      </p>
      <div className="mt-5 flex gap-2">
        {!isFinale && config.lessonId && (
          <Link
            to={`/lesson/${config.lessonId}/quiz`}
            className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white transition hover:bg-brand-700"
          >
            Take the quiz
          </Link>
        )}
        <Link
          to="/games/bosses"
          className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-200"
        >
          Back to tower
        </Link>
      </div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl">{children}</div>
    </AppShell>
  );
}
