import type { Lesson } from "../../types/content";

export const lesson4: Lesson = {
  id: "lesson-4-acceleration-to-position",
  title: "From Acceleration to Velocity and Position",
  subtitle: "Integrate acceleration to build velocity and position.",
  order: 4,
  estimatedMinutes: 10,
  coreIdea:
    "Integrating acceleration builds velocity, and integrating velocity builds position.",
  steps: [
    {
      id: "l4-concept",
      type: "concept",
      prompt: "Building motion by integration",
      interactionConfig: {
        formula: "v = v₀ + ∫a dt    x = x₀ + ∫v dt",
        body: [
          "Integration runs the derivative chain backward: integrate acceleration to get velocity, integrate velocity to get position.",
          "With constant acceleration a, the integrals are simple: v(t) = v₀ + a·t and x(t) = x₀ + v₀·t + ½·a·t².",
          "The initial conditions v₀ and x₀ are the constants of integration.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l4-sim",
      type: "sliderSimulation",
      prompt:
        "Change the constant acceleration and initial velocity. Watch a(t), v(t), and x(t) respond together.",
      interactionConfig: {
        scenario: "kinematics",
        a: 2,
        v0: 0,
        x0: 0,
        T: 5,
        aRange: [-4, 4],
        v0Range: [-6, 6],
      },
      correctAnswer: null,
      feedback: {
        correct:
          "Each graph is the integral of the one above it: constant a gives a straight-line v, which gives a parabolic x.",
        incorrect: "",
      },
    },
    {
      id: "l4-finalv",
      type: "numeric",
      prompt:
        "Starting from rest (v₀ = 0) with a = 2 m/s², what is the velocity at t = 5 s?",
      interactionConfig: {
        unit: "m/s",
        tolerance: 0.5,
        placeholder: "m/s",
      },
      correctAnswer: { value: 10 },
      feedback: {
        correct: "Correct — v = v₀ + a·t = 0 + 2·5 = 10 m/s.",
        incorrect: "Use v = v₀ + a·t with v₀ = 0, a = 2, t = 5.",
        hint: "v = v₀ + a·t.",
      },
    },
    {
      id: "l4-disp",
      type: "numeric",
      prompt:
        "With v₀ = 0, x₀ = 0, and a = 2 m/s², what is the displacement after 5 s?",
      interactionConfig: {
        unit: "m",
        tolerance: 0.5,
        placeholder: "m",
      },
      correctAnswer: { value: 25 },
      feedback: {
        correct: "Correct — x = ½·a·t² = ½·2·25 = 25 m.",
        incorrect: "Use x = x₀ + v₀·t + ½·a·t² with v₀ = 0.",
        hint: "With v₀ = 0, displacement is ½·a·t².",
      },
    },
    {
      id: "l4-initcond",
      type: "multipleChoice",
      prompt:
        "Keeping the same acceleration but increasing v₀, how does the v(t) graph change?",
      interactionConfig: {
        options: [
          { id: "up", label: "It shifts upward (same slope)" },
          { id: "steeper", label: "It gets steeper" },
          { id: "nochange", label: "It does not change" },
        ],
      },
      correctAnswer: { optionId: "up" },
      feedback: {
        correct:
          "Right — v₀ sets the starting value (the intercept); the slope is still a.",
        incorrect:
          "v₀ is the value of v at t = 0. The slope of v(t) is the acceleration, which hasn't changed.",
        hint: "Changing the intercept shifts a line; changing the slope tilts it.",
      },
    },
    {
      id: "l4-apply",
      type: "multipleChoice",
      prompt: "Under constant acceleration, the position-time graph x(t) is…",
      interactionConfig: {
        options: [
          { id: "parabola", label: "A parabola" },
          { id: "line", label: "A straight line" },
          { id: "flat", label: "Flat at zero" },
        ],
      },
      correctAnswer: { optionId: "parabola" },
      feedback: {
        correct:
          "Yes — x(t) = x₀ + v₀t + ½at² is quadratic in t, so it's a parabola.",
        incorrect:
          "Integrating a straight-line v(t) gives a t² term, which is a parabola.",
        hint: "Look at the highest power of t in x(t).",
      },
    },
  ],
};
