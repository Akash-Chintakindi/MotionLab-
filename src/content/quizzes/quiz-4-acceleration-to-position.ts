import type { Quiz } from "../../types/content";

// Original questions answerable from the Lesson 4 "Learn" sequence: building
// velocity and position by integration (v = v₀ + ∫a dt, x = x₀ + ∫v dt) and the
// constant-acceleration equations v = v₀ + a·t, x = x₀ + v₀·t + ½·a·t²,
// v² = v₀² + 2·a·Δx, plus the role of the initial conditions v₀ and x₀.
export const quiz4: Quiz = {
  lessonId: "lesson-4-acceleration-to-position",
  questions: [
    {
      id: "q1",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "Integrating acceleration with respect to time gives which quantity?",
      options: [
        { id: "a", label: "Velocity" },
        { id: "b", label: "Position" },
        { id: "c", label: "Jerk" },
        { id: "d", label: "Distance squared" },
      ],
      correctOptionId: "a",
      explanation:
        "Velocity is the integral of acceleration: v(t) = v₀ + ∫a dt. Integrating velocity in turn gives position.",
    },
    {
      id: "q2",
      type: "multipleChoice",
      category: "conceptual",
      prompt: "Under constant acceleration, the position–time graph x(t) is:",
      options: [
        { id: "a", label: "A parabola" },
        { id: "b", label: "A straight line" },
        { id: "c", label: "A flat horizontal line" },
        { id: "d", label: "A step function" },
      ],
      correctOptionId: "a",
      explanation:
        "x(t) = x₀ + v₀·t + ½·a·t² is quadratic in t, so its graph is a parabola.",
    },
    {
      id: "q3",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "Keeping the acceleration the same but increasing v₀, how does the v(t) graph change?",
      options: [
        { id: "a", label: "It shifts upward with the same slope" },
        { id: "b", label: "It gets steeper" },
        { id: "c", label: "It becomes flat" },
        { id: "d", label: "It does not change" },
      ],
      correctOptionId: "a",
      explanation:
        "v(t) = v₀ + a·t. v₀ is the intercept, so changing it shifts the line up or down; the slope (the acceleration) is unchanged.",
    },
    {
      id: "q4",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "When integrating a(t) → v(t) → x(t), what physically sets the two constants of integration?",
      options: [
        { id: "a", label: "The initial velocity v₀ and initial position x₀" },
        { id: "b", label: "The final velocity and final position" },
        { id: "c", label: "The acceleration and the time" },
        { id: "d", label: "Nothing — they are always zero" },
      ],
      correctOptionId: "a",
      explanation:
        "Each integration introduces a constant: the first is v₀ (initial velocity), the second is x₀ (initial position). These are the initial conditions.",
    },
    {
      id: "q5",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "An object has constant, nonzero acceleration. Which statement about its velocity–time graph is correct?",
      options: [
        { id: "a", label: "It is a straight line whose slope equals the acceleration" },
        { id: "b", label: "It is a parabola" },
        { id: "c", label: "It is horizontal" },
        { id: "d", label: "It is always zero" },
      ],
      correctOptionId: "a",
      explanation:
        "With constant a, v(t) = v₀ + a·t is linear in t; its constant slope is exactly the acceleration.",
    },
    {
      id: "q6",
      type: "numeric",
      category: "calculation",
      prompt:
        "A car starts with v₀ = 3 m/s and accelerates at a = 4 m/s². What is its velocity at t = 2 s? (m/s)",
      value: 11,
      tolerance: 0.05,
      unit: "m/s",
      placeholder: "m/s",
      explanation: "v = v₀ + a·t = 3 + 4·2 = 11 m/s.",
    },
    {
      id: "q7",
      type: "numeric",
      category: "calculation",
      prompt:
        "Starting from rest (v₀ = 0) with a = 6 m/s², how far does the object travel in 4 s? (m)",
      value: 48,
      tolerance: 0.05,
      unit: "m",
      placeholder: "m",
      explanation:
        "With v₀ = 0, x = ½·a·t² = ½·6·4² = ½·6·16 = 48 m.",
    },
    {
      id: "q8",
      type: "numeric",
      category: "calculation",
      prompt:
        "With x₀ = 0, v₀ = 5 m/s, and a = 2 m/s², what is the position at t = 3 s? (m)",
      value: 24,
      tolerance: 0.05,
      unit: "m",
      placeholder: "m",
      explanation:
        "x = x₀ + v₀·t + ½·a·t² = 0 + 5·3 + ½·2·3² = 15 + 9 = 24 m.",
    },
    {
      id: "q9",
      type: "numeric",
      category: "calculation",
      prompt:
        "An object starts from rest and accelerates at a = 3 m/s² over a displacement of Δx = 6 m. What is its final speed? (m/s)",
      value: 6,
      tolerance: 0.05,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "Use v² = v₀² + 2·a·Δx = 0 + 2·3·6 = 36, so v = √36 = 6 m/s.",
    },
    {
      id: "q10",
      type: "numeric",
      category: "calculation",
      prompt:
        "This is a velocity–time graph for an object under constant acceleration. Read its acceleration (the slope of the line). (m/s²)",
      plot: {
        preset: "vTriangleUp",
        tMin: 0,
        tMax: 5,
        yMin: 0,
        yMax: 10,
        xLabel: "time (s)",
        yLabel: "velocity (m/s)",
        color: "#1f7aff",
      },
      value: 2,
      tolerance: 0.05,
      unit: "m/s²",
      placeholder: "m/s²",
      explanation:
        "The line passes through (0, 0) and (5, 10), so the slope is Δv/Δt = 10/5 = 2 m/s² — and the slope of v(t) is the acceleration.",
    },
  ],
};
