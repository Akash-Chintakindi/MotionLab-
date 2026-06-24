import type { Quiz } from "../../types/content";

// Original questions for Lesson 5 — "Motion in Two Dimensions". Every item is
// answerable from the Lesson 5 Learn content: position/velocity/acceleration as
// vectors with x and y components, velocity = dr/dt, the independence of the x
// and y motions, magnitude via the Pythagorean theorem, and the inward
// (centripetal) acceleration of uniform circular motion.
export const quiz5: Quiz = {
  lessonId: "lesson-5-two-dimensions",
  questions: [
    {
      id: "q1",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "What makes analyzing 2D motion manageable?",
      options: [
        { id: "a", label: "The x and y motions can be analyzed independently" },
        { id: "b", label: "Only the speed (magnitude of velocity) matters" },
        { id: "c", label: "One of the two axes can always be ignored" },
        { id: "d", label: "The path is always a straight line" },
      ],
      correctOptionId: "a",
      explanation:
        "2D motion is two linked 1D motions: you solve the x-component and the y-component separately, then combine them. That independence is the key idea.",
    },
    {
      id: "q2",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "The velocity vector of a moving object is always directed…",
      options: [
        { id: "a", label: "Tangent to the path" },
        { id: "b", label: "Toward the origin" },
        { id: "c", label: "Perpendicular to the path" },
        { id: "d", label: "In the direction of the acceleration" },
      ],
      correctOptionId: "a",
      explanation:
        "Since v = dr/dt, the velocity points in the direction the position is changing, which is always tangent to the path.",
    },
    {
      id: "q3",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "In uniform circular motion (constant speed), the acceleration vector points…",
      options: [
        { id: "a", label: "Toward the center of the circle" },
        { id: "b", label: "Along the velocity (tangent)" },
        { id: "c", label: "Outward, away from the center" },
        { id: "d", label: "It is zero because the speed is constant" },
      ],
      correctOptionId: "a",
      explanation:
        "The speed is constant but the direction of velocity keeps turning. That change in the velocity vector points toward the center, so the acceleration is centripetal (inward).",
    },
    {
      id: "q4",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "An object's horizontal velocity component v_x stays constant while its vertical component v_y changes with time. The acceleration is…",
      options: [
        { id: "a", label: "Purely vertical (only a y-component)" },
        { id: "b", label: "Purely horizontal (only an x-component)" },
        { id: "c", label: "Zero" },
        { id: "d", label: "At 45° to both axes" },
      ],
      correctOptionId: "a",
      explanation:
        "Acceleration comes from whichever velocity component is changing: a_x = d(v_x)/dt = 0 and a_y = d(v_y)/dt ≠ 0, so the acceleration is purely vertical.",
    },
    {
      id: "q5",
      type: "numeric",
      category: "calculation",
      prompt:
        "A drone's velocity has components v_x = 6 m/s and v_y = 8 m/s. What is its speed (the magnitude of the velocity vector)?",
      value: 10,
      tolerance: 0.1,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "Speed = √(v_x² + v_y²) = √(6² + 8²) = √(36 + 64) = √100 = 10 m/s.",
    },
    {
      id: "q6",
      type: "numeric",
      category: "calculation",
      prompt:
        "An object starts at x_0 = 2 m and moves with constant v_x = 3 m/s. What is its x-coordinate at t = 4 s?",
      value: 14,
      tolerance: 0.1,
      unit: "m",
      placeholder: "m",
      explanation:
        "The x-motion is its own 1D problem: x = x_0 + v_x·t = 2 + 3(4) = 14 m. The y-motion does not affect it.",
    },
    {
      id: "q7",
      type: "numeric",
      category: "calculation",
      prompt:
        "A particle's position is r(t) = (2t, t²) (meters). Using v = dr/dt, what is its x-velocity component v_x at t = 5 s?",
      value: 2,
      tolerance: 0.05,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "Differentiate each component: v_x = d(2t)/dt = 2 m/s (constant), and v_y = d(t²)/dt = 2t. So v_x = 2 m/s at every time.",
    },
    {
      id: "q8",
      type: "numeric",
      category: "calculation",
      prompt:
        "For the same particle r(t) = (2t, t²) (meters), what is the y-velocity component v_y at t = 3 s?",
      value: 6,
      tolerance: 0.05,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "v_y = d(t²)/dt = 2t. At t = 3 s, v_y = 2(3) = 6 m/s.",
    },
    {
      id: "q9",
      type: "numeric",
      category: "calculation",
      prompt:
        "A ball is launched with v_y = 12 m/s upward and constant downward acceleration a_y = −4 m/s². Treating the vertical motion on its own, what is v_y at t = 2 s?",
      value: 4,
      tolerance: 0.1,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "The y-motion is an independent 1D problem: v_y = v_y0 + a_y·t = 12 + (−4)(2) = 12 − 8 = 4 m/s.",
    },
    {
      id: "q10",
      type: "numeric",
      category: "calculation",
      prompt:
        "A displacement vector has components Δx = 9 m and Δy = 12 m. What is its magnitude (the straight-line distance)?",
      value: 15,
      tolerance: 0.1,
      unit: "m",
      placeholder: "m",
      explanation:
        "Magnitude = √(Δx² + Δy²) = √(9² + 12²) = √(81 + 144) = √225 = 15 m.",
    },
  ],
};
