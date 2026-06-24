import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export function AppShell({
  children,
  streak,
}: {
  children: ReactNode;
  streak?: number;
}) {
  const { user, signOut } = useAuth();
  const initial = (user?.displayName ?? user?.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3.5 backdrop-blur">
        <Link
          to="/"
          className="font-display text-2xl font-bold tracking-tight text-ink transition hover:opacity-80"
        >
          Motion<span className="text-brand-600">Lab</span>
        </Link>
        <div className="flex items-center gap-2.5 text-base sm:gap-3.5">
          {typeof streak === "number" && (
            <span
              className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-800"
              title="Current streak"
            >
              <span aria-hidden>🔥</span>
              <span data-testid="streak-count">{streak}</span>
            </span>
          )}
          {user && (
            <>
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
      <main className="flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
