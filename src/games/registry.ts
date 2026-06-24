import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export interface GameProps {
  /** Reports the player's best overall score (0–100) when a run finishes. */
  onScore?: (bestScore: number) => void;
  /** Where to send the learner after finishing the game, if anywhere. */
  next?: { href: string; label: string };
}

type GameComponent = LazyExoticComponent<ComponentType<GameProps>>;

const REGISTRY: Record<string, GameComponent> = {
  "lesson-1-position-velocity": lazy(() =>
    import("./DriveTheCartGame").then((m) => ({ default: m.DriveTheCartGame })),
  ),
  "lesson-2-velocity-acceleration": lazy(() =>
    import("./AccelerationPilotGame").then((m) => ({
      default: m.AccelerationPilotGame,
    })),
  ),
  "lesson-3-displacement-area": lazy(() =>
    import("./AreaPainterGame").then((m) => ({ default: m.AreaPainterGame })),
  ),
  "lesson-4-acceleration-to-position": lazy(() =>
    import("./IntegralStackGame").then((m) => ({
      default: m.IntegralStackGame,
    })),
  ),
  "lesson-5-two-dimensions": lazy(() =>
    import("./CoordinateCourierGame").then((m) => ({
      default: m.CoordinateCourierGame,
    })),
  ),
  "lesson-6-projectile-motion": lazy(() =>
    import("./CannonRangeGame").then((m) => ({ default: m.CannonRangeGame })),
  ),
  "lesson-7-mastery-challenge": lazy(() =>
    import("./BossRushGame").then((m) => ({ default: m.BossRushGame })),
  ),
};

export function getGame(lessonId: string): GameComponent | null {
  return REGISTRY[lessonId] ?? null;
}

export function hasGame(lessonId: string): boolean {
  return lessonId in REGISTRY;
}
