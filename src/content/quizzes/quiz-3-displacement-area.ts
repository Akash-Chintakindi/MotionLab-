import type { Quiz } from "../../types/content";

// Original questions in the style of AP Physics C kinematics practice. Every
// item is answerable from the Lesson 3 "Learn" sequence: displacement is the
// signed area under v(t) (Δx = ∫v dt), area above the axis is positive and
// below is negative, net displacement vs. total distance, and computing the
// area of rectangles and triangles under a velocity-time graph.
export const quiz3: Quiz = {
  lessonId: "lesson-3-displacement-area",
  questions: [
    {
      id: "q1",
      type: "multipleChoice",
      category: "conceptual",
      prompt: "What does the area under a velocity–time graph represent?",
      options: [
        { id: "a", label: "Displacement (change in position)" },
        { id: "b", label: "Acceleration" },
        { id: "c", label: "The instantaneous velocity" },
        { id: "d", label: "The slope of the position graph" },
      ],
      correctOptionId: "a",
      explanation:
        "Adding up velocity over time gives the change in position: Δx = ∫v(t) dt. Geometrically that sum is the area between the velocity curve and the time axis.",
    },
    {
      id: "q2",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "On a v(t) graph, what does area that lies BELOW the time axis represent?",
      options: [
        { id: "back", label: "Negative displacement (the object moves backward)" },
        { id: "rest", label: "The object is at rest" },
        { id: "speed", label: "The object is speeding up" },
        { id: "accel", label: "Negative acceleration only" },
      ],
      correctOptionId: "back",
      explanation:
        "Below the axis the velocity is negative, so position decreases. Negative velocity over time means negative displacement — motion in the backward direction.",
    },
    {
      id: "q3",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "When are an object's net displacement and total distance traveled equal in size?",
      options: [
        { id: "nosign", label: "When the velocity never changes sign (no reversal)" },
        { id: "always", label: "Always — they are the same quantity" },
        { id: "reverse", label: "Only when the object reverses direction" },
        { id: "zero", label: "Only when the net displacement is zero" },
      ],
      correctOptionId: "nosign",
      explanation:
        "If velocity keeps one sign, all the area adds the same way, so net displacement equals total distance. They disagree only when negative (red) area cancels part of the net while still adding to distance.",
    },
    {
      id: "q4",
      type: "numeric",
      category: "calculation",
      prompt:
        "A particle moves with constant velocity v = 4 m/s. What is its displacement from t = 0 to t = 3 s? (m)",
      plot: {
        preset: "vConstantPos",
        tMin: 0,
        tMax: 6,
        yMin: 0,
        yMax: 6,
        yLabel: "velocity (m/s)",
        area: { from: 0, to: 3 },
      },
      value: 12,
      tolerance: 0.2,
      unit: "m",
      placeholder: "metres",
      explanation:
        "The area is a rectangle: displacement = v · Δt = 4 m/s · 3 s = 12 m.",
    },
    {
      id: "q5",
      type: "numeric",
      category: "calculation",
      prompt:
        "For v(t) = 2t, find the displacement from t = 0 to t = 4 s (the area under the line). (m)",
      plot: {
        preset: "vTriangleUp",
        tMin: 0,
        tMax: 6,
        yMin: 0,
        yMax: 12,
        yLabel: "velocity (m/s)",
        area: { from: 0, to: 4 },
      },
      value: 16,
      tolerance: 0.3,
      unit: "m",
      placeholder: "metres",
      explanation:
        "The region is a triangle with base 4 s and height v(4) = 8 m/s, so area = ½ · 4 · 8 = 16 m.",
    },
    {
      id: "q6",
      type: "numeric",
      category: "calculation",
      prompt:
        "For v(t) = 8 − 2t, what is the net displacement from t = 0 to t = 4 s? (m)",
      plot: {
        preset: "vDecelToNeg",
        tMin: 0,
        tMax: 6,
        yMin: -6,
        yMax: 9,
        yLabel: "velocity (m/s)",
        area: { from: 0, to: 4 },
      },
      value: 16,
      tolerance: 0.3,
      unit: "m",
      placeholder: "metres",
      explanation:
        "From 0 to 4 s the velocity stays positive, forming a triangle with base 4 s and height 8 m/s: area = ½ · 4 · 8 = 16 m. (The velocity reaches 0 exactly at t = 4 s.)",
    },
    {
      id: "q7",
      type: "numeric",
      category: "calculation",
      prompt:
        "For v(t) = 8 − 2t, what is the net displacement from t = 0 to t = 6 s? (m)",
      plot: {
        preset: "vDecelToNeg",
        tMin: 0,
        tMax: 6,
        yMin: -6,
        yMax: 9,
        yLabel: "velocity (m/s)",
        area: { from: 0, to: 6 },
      },
      value: 12,
      tolerance: 0.3,
      unit: "m",
      placeholder: "metres",
      explanation:
        "Net = positive area − negative area = 16 m (0–4 s) − 4 m (4–6 s) = 12 m. The backward triangle from 4 to 6 s has area ½ · 2 · 4 = 4 m.",
    },
    {
      id: "q8",
      type: "numeric",
      category: "calculation",
      prompt:
        "For v(t) = 8 − 2t, what is the TOTAL distance traveled from t = 0 to t = 6 s? (m)",
      plot: {
        preset: "vDecelToNeg",
        tMin: 0,
        tMax: 6,
        yMin: -6,
        yMax: 9,
        yLabel: "velocity (m/s)",
        area: { from: 0, to: 6 },
      },
      value: 20,
      tolerance: 0.3,
      unit: "m",
      placeholder: "metres",
      explanation:
        "Total distance adds the SIZES of both areas: 16 m forward (0–4 s) + 4 m backward (4–6 s) = 20 m.",
    },
    {
      id: "q9",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "Over t = 0 to t = 6 s for v(t) = 8 − 2t, how do net displacement and total distance compare?",
      plot: {
        preset: "vDecelToNeg",
        tMin: 0,
        tMax: 6,
        yMin: -6,
        yMax: 9,
        yLabel: "velocity (m/s)",
        area: { from: 0, to: 6 },
      },
      options: [
        { id: "less", label: "Net displacement is less than total distance" },
        { id: "equal", label: "They are equal" },
        { id: "more", label: "Net displacement is greater than total distance" },
      ],
      correctOptionId: "less",
      explanation:
        "After t = 4 s the velocity is negative, so that red area subtracts from the net (12 m) but still adds to the distance (20 m). Net is therefore less than total.",
    },
    {
      id: "q10",
      type: "numeric",
      category: "calculation",
      prompt:
        "A velocity–time graph shows v = +5 m/s for 4 s, then v = −5 m/s for 2 s. What is the object's net displacement over the whole 6 s? (m)",
      value: 10,
      tolerance: 0.2,
      unit: "m",
      placeholder: "metres",
      explanation:
        "Forward area = 5 · 4 = 20 m; backward area = 5 · 2 = 10 m. Net displacement = 20 − 10 = 10 m (while the total distance would be 30 m).",
    },
  ],
};
