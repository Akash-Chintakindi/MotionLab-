import type { Quiz } from "../../types/content";

// Original questions for Lesson 6 ("Projectile Motion"). Every item is
// answerable from the Lesson 6 Learn sequence: horizontal and vertical motion
// are independent, the horizontal velocity is constant, the vertical velocity is
// zero at the peak, velocity components are vx = v·cosθ and vy = v·sinθ, and the
// parametric equations x = v·cosθ·t, y = v·sinθ·t − ½·g·t². Uses g = 10 m/s²,
// consistent with the lesson and ProjectileSim.
export const quiz6: Quiz = {
  lessonId: "lesson-6-projectile-motion",
  questions: [
    {
      id: "q1",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "Ignoring air resistance, what happens to a projectile's horizontal velocity during its flight?",
      options: [
        { id: "a", label: "It stays constant" },
        { id: "b", label: "It steadily increases" },
        { id: "c", label: "It decreases to zero at the peak" },
        { id: "d", label: "It reverses direction at the peak" },
      ],
      correctOptionId: "a",
      explanation:
        "Gravity acts only vertically, so there is no horizontal force. The horizontal velocity v·cosθ never changes throughout the flight.",
    },
    {
      id: "q2",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "At the highest point of a projectile's path, the vertical component of its velocity is:",
      options: [
        { id: "a", label: "Zero" },
        { id: "b", label: "At its maximum" },
        { id: "c", label: "Equal to the launch speed" },
        { id: "d", label: "Equal to the horizontal velocity" },
      ],
      correctOptionId: "a",
      explanation:
        "At the peak the object stops rising and is about to fall, so vy = 0 for an instant. (The horizontal velocity keeps going.)",
    },
    {
      id: "q3",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "On flat ground with no air resistance, which launch angle gives the maximum range?",
      options: [
        { id: "a", label: "45°" },
        { id: "b", label: "30°" },
        { id: "c", label: "60°" },
        { id: "d", label: "90° (straight up)" },
      ],
      correctOptionId: "a",
      explanation:
        "Range ∝ sin(2θ), which is largest when 2θ = 90°, i.e. θ = 45°. That angle balances horizontal speed against time of flight.",
    },
    {
      id: "q4",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "One ball is dropped from rest while a second is thrown horizontally from the same height at the same instant. Which lands first?",
      options: [
        { id: "a", label: "They land at the same time" },
        { id: "b", label: "The dropped ball lands first" },
        { id: "c", label: "The thrown ball lands first" },
        { id: "d", label: "It depends on the horizontal speed" },
      ],
      correctOptionId: "a",
      explanation:
        "Horizontal and vertical motion are independent. Both balls have the same vertical motion (start with vy = 0 and accelerate at g), so they hit the ground together regardless of horizontal speed.",
    },
    {
      id: "q5",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "While a projectile is in the air (no air resistance), its acceleration is:",
      options: [
        { id: "a", label: "10 m/s² directed straight down" },
        { id: "b", label: "Zero, because it moves freely" },
        { id: "c", label: "Directed along the velocity, speeding it up" },
        { id: "d", label: "Zero at the top and largest at launch" },
      ],
      correctOptionId: "a",
      explanation:
        "The only force is gravity, so the acceleration is g ≈ 10 m/s² downward at every point of the path — including the peak. The horizontal acceleration is zero.",
    },
    {
      id: "q6",
      type: "numeric",
      category: "calculation",
      prompt:
        "A projectile is launched at 20 m/s at 30° above the horizontal. What is the initial VERTICAL velocity component? (m/s)",
      value: 10,
      tolerance: 0.3,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "vy = v·sinθ = 20·sin30° = 20·0.5 = 10 m/s.",
    },
    {
      id: "q7",
      type: "numeric",
      category: "calculation",
      prompt:
        "A projectile is launched at 20 m/s at 60° above the horizontal. What is the initial HORIZONTAL velocity component? (m/s)",
      value: 10,
      tolerance: 0.3,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "vx = v·cosθ = 20·cos60° = 20·0.5 = 10 m/s.",
    },
    {
      id: "q8",
      type: "numeric",
      category: "calculation",
      prompt:
        "A projectile is launched at 20 m/s at 30° from level ground (g = 10 m/s²). How long is it in the air before landing back at launch height? (s)",
      value: 2,
      tolerance: 0.1,
      unit: "s",
      placeholder: "s",
      explanation:
        "vy = 20·sin30° = 10 m/s. Time of flight = 2·vy/g = 2·10/10 = 2 s (rise time equals fall time).",
    },
    {
      id: "q9",
      type: "numeric",
      category: "calculation",
      prompt:
        "A projectile is launched at 20 m/s at 30° (g = 10 m/s²). What is its maximum (peak) height? (m)",
      value: 5,
      tolerance: 0.2,
      unit: "m",
      placeholder: "m",
      explanation:
        "vy = 20·sin30° = 10 m/s. Peak height = vy²/(2g) = 10²/(2·10) = 100/20 = 5 m.",
    },
    {
      id: "q10",
      type: "numeric",
      category: "calculation",
      prompt:
        "A ball is thrown horizontally at 15 m/s (θ = 0°) off a cliff. Ignoring air resistance, how far horizontally does it travel in 2 s? (m)",
      value: 30,
      tolerance: 0.3,
      unit: "m",
      placeholder: "m",
      explanation:
        "Horizontal velocity is constant, so x = v·cosθ·t = 15·1·2 = 30 m. Gravity changes only the vertical motion, not this horizontal distance.",
    },
  ],
};
