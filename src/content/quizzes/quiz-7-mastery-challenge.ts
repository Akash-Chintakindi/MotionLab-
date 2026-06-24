import type { Quiz } from "../../types/content";

// Original comprehensive review questions for Lesson 7 ("Kinematics Mastery
// Challenge"). Every item is answerable from the collective Learn content of
// Lessons 1–6: slope/derivative (L1), acceleration (L2), area/integral
// displacement (L3), constant-acceleration equations (L4), 2D components (L5),
// and projectile motion (L6). Visuals reuse only existing presets.
export const quiz7: Quiz = {
  lessonId: "lesson-7-mastery-challenge",
  questions: [
    {
      id: "q1",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "Across all of kinematics, velocity is related to position as its:",
      options: [
        { id: "a", label: "Derivative with respect to time" },
        { id: "b", label: "Integral with respect to time" },
        { id: "c", label: "Reciprocal" },
        { id: "d", label: "Square" },
      ],
      correctOptionId: "a",
      explanation:
        "Velocity is the time derivative of position: v(t) = dx/dt. (Going the other way, position is the integral of velocity.)",
    },
    {
      id: "q2",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "This position–time graph is a straight line sloping downward. What does it tell you about the velocity?",
      graph: {
        curve: "linearDown",
        tMin: 0,
        tMax: 6,
        xMin: 0,
        xMax: 12,
        xLabel: "time (s)",
        yLabel: "position (m)",
      },
      options: [
        { id: "a", label: "Constant and negative" },
        { id: "b", label: "Constant and positive" },
        { id: "c", label: "Increasing" },
        { id: "d", label: "Zero" },
      ],
      correctOptionId: "a",
      explanation:
        "A straight line means constant slope (constant velocity); sloping downward means that velocity is negative.",
    },
    {
      id: "q3",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "This is a velocity graph, v(t) = 8 − 2t. What is the acceleration?",
      plot: {
        preset: "vDecelToNeg",
        tMin: 0,
        tMax: 6,
        yMin: -6,
        yMax: 9,
        yLabel: "velocity (m/s)",
      },
      options: [
        { id: "a", label: "Constant and negative (−2 m/s²)" },
        { id: "b", label: "Constant and positive (+2 m/s²)" },
        { id: "c", label: "Zero everywhere" },
        { id: "d", label: "Increasing with time" },
      ],
      correctOptionId: "a",
      explanation:
        "Acceleration is the slope of v(t). The line v = 8 − 2t has a constant slope of −2 m/s².",
    },
    {
      id: "q4",
      type: "numeric",
      category: "calculation",
      prompt:
        "A particle has position x(t) = 3t² (meters). Using the power rule, v = dx/dt = 6t. What is the instantaneous velocity at t = 2 s? (m/s)",
      value: 12,
      tolerance: 0.05,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "Differentiating x = 3t² gives v = 6t. At t = 2 s, v = 6(2) = 12 m/s.",
    },
    {
      id: "q5",
      type: "numeric",
      category: "calculation",
      prompt:
        "For the velocity graph v(t) = 2t, the displacement is the area under the curve. What is the displacement from t = 0 to t = 3 s? (m)",
      plot: {
        preset: "vTriangleUp",
        tMin: 0,
        tMax: 6,
        yMin: 0,
        yMax: 13,
        yLabel: "velocity (m/s)",
        area: { from: 0, to: 3 },
      },
      value: 9,
      tolerance: 0.1,
      unit: "m",
      placeholder: "m",
      explanation:
        "The shaded area is a triangle with base 3 and height v(3) = 6, so Δx = ½ · 3 · 6 = 9 m.",
    },
    {
      id: "q6",
      type: "numeric",
      category: "calculation",
      prompt:
        "A cart starts from rest (v₀ = 0) and accelerates at a constant 4 m/s². How far does it travel in 3 s? Use x = v₀t + ½at². (m)",
      value: 18,
      tolerance: 0.1,
      unit: "m",
      placeholder: "m",
      explanation:
        "x = v₀t + ½at² = 0 + ½(4)(3²) = ½(4)(9) = 18 m.",
    },
    {
      id: "q7",
      type: "numeric",
      category: "calculation",
      prompt:
        "An object has v₀ = 5 m/s and a constant acceleration of −2 m/s². What is its velocity after 4 s? Use v = v₀ + at. (m/s)",
      value: -3,
      tolerance: 0.05,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "v = v₀ + at = 5 + (−2)(4) = 5 − 8 = −3 m/s. The negative sign means it is now moving in the opposite direction.",
    },
    {
      id: "q8",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "In projectile motion, how are the horizontal and vertical motions related?",
      options: [
        {
          id: "a",
          label:
            "They are independent — gravity only affects the vertical motion",
        },
        { id: "b", label: "They are locked together so both accelerate" },
        { id: "c", label: "The horizontal speed decreases as the object rises" },
        { id: "d", label: "They are always equal in magnitude" },
      ],
      correctOptionId: "a",
      explanation:
        "Horizontal and vertical motions are independent. With no horizontal force, horizontal velocity is constant, while gravity accelerates only the vertical motion.",
    },
    {
      id: "q9",
      type: "numeric",
      category: "calculation",
      prompt:
        "A ball moves with a horizontal velocity of 9 m/s and a vertical velocity of 12 m/s. What is its speed (magnitude of the velocity)? (m/s)",
      value: 15,
      tolerance: 0.1,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "Combine the components with the Pythagorean theorem: √(9² + 12²) = √(81 + 144) = √225 = 15 m/s.",
    },
    {
      id: "q10",
      type: "numeric",
      category: "calculation",
      prompt:
        "A ball is launched straight up at 30 m/s (take g = 10 m/s²). What maximum height does it reach? Use h = v₀²/(2g). (m)",
      value: 45,
      tolerance: 0.5,
      unit: "m",
      placeholder: "m",
      explanation:
        "At the peak the vertical velocity is zero. h = v₀²/(2g) = 30²/(2·10) = 900/20 = 45 m.",
    },
  ],
};
