import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { Spinner } from "./components/Spinner";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./auth/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LessonPage = lazy(() => import("./pages/LessonPage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const LabPage = lazy(() => import("./pages/LabPage"));
const ReviewPage = lazy(() => import("./pages/ReviewPage"));
const GamesPage = lazy(() => import("./pages/GamesPage"));
const PoolGamePage = lazy(() => import("./pages/PoolGamePage"));
const BasketballGamePage = lazy(() => import("./pages/BasketballGamePage"));
const CannonGamePage = lazy(() => import("./pages/CannonGamePage"));
const BossMapPage = lazy(() => import("./pages/BossMapPage"));
const BossFightPage = lazy(() => import("./pages/BossFightPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const SquadPage = lazy(() => import("./pages/SquadPage"));

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
              path="/lesson/:lessonId/quiz"
              element={
                <RequireAuth>
                  <QuizPage />
                </RequireAuth>
              }
            />
            <Route
              path="/lab"
              element={
                <RequireAuth>
                  <LabPage />
                </RequireAuth>
              }
            />
            {/* Legacy path kept as an alias for the renamed Lab tab. */}
            <Route
              path="/practice"
              element={
                <RequireAuth>
                  <LabPage />
                </RequireAuth>
              }
            />
            <Route
              path="/review"
              element={
                <RequireAuth>
                  <ReviewPage />
                </RequireAuth>
              }
            />
            <Route
              path="/games"
              element={
                <RequireAuth>
                  <GamesPage />
                </RequireAuth>
              }
            />
            <Route
              path="/games/pool"
              element={
                <RequireAuth>
                  <PoolGamePage />
                </RequireAuth>
              }
            />
            <Route
              path="/games/basketball"
              element={
                <RequireAuth>
                  <BasketballGamePage />
                </RequireAuth>
              }
            />
            <Route
              path="/games/cannon"
              element={
                <RequireAuth>
                  <CannonGamePage />
                </RequireAuth>
              }
            />
            <Route
              path="/games/bosses"
              element={
                <RequireAuth>
                  <BossMapPage />
                </RequireAuth>
              }
            />
            <Route
              path="/games/boss/:bossId"
              element={
                <RequireAuth>
                  <BossFightPage />
                </RequireAuth>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <RequireAuth>
                  <LeaderboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/squad"
              element={
                <RequireAuth>
                  <SquadPage />
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
