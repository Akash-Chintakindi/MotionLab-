import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { Spinner } from "./Spinner";
import { dailyQuestion } from "../lib/dailyQuestion";
import { formatAnswerTime } from "../lib/squad";
import {
  createSquad,
  getMySquads,
  getSquadDailyBoard,
  getSquadMembers,
  joinSquad,
  leaveSquad,
  type DailyBoardEntry,
  type Squad,
} from "../services/squadService";

export function SquadPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const reload = useCallback(
    async (prefer?: string) => {
      if (!user) return;
      const mine = await getMySquads(user.uid);
      setSquads(mine);
      setSelected((cur) => prefer ?? cur ?? mine[0]?.code ?? null);
      setLoading(false);
    },
    [user],
  );

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Spinner label="Loading your squads…" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {squads.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Your squads">
          {squads.map((s) => {
            const active = s.code === selected;
            return (
              <button
                key={s.code}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelected(s.code)}
                className={[
                  "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                  active
                    ? "bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                ].join(" ")}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <SquadBoard
          key={selected}
          squad={squads.find((s) => s.code === selected)!}
          meUid={user?.uid}
          onLeave={async (code) => {
            if (!user) return;
            await leaveSquad(user.uid, code);
            setSelected(null);
            await reload();
          }}
        />
      ) : (
        <p className="text-sm text-slate-500">
          You're not in a squad yet. Create one and share the code, or join a
          friend's.
        </p>
      )}

      <JoinCreate
        onCreated={(s) => reload(s.code)}
        onJoined={(s) => reload(s.code)}
      />
    </div>
  );
}

function SquadBoard({
  squad,
  meUid,
  onLeave,
}: {
  squad: Squad;
  meUid?: string;
  onLeave: (code: string) => Promise<void>;
}) {
  const [board, setBoard] = useState<DailyBoardEntry[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const question = useMemo(() => dailyQuestion(), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getSquadDailyBoard(squad.code),
      getSquadMembers(squad.code),
    ])
      .then(([rows, members]) => {
        if (!active) return;
        setBoard(rows);
        setMemberCount(members.length);
      })
      .catch(() => {
        if (active) setBoard([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [squad.code]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(squad.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; the code is shown next to the button anyway.
    }
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">{squad.name}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {memberCount === null
              ? "—"
              : `${memberCount} member${memberCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyCode}
            data-testid="squad-copy-code"
            title="Copy invite code"
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 font-mono text-sm font-bold tracking-widest text-ink transition hover:bg-slate-200"
          >
            {squad.code}
            <span className="text-xs font-sans font-semibold text-slate-500">
              {copied ? "Copied!" : "Copy"}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-gradient-to-r from-brand-50 to-accent-50 p-3 text-sm ring-1 ring-brand-100">
        <p className="font-semibold uppercase tracking-wide text-brand-600">
          Today's question
        </p>
        <p className="mt-1 line-clamp-2 text-slate-600">{question.prompt}</p>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex min-h-[20vh] items-center justify-center">
            <Spinner label="Loading today's board…" />
          </div>
        ) : board.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-base font-semibold text-slate-600">
              No one has answered today — yet.
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Answer the Question of the Day on your dashboard to claim #1.
            </p>
          </div>
        ) : (
          <ol data-testid="squad-board" className="space-y-2">
            {board.map((e, i) => {
              const isMe = e.uid === meUid;
              return (
                <li
                  key={e.uid}
                  className={[
                    "flex items-center gap-3 rounded-2xl p-3.5 ring-1",
                    isMe ? "bg-brand-50 ring-brand-300" : "bg-white ring-slate-200",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold",
                      i === 0
                        ? "bg-amber-100 text-amber-700"
                        : i === 1
                          ? "bg-slate-200 text-slate-700"
                          : i === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                    {e.name}
                    {isMe && (
                      <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        You
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="text-base">
                    {e.correct ? "✅" : "❌"}
                  </span>
                  <span className="w-16 text-right font-mono text-sm tabular-nums text-slate-500">
                    {e.correct ? formatAnswerTime(e.timeMs) : "—"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <button
        type="button"
        onClick={() => onLeave(squad.code)}
        className="mt-4 text-sm font-medium text-slate-400 transition hover:text-rose-600"
      >
        Leave squad
      </button>
    </div>
  );
}

function JoinCreate({
  onCreated,
  onJoined,
}: {
  onCreated: (s: Squad) => void;
  onJoined: (s: Squad) => void;
}) {
  const { user } = useAuth();
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Anonymous";

  const create = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    try {
      const s = await createSquad(user.uid, displayName, createName);
      setCreateName("");
      onCreated(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the squad.");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    try {
      const s = await joinSquad(user.uid, displayName, joinCode);
      setJoinCode("");
      onJoined(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join that squad.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
      <h3 className="font-display text-base font-bold text-ink">
        Start or join a squad
      </h3>
      {error && (
        <p
          role="alert"
          className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
        >
          {error}
        </p>
      )}
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Create a squad
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              type="text"
              value={createName}
              maxLength={40}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Squad name (e.g. Period 3)"
              data-testid="squad-create-name"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={create}
              disabled={busy || !createName.trim()}
              data-testid="squad-create-submit"
              className="shrink-0 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Join with a code
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              type="text"
              value={joinCode}
              maxLength={8}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="6-char code"
              data-testid="squad-join-code"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm uppercase tracking-widest outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={join}
              disabled={busy || !joinCode.trim()}
              data-testid="squad-join-submit"
              className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
