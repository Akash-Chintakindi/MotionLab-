import type { SliderSimulationConfig } from "../../types/content";
import { MotionSim } from "./sims/MotionSim";
import { AreaSim } from "./sims/AreaSim";
import { KinematicsSim } from "./sims/KinematicsSim";
import { Vector2DSim } from "./sims/Vector2DSim";
import { ProjectileSim } from "./sims/ProjectileSim";
import type { StepComponentProps } from "./types";

export function SliderSimulationStep({ step }: StepComponentProps) {
  const cfg = step.interactionConfig as SliderSimulationConfig;
  switch (cfg.scenario) {
    case "motion":
      return <MotionSim config={cfg} />;
    case "area":
      return <AreaSim config={cfg} />;
    case "kinematics":
      return <KinematicsSim config={cfg} />;
    case "vectors2d":
      return <Vector2DSim />;
    case "projectile":
      return <ProjectileSim config={cfg} />;
    default:
      return null;
  }
}
