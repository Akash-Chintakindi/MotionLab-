import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { ensureUserBootstrap } from "../services/progressService";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await ensureUserBootstrap(
          u.uid,
          u.email ?? "",
          u.displayName ?? "Learner",
        );
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signUp(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(cred.user, { displayName });
        await ensureUserBootstrap(cred.user.uid, email, displayName);
        // Reflect the new display name immediately.
        setUser({ ...cred.user });
      },
      async signIn(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signOut() {
        await fbSignOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
