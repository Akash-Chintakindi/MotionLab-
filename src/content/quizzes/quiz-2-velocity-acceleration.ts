import type { Quiz } from "../../types/content";

// Original questions for Lesson 2 "Velocity, Acceleration, and Changing Motion".
// Every item is answerable from the Lesson 2 Learn sequence: acceleration is the
// slope of v(t) (a = dv/dt), a flat v(t) means zero acceleration, and an object
// speeds up when v and a share a sign / slows down when they have opposite signs.
export const quiz2: Quiz = {
  lessonId: "lesson-2-velocity-acceleration",
  questions: [
    {
      id: "q1",
      type: "multipleChoice",
      category: "conceptual",
      prompt: "On a velocity–time graph, what does the slope at a point represent?",
      options: [
        { id: "a", label: "The instantaneous acceleration" },
        { id: "b", label: "The displacement" },
        { id: "c", label: "The instantaneous velocity" },
        { id: "d", label: "The total distance traveled" },
      ],
      correctOptionId: "a",
      explanation:
        "The slope of v(t) is dv/dt, which is the acceleration. Just as velocity is the slope of position, acceleration is the slope of velocity.",
    },
    {
      id: "q2",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "A velocity–time graph has a flat, horizontal segment. During that segment the acceleration is:",
      options: [
        { id: "a", label: "zero" },
        { id: "b", label: "constant and positive" },
        { id: "c", label: "constant and negative" },
        { id: "d", label: "increasing" },
      ],
      correctOptionId: "a",
      explanation:
        "A flat v(t) has zero slope, so a = dv/dt = 0. Constant velocity means no acceleration.",
    },
    {
      id: "q3",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "An object has positive velocity and negative acceleration. What is it doing?",
      options: [
        { id: "a", label: "Speeding up" },
        { id: "b", label: "Slowing down" },
        { id: "c", label: "Staying at rest" },
        { id: "d", label: "Moving at constant speed" },
      ],
      correctOptionId: "b",
      explanation:
        "Velocity and acceleration point in opposite directions, so the object slows down. Same signs → speeding up; opposite signs → slowing down.",
    },
    {
      id: "q4",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "An object has negative velocity and negative acceleration. What is it doing?",
      options: [
        { id: "a", label: "Speeding up" },
        { id: "b", label: "Slowing down" },
        { id: "c", label: "Turning around" },
        { id: "d", label: "Staying at rest" },
      ],
      correctOptionId: "a",
      explanation:
        "Velocity and acceleration share the same (negative) sign, so the object speeds up — it moves faster in the negative direction.",
    },
    {
      id: "q5",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "This is an object's velocity over time. What can you say about its acceleration?",
      plot: {
        preset: "vDecelToNeg",
        tMin: 0,
        tMax: 6,
        yMin: -6,
        yMax: 9,
        yLabel: "velocity (m/s)",
      },
      options: [
        { id: "a", label: "Constant and negative the whole time" },
        { id: "b", label: "Negative only after the object stops" },
        { id: "c", label: "Zero" },
        { id: "d", label: "Positive" },
      ],
      correctOptionId: "a",
      explanation:
        "The line has the same downward slope everywhere, so the acceleration is constant and negative throughout — even while the velocity itself is still positive.",
    },
    {
      id: "q6",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "Compared with a gently sloped velocity–time line, a steeper velocity–time line means the object has:",
      options: [
        { id: "a", label: "a larger acceleration" },
        { id: "b", label: "a smaller acceleration" },
        { id: "c", label: "a higher velocity" },
        { id: "d", label: "zero acceleration" },
      ],
      correctOptionId: "a",
      explanation:
        "Acceleration is the slope of v(t). A steeper line has a greater slope, so it represents a larger acceleration.",
    },
    {
      id: "q7",
      type: "numeric",
      category: "calculation",
      prompt:
        "A car's velocity goes from 4 m/s to 16 m/s in 4 s at a constant rate. What is its acceleration? (m/s²)",
      value: 3,
      tolerance: 0.05,
      unit: "m/s²",
      placeholder: "m/s²",
      explanation:
        "a = Δv/Δt = (16 − 4)/4 = 12/4 = 3 m/s².",
    },
    {
      id: "q8",
      type: "numeric",
      category: "calculation",
      prompt:
        "Read the acceleration from this velocity graph (v = 1 + 1.5t). What is the acceleration? (m/s²)",
      plot: {
        preset: "vAccelPos",
        tMin: 0,
        tMax: 6,
        yMin: 0,
        yMax: 12,
        yLabel: "velocity (m/s)",
      },
      value: 1.5,
      tolerance: 0.05,
      unit: "m/s²",
      placeholder: "m/s²",
      explanation:
        "Acceleration is the slope. From t = 0 to t = 6 s the velocity rises from 1 to 10 m/s, so a = (10 − 1)/6 = 1.5 m/s².",
    },
    {
      id: "q9",
      type: "numeric",
      category: "calculation",
      prompt:
        "An object starts at v₀ = 8 m/s with a constant acceleration of −2 m/s². At what time does it momentarily stop (v = 0)? (s)",
      value: 4,
      tolerance: 0.05,
      unit: "s",
      placeholder: "s",
      explanation:
        "v = v₀ + a·t = 8 − 2t. Set v = 0: 8 − 2t = 0 → t = 4 s. After this the velocity goes negative.",
    },
    {
      id: "q10",
      type: "numeric",
      category: "calculation",
      prompt:
        "A spacecraft moving at v₀ = 5 m/s fires its engine with constant acceleration 3 m/s². What is its velocity after 4 s? (m/s)",
      value: 17,
      tolerance: 0.05,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "v = v₀ + a·t = 5 + 3(4) = 5 + 12 = 17 m/s.",
    },
  ],
};
