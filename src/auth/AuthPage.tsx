import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { useAuth } from "./AuthProvider";

function friendlyError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-email":
        return "That email address doesn't look right.";
      case "auth/missing-password":
        return "Please enter a password.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/email-already-in-use":
        return "An account already exists for that email. Try signing in.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email or password is incorrect.";
      default:
        return err.message;
    }
  }
  return "Something went wrong. Please try again.";
}

export default function AuthPage({
  initialMode = "signUp",
}: {
  initialMode?: "signIn" | "signUp";
}) {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = initialMode === "signUp";

  // Already signed in? Skip the form.
  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password, displayName.trim() || "Learner");
      } else {
        await signIn(email.trim(), password);
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="mb-2 inline-block font-display text-3xl font-bold tracking-tight text-ink"
          >
            Motion<span className="text-brand-600">Lab</span>
          </Link>
          <p className="text-sm text-slate-500">
            AP Physics C Kinematics, learned by doing.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="mb-1 text-lg font-semibold">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mb-5 text-sm text-slate-500">
            {isSignUp
              ? "Track your progress and pick up where you left off."
              : "Sign in to continue your course."}
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            {isSignUp && (
              <Field
                label="Display name"
                value={displayName}
                onChange={setDisplayName}
                placeholder="e.g. Bob"
                autoComplete="name"
                name="displayName"
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
              name="email"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              name="password"
              required
            />

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy
                ? "Please wait…"
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-500">
            {isSignUp ? "Already have an account?" : "New to MotionLab?"}{" "}
            <Link
              to={isSignUp ? "/signin" : "/signup"}
              className="font-semibold text-brand-600 hover:underline"
            >
              {isSignUp ? "Sign in" : "Create one"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  name,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  name?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        name={name}
        required={required}
      />
    </label>
  );
}
