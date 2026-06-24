import type { Lesson } from "../../types/content";

export const lesson1: Lesson = {
  id: "lesson-1-position-velocity",
  title: "Position, Velocity, and Slope",
  subtitle: "Velocity is the derivative of position.",
  order: 1,
  estimatedMinutes: 8,
  coreIdea: "Velocity is the derivative of position with respect to time.",
  steps: [
    {
      id: "l1-hook",
      type: "multipleChoice",
      prompt:
        "A cart moves along a track. This is its position over time. Without using equations, where is it moving fastest?",
      interactionConfig: {
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
          { id: "late", label: "Late (near the end, where it's highest)" },
        ],
      },
      correctAnswer: { optionId: "middle" },
      feedback: {
        correct:
          "Right. The cart covers the most distance per second where the graph is steepest — the middle.",
        incorrect:
          "Look for where the graph is steepest, not where the position is highest.",
        hint: "Fastest means the biggest change in position each second. Which part of the curve climbs most steeply?",
      },
    },
    {
      id: "l1-explore",
      type: "graphDrag",
      prompt:
        "Drag the dot along the curve. A tangent line and a velocity readout follow it. Explore where the slope is steepest and flattest.",
      interactionConfig: {
        mode: "explore",
        showTangent: true,
        initialT: 1,
        graph: {
          curve: "scurveSin",
          tMin: 0,
          tMax: 6,
          xMin: 0,
          xMax: 9,
          xLabel: "time (s)",
          yLabel: "position (m)",
        },
      },
      correctAnswer: null,
      feedback: {
        correct:
          "Notice the tangent tilts the most in the middle and flattens near the ends. Steeper tangent = larger velocity.",
        incorrect: "",
      },
    },
    {
      id: "l1-predict",
      type: "graphDrag",
      prompt:
        "Tap the region of the graph where the velocity is greatest.",
      interactionConfig: {
        mode: "predict",
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
      },
      correctAnswer: { regionId: "middle" },
      feedback: {
        correct: "Exactly — the steepest slope means the greatest velocity.",
        incorrect:
          "Velocity is the slope, not the height. The cart is highest near the end, but the curve is steepest in the middle.",
        hint: "Ignore how high the cart is. Find where the curve rises most steeply.",
      },
    },
    {
      id: "l1-average",
      type: "graphDrag",
      prompt:
        "Drag the two time markers. The line connecting them is the secant, and its slope is the AVERAGE velocity over that interval.",
      interactionConfig: {
        mode: "secant",
        showSecant: true,
        initialT: 1,
        initialT2: 5,
        graph: {
          curve: "scurveSin",
          tMin: 0,
          tMax: 6,
          xMin: 0,
          xMax: 9,
          xLabel: "time (s)",
          yLabel: "position (m)",
        },
      },
      correctAnswer: null,
      feedback: {
        correct:
          "Average velocity = change in position / change in time = the slope of the secant line.",
        incorrect: "",
      },
    },
    {
      id: "l1-instant",
      type: "graphDrag",
      prompt:
        "Now shrink the gap with the slider. As the interval Δt gets tiny, the secant becomes the tangent — that limit is the INSTANTANEOUS velocity.",
      interactionConfig: {
        mode: "secant",
        showSecant: true,
        showDeltaTControl: true,
        initialT: 3,
        initialT2: 5,
        graph: {
          curve: "scurveSin",
          tMin: 0,
          tMax: 6,
          xMin: 0,
          xMax: 9,
          xLabel: "time (s)",
          yLabel: "position (m)",
        },
      },
      correctAnswer: null,
      feedback: {
        correct:
          "As Δt → 0, the average velocity approaches the instantaneous velocity: the slope of the tangent.",
        incorrect: "",
      },
    },
    {
      id: "l1-derivative",
      type: "concept",
      prompt: "The derivative: instantaneous velocity",
      interactionConfig: {
        formula: "v(t) = dx/dt",
        body: [
          "Instantaneous velocity is the slope of the position-time graph at a single instant.",
          "In calculus, that slope is the derivative of position with respect to time. We write it v(t) = dx/dt.",
          "Steeper curve → larger |v|. Flat curve → v = 0. Downward slope → negative velocity.",
        ],
      },
      correctAnswer: null,
      feedback: {
        correct: "",
        incorrect: "",
      },
    },
    {
      id: "l1-calc-concept",
      type: "concept",
      prompt: "Calculating velocity from a formula",
      interactionConfig: {
        formula: "average v = Δx / Δt     and     v(t) = dx/dt",
        body: [
          "Average velocity over an interval is the change in position divided by the change in time: Δx / Δt. Graphically, that's the slope of the secant line.",
          "For a position formula, the instantaneous velocity is the derivative dx/dt. For a polynomial, use the power rule: the term t^n becomes n·t^(n−1).",
          "Example: if x(t) = t², then v(t) = 2t. If x(t) = 6t − t², then v(t) = 6 − 2t.",
        ],
      },
      correctAnswer: null,
      feedback: {
        correct: "",
        incorrect: "",
      },
    },
    {
      id: "l1-calc-practice",
      type: "numeric",
      prompt:
        "Try it: for x(t) = 6t − t² (meters), what is the AVERAGE velocity between t = 0 s and t = 2 s?",
      interactionConfig: {
        tolerance: 0.1,
        unit: "m/s",
        placeholder: "m/s",
      },
      correctAnswer: { value: 4 },
      feedback: {
        correct:
          "Right. x(0) = 0 and x(2) = 8, so average v = Δx/Δt = (8 − 0)/(2 − 0) = 4 m/s.",
        incorrect:
          "Average velocity is Δx/Δt. Find x at t = 0 and t = 2, subtract, then divide by the 2 s elapsed.",
        hint: "x(2) = 6(2) − 2² = 8 and x(0) = 0. Now divide the change in position by 2 s.",
      },
    },
    {
      id: "l1-sort",
      type: "sort",
      prompt:
        "Here the position curve is x(t) = 6t − t². Sort each point by the SIGN of its velocity (the slope at that point).",
      interactionConfig: {
        graph: {
          curve: "parabolaDown",
          tMin: 0,
          tMax: 6,
          xMin: 0,
          xMax: 10,
          xLabel: "time (s)",
          yLabel: "position (m)",
          markers: [
            { id: "A", t: 1, label: "A" },
            { id: "B", t: 3, label: "B" },
            { id: "C", t: 5, label: "C" },
          ],
        },
        buckets: [
          { id: "positive", label: "Positive velocity" },
          { id: "zero", label: "Zero velocity" },
          { id: "negative", label: "Negative velocity" },
        ],
        items: [
          { id: "A", label: "Point A — at t = 1 s (curve rising)" },
          { id: "B", label: "Point B — at t = 3 s (curve's peak)" },
          { id: "C", label: "Point C — at t = 5 s (curve falling)" },
        ],
      },
      correctAnswer: { A: "positive", B: "zero", C: "negative" },
      feedback: {
        correct:
          "Rising slope = positive velocity, flat top = zero velocity, falling slope = negative velocity.",
        incorrect:
          "Check the slope at each point: rising is positive, the flat peak is zero, falling is negative.",
        hint: "At the very top of the curve the slope is momentarily flat — what does a flat slope mean for velocity?",
      },
    },
    {
      id: "l1-application",
      type: "multipleChoice",
      prompt:
        "Using that same curve x(t) = 6t − t², describe the cart's motion between t = 4 s and t = 6 s.",
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
          { id: "forward", label: "Moving forward (positive velocity)" },
          { id: "rest", label: "Staying at rest the whole time" },
          { id: "backward", label: "Moving backward (negative velocity)" },
        ],
      },
      correctAnswer: { optionId: "backward" },
      feedback: {
        correct:
          "Yes — after the peak the curve falls, so the slope (velocity) is negative: the cart moves backward.",
        incorrect:
          "After t = 3 s the curve slopes downward. A downward slope means negative velocity.",
        hint: "Is the position increasing or decreasing between t = 4 s and t = 6 s?",
      },
    },
  ],
};
