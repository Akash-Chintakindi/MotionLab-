import type { Lesson } from "../../types/content";

export const lesson2: Lesson = {
  id: "lesson-2-velocity-acceleration",
  title: "Velocity, Acceleration, and Changing Motion",
  subtitle: "Acceleration is the derivative of velocity.",
  order: 2,
  estimatedMinutes: 9,
  coreIdea: "Acceleration is the derivative of velocity.",
  steps: [
    {
      id: "l2-hook",
      type: "multipleChoice",
      prompt:
        "This is an object's velocity over time. What can you say about its acceleration?",
      interactionConfig: {
        plot: {
          preset: "vDecelToNeg",
          tMin: 0,
          tMax: 6,
          yMin: -6,
          yMax: 9,
          yLabel: "velocity (m/s)",
        },
        options: [
          { id: "neg", label: "It is negative the whole time" },
          { id: "afterstop", label: "It is negative only after the object stops" },
          { id: "zero", label: "It is zero" },
        ],
      },
      correctAnswer: { optionId: "neg" },
      feedback: {
        correct:
          "Right. The slope of v(t) is constant and negative, so acceleration is negative throughout.",
        incorrect:
          "Acceleration is the slope of v(t). This line has the same downward slope everywhere.",
        hint: "Look at the steepness and direction of the velocity line, not whether velocity is positive or negative.",
      },
    },
    {
      id: "l2-sim",
      type: "sliderSimulation",
      prompt:
        "Adjust v₀ and a. Acceleration is the slope of v(t). Watch the object speed up or slow down.",
      interactionConfig: {
        scenario: "motion",
        v0: 4,
        a: -1.5,
        v0Range: [-6, 6],
        aRange: [-3, 3],
      },
      correctAnswer: null,
      feedback: {
        correct:
          "When velocity and acceleration share a sign the object speeds up; opposite signs mean it slows down.",
        incorrect: "",
      },
    },
    {
      id: "l2-speedup",
      type: "multipleChoice",
      prompt:
        "An object has positive velocity and negative acceleration. What is it doing?",
      interactionConfig: {
        options: [
          { id: "speeding", label: "Speeding up" },
          { id: "slowing", label: "Slowing down" },
          { id: "rest", label: "Staying at rest" },
        ],
      },
      correctAnswer: { optionId: "slowing" },
      feedback: {
        correct:
          "Yes — velocity and acceleration point in opposite directions, so the object slows down.",
        incorrect:
          "Compare the signs: opposite signs of v and a mean the object is slowing down.",
        hint: "Same signs → speeding up. Opposite signs → slowing down.",
      },
    },
    {
      id: "l2-concept",
      type: "concept",
      prompt: "Acceleration is the derivative of velocity",
      interactionConfig: {
        formula: "a(t) = dv/dt",
        body: [
          "Just as velocity is the slope of position, acceleration is the slope of velocity.",
          "A steeper v(t) graph means a larger acceleration. A flat v(t) means zero acceleration (constant velocity).",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l2-sort",
      type: "sort",
      prompt: "Sort each scenario by whether the object is speeding up or slowing down.",
      interactionConfig: {
        buckets: [
          { id: "speeding", label: "Speeding up" },
          { id: "slowing", label: "Slowing down" },
        ],
        items: [
          { id: "A", label: "Velocity +5 m/s, acceleration +2 m/s²" },
          { id: "B", label: "Velocity +5 m/s, acceleration -2 m/s²" },
          { id: "C", label: "Velocity -4 m/s, acceleration -1 m/s²" },
        ],
      },
      correctAnswer: { A: "speeding", B: "slowing", C: "speeding" },
      feedback: {
        correct: "Same signs speed up; opposite signs slow down.",
        incorrect:
          "Check the signs of v and a in each case. Matching signs mean speeding up.",
        hint: "C has both v and a negative — matching signs, so it speeds up.",
      },
    },
    {
      id: "l2-apply",
      type: "multipleChoice",
      prompt: "Read the acceleration from this velocity graph.",
      interactionConfig: {
        plot: {
          preset: "vAccelPos",
          tMin: 0,
          tMax: 6,
          yMin: 0,
          yMax: 12,
          yLabel: "velocity (m/s)",
        },
        options: [
          { id: "zero", label: "0 m/s²" },
          { id: "onefive", label: "1.5 m/s²" },
          { id: "nine", label: "9 m/s²" },
        ],
      },
      correctAnswer: { optionId: "onefive" },
      feedback: {
        correct: "Correct — the line rises 1.5 m/s every second, so a = 1.5 m/s².",
        incorrect:
          "Acceleration is the slope: change in velocity divided by change in time, not the final velocity.",
        hint: "From t = 0 to t = 6 s velocity goes 1 → 10 m/s. Slope = rise / run.",
      },
    },
  ],
};
