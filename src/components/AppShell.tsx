import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AiToggle } from "./AiToggle";

function TabLink({
  to,
  label,
  end,
}: {
  to: string;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-base font-semibold transition",
          isActive
            ? "bg-gradient-to-r from-brand-50 to-accent-50 text-brand-700 ring-1 ring-brand-100"
            : "text-slate-600 hover:bg-slate-100",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export function AppShell({
  children,
  streak,
  freezes,
}: {
  children: ReactNode;
  streak?: number;
  freezes?: number;
}) {
  const { user, signOut } = useAuth();
  const initial = (user?.displayName ?? user?.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/70 bg-white/70 px-4 py-3.5 backdrop-blur sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-ink transition hover:opacity-90"
        >
          <span
            aria-hidden
            className="h-5 w-1.5 rounded-full bg-gradient-to-b from-brand-500 to-accent-600 transition group-hover:h-6"
          />
          Motion<span className="bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">Lab</span>
        </Link>
        <div className="flex items-center gap-2.5 text-base sm:gap-3.5">
          {typeof streak === "number" && (
            <span
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200/70"
              title="Current day streak"
            >
              <span aria-hidden>🔥</span>
              <span data-testid="streak-count">{streak}</span>
              {typeof freezes === "number" && freezes > 0 && (
                <span
                  className="ml-0.5 flex items-center gap-0.5 text-brand-700"
                  title="Streak freezes banked"
                >
                  <span aria-hidden>❄️</span>
                  {freezes}
                </span>
              )}
            </span>
          )}
          {user && (
            <>
              <AiToggle />
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-lg px-3 py-2 text-base font-semibold text-slate-600 hover:bg-slate-200"
              >
                Sign out
              </button>
              <Link
                to="/profile"
                data-testid="profile-link"
                title="Your profile"
                aria-label="Your profile"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 font-display text-lg font-bold text-white transition hover:bg-brand-700"
              >
                {initial}
              </Link>
            </>
          )}
        </div>
      </header>
      {user && (
        <nav
          className="sticky top-[57px] z-10 flex items-center gap-1 overflow-x-auto border-b border-slate-200/70 bg-white/70 px-3 py-1.5 backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] sm:px-5 lg:px-7"
          aria-label="Primary"
        >
          <TabLink to="/" label="Course" end />
          <TabLink to="/lab" label="Lab" />
          <TabLink to="/games" label="Games" />
          <TabLink to="/review" label="Review" />
          <TabLink to="/squad" label="Squad" />
          <TabLink to="/leaderboard" label="Leaderboard" />
        </nav>
      )}
      <main className="flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">{children}</main>
    </div>
  );
}
