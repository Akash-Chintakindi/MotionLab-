import type { Lesson } from "../../types/content";

export const lesson7: Lesson = {
  id: "lesson-7-mastery-challenge",
  title: "Kinematics Mastery Challenge",
  subtitle: "Combine graphs, equations, derivatives, and 2D reasoning.",
  order: 7,
  estimatedMinutes: 12,
  coreIdea:
    "Combine graphs, equations, derivatives, integrals, and 2D reasoning.",
  steps: [
    {
      id: "l7-intro",
      type: "concept",
      prompt: "Bring it all together",
      interactionConfig: {
        body: [
          "This challenge mixes everything: graphs, derivatives, integrals, and 2D motion.",
          "For each question, translate between position, velocity, and acceleration — as graphs or as equations.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l7-x-to-v",
      type: "multipleChoice",
      prompt:
        "This is a position graph x(t) = 6t − t². Which statement describes the matching velocity graph v(t)?",
      interactionConfig: {
        graph: {
          curve: "parabolaDown",
          tMin: 0,
          tMax: 6,
          xMin: 0,
          xMax: 10,
          xLabel: "time (s)",
          yLabel: "position (m)",
        },
        options: [
          {
            id: "line",
            label: "A straight line starting positive, decreasing through zero to negative",
          },
          { id: "const", label: "A constant positive value" },
          { id: "parab", label: "A downward parabola like x(t)" },
        ],
      },
      correctAnswer: { optionId: "line" },
      feedback: {
        correct: "Right — v = dx/dt = 6 − 2t, a straight line crossing zero at t = 3.",
        incorrect:
          "Differentiate: the slope of x(t) = 6t − t² is 6 − 2t, which is a line.",
        hint: "The derivative of a parabola is a straight line.",
      },
    },
    {
      id: "l7-v-to-a",
      type: "multipleChoice",
      prompt: "For this velocity graph, what is the acceleration a(t)?",
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
          { id: "constneg", label: "A constant negative value" },
          { id: "zero", label: "Zero everywhere" },
          { id: "increasing", label: "Increasing with time" },
        ],
      },
      correctAnswer: { optionId: "constneg" },
      feedback: {
        correct: "Yes — the slope of this line is constant and negative (a = −2 m/s²).",
        incorrect: "Acceleration is the slope of v(t). This line has a constant negative slope.",
        hint: "A straight velocity line has constant acceleration.",
      },
    },
    {
      id: "l7-area",
      type: "numeric",
      prompt:
        "An object has velocity v(t) = 2t. What is its displacement from t = 0 to t = 4 s?",
      interactionConfig: {
        unit: "m",
        tolerance: 0.5,
        plot: {
          preset: "vTriangleUp",
          tMin: 0,
          tMax: 6,
          yMin: 0,
          yMax: 13,
          yLabel: "velocity (m/s)",
          area: { from: 0, to: 4 },
        },
        placeholder: "m",
      },
      correctAnswer: { value: 16 },
      feedback: {
        correct: "Correct — the area is a triangle: ½ · 4 · 8 = 16 m.",
        incorrect: "Displacement is the area under v(t): a triangle with base 4 and height 8.",
        hint: "At t = 4, v = 8. Area of the triangle = ½ · base · height.",
      },
    },
    {
      id: "l7-chain",
      type: "sort",
      prompt:
        "Sort each transformation by whether it is a derivative or an integral.",
      interactionConfig: {
        buckets: [
          { id: "derivative", label: "Derivative" },
          { id: "integral", label: "Integral" },
        ],
        items: [
          { id: "A", label: "Position to velocity" },
          { id: "B", label: "Velocity to acceleration" },
          { id: "C", label: "Acceleration to velocity" },
          { id: "D", label: "Velocity to position" },
        ],
      },
      correctAnswer: {
        A: "derivative",
        B: "derivative",
        C: "integral",
        D: "integral",
      },
      feedback: {
        correct: "Going down the chain (x → v → a) is differentiation; going back up is integration.",
        incorrect:
          "Differentiate to go from position toward acceleration; integrate to go the other way.",
        hint: "x → v → a uses derivatives; a → v → x uses integrals.",
      },
    },
    {
      id: "l7-2d",
      type: "multipleChoice",
      prompt: "In projectile motion, the horizontal and vertical motions are…",
      interactionConfig: {
        options: [
          { id: "indep", label: "Independent of each other" },
          { id: "linked", label: "Locked together so both speed up" },
          { id: "same", label: "Always equal" },
        ],
      },
      correctAnswer: { optionId: "indep" },
      feedback: {
        correct: "Correct — that independence is what lets us solve each axis separately.",
        incorrect: "Gravity only affects vertical motion; horizontal motion is unaffected.",
        hint: "Recall the projectile lesson: which axis does gravity touch?",
      },
    },
    {
      id: "l7-final",
      type: "multipleChoice",
      prompt: "If a(t) = 0 for all time, then the velocity must be…",
      interactionConfig: {
        options: [
          { id: "const", label: "Constant" },
          { id: "zero", label: "Always zero" },
          { id: "increasing", label: "Increasing" },
        ],
      },
      correctAnswer: { optionId: "const" },
      feedback: {
        correct: "Yes — zero acceleration means velocity never changes, though it need not be zero.",
        incorrect:
          "Acceleration is the rate of change of velocity. If it's zero, velocity stays the same.",
        hint: "No acceleration means no change in velocity — but the object can still be moving.",
      },
    },
  ],
};
