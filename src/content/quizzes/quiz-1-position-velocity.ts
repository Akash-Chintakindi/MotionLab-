import type { Quiz } from "../../types/content";

// Original questions in the style of AP Physics C kinematics practice. Every
// item is answerable from the Lesson 1 "Learn" sequence (slope = velocity,
// average vs. instantaneous velocity, sign of velocity, and the power rule for
// differentiating a polynomial position function).
export const quiz1: Quiz = {
  lessonId: "lesson-1-position-velocity",
  questions: [
    {
      id: "q1",
      type: "multipleChoice",
      category: "conceptual",
      prompt: "On a position–time graph, what does the slope at a point represent?",
      options: [
        { id: "a", label: "The instantaneous velocity" },
        { id: "b", label: "The total distance traveled" },
        { id: "c", label: "The acceleration" },
        { id: "d", label: "The displacement" },
      ],
      correctOptionId: "a",
      explanation:
        "The slope of x(t) at an instant is dx/dt, which is the instantaneous velocity.",
    },
    {
      id: "q2",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "A position–time graph has a flat, horizontal segment. During that segment the object is:",
      options: [
        { id: "a", label: "at rest (v = 0)" },
        { id: "b", label: "moving at constant positive velocity" },
        { id: "c", label: "speeding up" },
        { id: "d", label: "moving backward" },
      ],
      correctOptionId: "a",
      explanation:
        "A flat graph has zero slope, so the velocity is zero — the object is momentarily at rest.",
    },
    {
      id: "q3",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "An object's position–time graph is a straight line sloping downward to the right. Its velocity is:",
      options: [
        { id: "a", label: "constant and negative" },
        { id: "b", label: "constant and positive" },
        { id: "c", label: "zero" },
        { id: "d", label: "increasing" },
      ],
      correctOptionId: "a",
      explanation:
        "A straight line means constant slope (constant velocity); a downward slope means that velocity is negative.",
    },
    {
      id: "q4",
      type: "multipleChoice",
      category: "conceptual",
      prompt: "Which statement is correct?",
      options: [
        {
          id: "a",
          label:
            "Average velocity is the slope of the secant line; instantaneous velocity is the slope of the tangent line.",
        },
        {
          id: "b",
          label:
            "Average velocity is the slope of the tangent; instantaneous velocity is the slope of the secant.",
        },
        { id: "c", label: "They are always equal." },
        { id: "d", label: "Both are given by the height of the graph." },
      ],
      correctOptionId: "a",
      explanation:
        "Average velocity over an interval is Δx/Δt (secant slope). As Δt → 0 the secant becomes the tangent, giving instantaneous velocity.",
    },
    {
      id: "q5",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "For this position–time graph, in which region is the object moving fastest?",
      graph: {
        curve: "scurveSin",
        tMin: 0,
        tMax: 6,
        xMin: 0,
        xMax: 9,
        xLabel: "time (s)",
        yLabel: "position (m)",
        regions: [
          { id: "early", tStart: 0, tEnd: 2, label: "Early" },
          { id: "middle", tStart: 2, tEnd: 4, label: "Middle" },
          { id: "late", tStart: 4, tEnd: 6, label: "Late" },
        ],
      },
      options: [
        { id: "early", label: "Early (near the start)" },
        { id: "middle", label: "In the middle" },
        { id: "late", label: "Late (where position is highest)" },
      ],
      correctOptionId: "middle",
      explanation:
        "Speed is the steepness of the curve, not the height. The graph is steepest in the middle.",
    },
    {
      id: "q6",
      type: "numeric",
      category: "calculation",
      prompt:
        "An object moves with position x(t) = 2 + 3t (meters). What is its average velocity between t = 1 s and t = 4 s? (m/s)",
      value: 3,
      tolerance: 0.05,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "Average velocity = Δx/Δt = (x(4) − x(1))/(4 − 1) = (14 − 5)/3 = 3 m/s.",
    },
    {
      id: "q7",
      type: "numeric",
      category: "calculation",
      prompt:
        "A particle has position x(t) = t² (meters). What is its average velocity from t = 2 s to t = 4 s? (m/s)",
      value: 6,
      tolerance: 0.05,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "Average velocity = (x(4) − x(2))/(4 − 2) = (16 − 4)/2 = 6 m/s.",
    },
    {
      id: "q8",
      type: "numeric",
      category: "calculation",
      prompt:
        "For x(t) = t² (meters), use the power rule v = dx/dt = 2t to find the instantaneous velocity at t = 3 s. (m/s)",
      value: 6,
      tolerance: 0.05,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "Differentiating x = t² gives v = 2t. At t = 3 s, v = 2(3) = 6 m/s. (Note it equals the average velocity over 2→4 by symmetry.)",
    },
    {
      id: "q9",
      type: "numeric",
      category: "calculation",
      prompt:
        "A cart's position is x(t) = 5t − t² (meters), so v(t) = 5 − 2t. At what time is the cart momentarily at rest? (s)",
      value: 2.5,
      tolerance: 0.05,
      unit: "s",
      placeholder: "s",
      explanation:
        "The cart is at rest when v = 0: 5 − 2t = 0 → t = 2.5 s. That is the instant the position graph reaches its peak.",
    },
    {
      id: "q10",
      type: "numeric",
      category: "calculation",
      prompt:
        "For x(t) = 4t − t² (meters), what is the average velocity between t = 1 s and t = 3 s? (m/s)",
      value: 0,
      tolerance: 0.05,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "x(1) = 3 and x(3) = 3, so Δx = 0 and the average velocity is 0 m/s — even though the cart was moving the whole time.",
    },
  ],
};
