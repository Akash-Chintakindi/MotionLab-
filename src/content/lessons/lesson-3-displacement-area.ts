import type { Lesson } from "../../types/content";

export const lesson3: Lesson = {
  id: "lesson-3-displacement-area",
  title: "Displacement from Area Under Velocity",
  subtitle: "Displacement is the integral of velocity.",
  order: 3,
  estimatedMinutes: 9,
  coreIdea: "Displacement is the integral of velocity.",
  steps: [
    {
      id: "l3-concept",
      type: "concept",
      prompt: "Displacement is the area under v(t)",
      interactionConfig: {
        formula: "Δx = ∫ v(t) dt",
        body: [
          "If velocity tells you how fast position changes, then adding up velocity over time gives the total change in position.",
          "Geometrically, that sum is the area between the velocity curve and the time axis.",
          "Area above the axis is positive displacement; area below the axis is negative displacement.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l3-sim",
      type: "sliderSimulation",
      prompt:
        "Drag the interval endpoints. Compare the net displacement (signed area) with the total distance (size of the area).",
      interactionConfig: {
        scenario: "area",
        plot: {
          preset: "vDecelToNeg",
          tMin: 0,
          tMax: 6,
          yMin: -6,
          yMax: 9,
          yLabel: "velocity (m/s)",
        },
        initialFrom: 0,
        initialTo: 4,
      },
      correctAnswer: null,
      feedback: {
        correct:
          "Net displacement can be smaller than total distance whenever the object reverses direction (negative area).",
        incorrect: "",
      },
    },
    {
      id: "l3-net",
      type: "numeric",
      prompt:
        "For v(t) = 8 − 2t, find the net displacement from t = 0 to t = 4 s (the area under the curve).",
      interactionConfig: {
        unit: "m",
        tolerance: 0.5,
        plot: {
          preset: "vDecelToNeg",
          tMin: 0,
          tMax: 6,
          yMin: -6,
          yMax: 9,
          yLabel: "velocity (m/s)",
          area: { from: 0, to: 4 },
        },
        placeholder: "metres",
      },
      correctAnswer: { value: 16 },
      feedback: {
        correct: "Correct — that triangle has area ½ · 4 · 8 = 16 m.",
        incorrect:
          "The region from 0 to 4 s is a triangle with base 4 s and height 8 m/s.",
        hint: "Area of a triangle = ½ · base · height.",
      },
    },
    {
      id: "l3-compare",
      type: "multipleChoice",
      prompt:
        "Over the full interval t = 0 to t = 6 s, how do net displacement and total distance compare?",
      interactionConfig: {
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
          { id: "equal", label: "They are equal" },
          { id: "netless", label: "Net displacement is less than total distance" },
          { id: "netmore", label: "Net displacement is greater than total distance" },
        ],
      },
      correctAnswer: { optionId: "netless" },
      feedback: {
        correct:
          "Right — after t = 4 s the velocity is negative, so that area subtracts from the net but still adds to the distance.",
        incorrect:
          "The negative (red) area cancels part of the net displacement but still counts as distance traveled.",
        incorrectByOption: {
          equal:
            "They'd only match if the object never reversed. After t = 4 s the velocity goes negative, so the backward area shrinks the net but not the distance.",
          netmore:
            "Net can't exceed total distance — the negative area subtracts from the net while still adding to distance, so net comes out less, not more.",
        },
        hint: "When the object moves backward, net and total disagree.",
      },
    },
    {
      id: "l3-distance",
      type: "numeric",
      prompt:
        "For v(t) = 8 − 2t, what is the TOTAL distance traveled from t = 0 to t = 6 s?",
      interactionConfig: {
        unit: "m",
        tolerance: 0.5,
        plot: {
          preset: "vDecelToNeg",
          tMin: 0,
          tMax: 6,
          yMin: -6,
          yMax: 9,
          yLabel: "velocity (m/s)",
          area: { from: 0, to: 6 },
        },
        placeholder: "metres",
      },
      correctAnswer: { value: 20 },
      feedback: {
        correct:
          "Correct — 16 m forward (0–4 s) plus 4 m backward (4–6 s) gives 20 m of distance.",
        incorrect:
          "Add the sizes of both areas: the forward triangle and the backward triangle.",
        hint: "Forward area is 16 m; the backward triangle from 4 to 6 s has area ½ · 2 · 4 = 4 m.",
      },
    },
    {
      id: "l3-sign",
      type: "multipleChoice",
      prompt: "What does area below the time axis on a v(t) graph represent?",
      interactionConfig: {
        options: [
          { id: "back", label: "Negative displacement (moving backward)" },
          { id: "stopped", label: "The object is not moving" },
          { id: "speed", label: "The object is speeding up" },
        ],
      },
      correctAnswer: { optionId: "back" },
      feedback: {
        correct: "Yes — negative velocity over time means displacement in the negative direction.",
        incorrect:
          "Below the axis velocity is negative, so position decreases: the object moves backward.",
        incorrectByOption: {
          stopped:
            "Below the axis the velocity is negative, not zero — a nonzero velocity means the object is still moving, just backward.",
          speed:
            "Speeding up is about the slope of v(t), not its sign. Area below the axis is negative velocity, which means moving backward.",
        },
        hint: "Negative velocity × time = negative displacement.",
      },
    },
  ],
};
