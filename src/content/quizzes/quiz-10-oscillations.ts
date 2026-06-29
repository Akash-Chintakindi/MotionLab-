import type { Quiz } from "../../types/content";

// Original questions answerable from the Lesson 10 "Learn" sequence: simple
// harmonic motion x = A·cos(ωt), period T = 2π/ω, the derivatives giving
// max speed = Aω and max acceleration = Aω², the defining relationship
// a = −ω²·x (restoring), and where in the swing speed/acceleration peak.
export const quiz10: Quiz = {
  lessonId: "lesson-10-oscillations",
  questions: [
    {
      id: "q1",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "For an oscillator described by x(t) = A·cos(ωt), the amplitude A represents:",
      options: [
        { id: "a", label: "The maximum displacement from equilibrium" },
        { id: "b", label: "The time for one full cycle" },
        { id: "c", label: "The number of cycles per second" },
        { id: "d", label: "The maximum acceleration" },
      ],
      correctOptionId: "a",
      explanation:
        "A is the farthest the object gets from the center; it oscillates between +A and −A.",
    },
    {
      id: "q2",
      type: "multipleChoice",
      category: "conceptual",
      prompt: "The relationship that defines simple harmonic motion is:",
      options: [
        { id: "a", label: "a = −ω²·x" },
        { id: "b", label: "a = ω²·x" },
        { id: "c", label: "v = ω·x" },
        { id: "d", label: "a = constant" },
      ],
      correctOptionId: "a",
      explanation:
        "In SHM the acceleration is proportional to the displacement and oppositely directed: a = −ω²·x, which always restores the object toward equilibrium.",
    },
    {
      id: "q3",
      type: "multipleChoice",
      category: "conceptual",
      prompt: "A simple harmonic oscillator moves fastest:",
      options: [
        { id: "a", label: "As it passes through the center (x = 0)" },
        { id: "b", label: "At the extremes (x = ±A)" },
        { id: "c", label: "At the same speed everywhere" },
        { id: "d", label: "Only at the very start" },
      ],
      correctOptionId: "a",
      explanation:
        "The speed |v| = Aω·|sin(ωt)| is largest at the center crossings and zero at the turning points (x = ±A).",
    },
    {
      id: "q4",
      type: "multipleChoice",
      category: "conceptual",
      prompt: "A simple harmonic oscillator has its greatest acceleration:",
      options: [
        { id: "a", label: "At the extremes (x = ±A)" },
        { id: "b", label: "At the center (x = 0)" },
        { id: "c", label: "Midway between center and extreme" },
        { id: "d", label: "Nowhere — acceleration is constant" },
      ],
      correctOptionId: "a",
      explanation:
        "Since a = −ω²·x, the acceleration is largest in size where the displacement is largest — at the extremes — and zero at the center.",
    },
    {
      id: "q5",
      type: "numeric",
      category: "calculation",
      prompt:
        "An oscillator has angular frequency ω = 5 rad/s. What is its period? (s)",
      value: 1.26,
      tolerance: 0.05,
      unit: "s",
      placeholder: "s",
      explanation: "T = 2π/ω = 2π/5 ≈ 1.26 s.",
    },
    {
      id: "q6",
      type: "numeric",
      category: "calculation",
      prompt:
        "A mass oscillates as x(t) = 0.2·cos(5t) (SI units). What is its maximum speed? (m/s)",
      value: 1,
      tolerance: 0.05,
      unit: "m/s",
      placeholder: "m/s",
      explanation: "Maximum speed = Aω = 0.2 × 5 = 1.0 m/s.",
    },
    {
      id: "q7",
      type: "numeric",
      category: "calculation",
      prompt:
        "For x(t) = 0.2·cos(5t) (SI units), what is the maximum acceleration? (m/s²)",
      value: 5,
      tolerance: 0.1,
      unit: "m/s²",
      placeholder: "m/s²",
      explanation: "Maximum acceleration = Aω² = 0.2 × 5² = 0.2 × 25 = 5 m/s².",
    },
    {
      id: "q8",
      type: "numeric",
      category: "calculation",
      prompt:
        "An object oscillates as x(t) = 0.1·cos(4t) (SI units). What is the magnitude of its maximum acceleration? (m/s²)",
      value: 1.6,
      tolerance: 0.05,
      unit: "m/s²",
      placeholder: "m/s²",
      explanation: "Maximum acceleration = Aω² = 0.1 × 4² = 0.1 × 16 = 1.6 m/s².",
    },
    {
      id: "q9",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "Because a = −ω²·x, the acceleration of a simple harmonic oscillator always points:",
      options: [
        { id: "a", label: "Back toward the equilibrium position" },
        { id: "b", label: "Away from equilibrium" },
        { id: "c", label: "In the direction of motion" },
        { id: "d", label: "Perpendicular to the displacement" },
      ],
      correctOptionId: "a",
      explanation:
        "The minus sign makes the acceleration point opposite the displacement, always restoring the object toward the center — that's what sustains the oscillation.",
    },
    {
      id: "q10",
      type: "numeric",
      category: "calculation",
      prompt:
        "An oscillator completes one full cycle every 2 s (period T = 2 s). What is its angular frequency ω? (rad/s)",
      value: 3.14,
      tolerance: 0.05,
      unit: "rad/s",
      placeholder: "rad/s",
      explanation: "ω = 2π/T = 2π/2 = π ≈ 3.14 rad/s.",
    },
  ],
};
