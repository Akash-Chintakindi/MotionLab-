import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { Spinner } from "./components/Spinner";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./auth/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LessonPage = lazy(() => import("./pages/LessonPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}

/** Logged-out visitors see the marketing landing page; learners see their dashboard. */
function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageFallback />;
  return user ? <DashboardPage /> : <LandingPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route
              path="/signup"
              element={<AuthPage key="signup" initialMode="signUp" />}
            />
            <Route
              path="/signin"
              element={<AuthPage key="signin" initialMode="signIn" />}
            />
            {/* Legacy path kept as an alias. */}
            <Route path="/auth" element={<Navigate to="/signup" replace />} />
            <Route
              path="/lesson/:lessonId"
              element={
                <RequireAuth>
                  <LessonPage />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
