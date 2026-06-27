import type { Lesson } from "../../types/content";

/**
 * Lesson 3 — Displacement from Area Under Velocity.
 *
 * Follows the Lesson 2 mastery-learning template:
 *   1. Retrieval opener (recall Lesson 2 from memory).
 *   2. Bridge + learning intention (one compact concept step).
 *   3. Deeper concept teaching (richer `concept` bodies + the interactive area sim).
 *   4. Worked example -> faded practice -> independent practice, with the
 *      difficulty rising through the lesson and per-step `mastery` scaffolding.
 */
export const lesson3: Lesson = {
  id: "lesson-3-displacement-area",
  title: "Displacement from Area Under Velocity",
  subtitle: "Displacement is the integral of velocity.",
  order: 3,
  estimatedMinutes: 12,
  coreIdea: "Displacement is the integral of velocity.",
  steps: [
    // ---- 1. Retrieval opener (recall Lesson 2 from memory) -----------------
    {
      id: "l3-retrieve",
      type: "multipleChoice",
      prompt:
        "Warm-up from memory — no notes. On a **velocity–time** graph, what does the *slope* of the line tell you?",
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
          { id: "accel", label: "The acceleration" },
          { id: "velocity", label: "The velocity" },
          { id: "displacement", label: "The displacement" },
        ],
      },
      correctAnswer: { optionId: "accel" },
      feedback: {
        correct:
          "Exactly — acceleration is the slope (derivative) of velocity. Today we go the *other* direction: the AREA under v(t) gives displacement.",
        incorrect:
          "Recall Lesson 2: the slope of a velocity–time graph is the acceleration.",
        incorrectByOption: {
          velocity:
            "Velocity is the height of the line, not its slope. The slope of a velocity graph is the acceleration.",
          displacement:
            "Displacement comes from the AREA under v(t) — that's today's lesson. The *slope* of v(t) is the acceleration.",
        },
        hint: "Acceleration is the derivative (slope) of velocity.",
      },
      mastery: { difficulty: "easy" },
    },

    // ---- 2. Bridge + learning intention ------------------------------------
    {
      id: "l3-bridge",
      type: "concept",
      prompt: "From slope to area: reading displacement off a velocity graph",
      interactionConfig: {
        body: [
          "In Lesson 2 you took the *slope* of velocity to get acceleration. Now we run the idea backward: instead of slicing the graph for its slope, we **add up** velocity over time. Adding up v(t) means measuring the **area** between the curve and the time axis — and that area is the displacement.",
          "By the end of this lesson you'll be able to: compute displacement as the (signed) area under a v(t) graph, tell net displacement apart from total distance, and reason about what area *below* the axis means.",
          "You'll know you've got it when you can find the net displacement of an object that reverses direction — keeping the signs straight — without help.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 3. Deeper concept teaching ----------------------------------------
    {
      id: "l3-concept",
      type: "concept",
      prompt: "Displacement is the area under v(t)",
      interactionConfig: {
        formula: "Δx = ∫ v(t) dt",
        body: [
          "If velocity tells you how fast position changes, then adding up velocity over time gives the total change in position. Geometrically, that sum is the area between the velocity curve and the time axis.",
          "Watch the units. A velocity in m/s multiplied by a time in s leaves metres — so an area on a v(t) graph (height × width) always comes out in metres of displacement, not in m/s.",
          "Sign is built into the area. Area above the axis (positive velocity) is positive displacement; area below the axis (negative velocity) is negative displacement. When you total the area while keeping these signs, you get the **net displacement**.",
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
      id: "l3-signed-concept",
      type: "concept",
      prompt: "Net displacement vs. total distance",
      interactionConfig: {
        body: [
          "Net displacement and total distance answer two different questions. Net displacement asks 'how far from the start did you end up, and in which direction?' — so backward motion cancels forward motion. Total distance asks 'how much ground did you cover in all?' — backward motion still counts as more travel.",
          "On a v(t) graph this is the difference between *signed* area and *unsigned* area. For net displacement you add areas with their signs (above the axis +, below the axis −). For total distance you add the *sizes* of the areas, treating every region as positive.",
          "They are equal only when the object never reverses direction. The moment v(t) dips below the axis, the negative area shrinks the net displacement while still adding to the total distance — so net ≤ total, always.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 4. Worked example -> faded -> independent ------------------------
    {
      id: "l3-worked",
      type: "workedExample",
      prompt: "Worked example: displacement as the area of a triangle",
      interactionConfig: {
        problem:
          "A cart starts from rest and its velocity grows steadily as v(t) = 2t (in m/s). How far does it travel from t = 0 to t = 5 s?",
        plot: {
          preset: "vTriangleUp",
          tMin: 0,
          tMax: 6,
          yMin: 0,
          yMax: 12,
          yLabel: "velocity (m/s)",
          area: { from: 0, to: 5 },
        },
        solution: [
          {
            label: "Step 1 — Identify the shape under the curve",
            detail:
              "From t = 0 to t = 5 s the graph of v(t) = 2t is a straight line rising from the origin, so the region beneath it is a right triangle.",
          },
          {
            label: "Step 2 — Read off the base and height",
            detail:
              "The base is the time interval, Δt = 5 s. The height is the velocity at the end of the interval.",
            formula: "height = v(5) = 2 · 5 = 10 m/s",
          },
          {
            label: "Step 3 — Take the area of the triangle",
            detail: "Displacement is the area, and a triangle's area is ½ · base · height.",
            formula: "Δx = ½ · 5 · 10 = 25 m",
          },
          {
            label: "Step 4 — Check the units and sign",
            detail:
              "Seconds × (m/s) = metres, and the whole triangle sits above the axis, so the displacement is +25 m.",
          },
        ],
        takeaway:
          "Displacement is the area under v(t). For a straight line through the origin, that area is a triangle: Δx = ½ · base · height.",
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l3-faded",
      type: "numeric",
      prompt:
        "Your turn (same method). For v(t) = 2t, find the displacement from t = 0 to t = 3 s.",
      interactionConfig: {
        unit: "m",
        tolerance: 0.5,
        plot: {
          preset: "vTriangleUp",
          tMin: 0,
          tMax: 6,
          yMin: 0,
          yMax: 12,
          yLabel: "velocity (m/s)",
          area: { from: 0, to: 3 },
        },
        placeholder: "metres",
      },
      correctAnswer: { value: 9 },
      feedback: {
        correct: "Correct — base 3 s, height v(3) = 6 m/s, so Δx = ½ · 3 · 6 = 9 m.",
        incorrect:
          "The region is a triangle: base is the time interval, height is the velocity at the end.",
        hint: "Find v(3) first, then use ½ · base · height.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Start with the height: v(3) = 2 · 3 = 6 m/s. The base is Δt = 3 s. Now take ½ · base · height.",
        reveal:
          "v(3) = 2 · 3 = 6 m/s, base = 3 s, so Δx = ½ · 3 · 6 = 9 m.",
        reviewToStepId: "l3-worked",
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
      mastery: {
        difficulty: "medium",
        scaffold:
          "At t = 0, v = 8 m/s; at t = 4 s, v = 0. The region is a triangle with base 4 s and height 8 m/s.",
        reveal:
          "v starts at 8 m/s and falls to 0 at t = 4 s, so the triangle has base 4 s and height 8 m/s: Δx = ½ · 4 · 8 = 16 m.",
        reviewToStepId: "l3-worked",
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
      mastery: {
        difficulty: "medium",
        scaffold:
          "Look at the graph after t = 4 s: the curve dips below the axis. What does negative area do to the net but not to the distance?",
        reveal:
          "After t = 4 s the velocity is negative, so its area subtracts from the net displacement while still adding to the total distance — net displacement ends up less than total distance.",
        reviewToStepId: "l3-signed-concept",
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
      mastery: {
        difficulty: "medium",
        scaffold:
          "Find the two triangles separately. Forward (0–4 s) is ½ · 4 · 8. Backward (4–6 s) has base 2 s and height |v(6)| = 4 m/s. For DISTANCE, add their sizes.",
        reveal:
          "Forward triangle (0–4 s): ½ · 4 · 8 = 16 m. Backward triangle (4–6 s): ½ · 2 · 4 = 4 m. Total distance = 16 + 4 = 20 m.",
        reviewToStepId: "l3-signed-concept",
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
    {
      id: "l3-independent",
      type: "numeric",
      prompt:
        "Independent challenge — mind the signs. For v(t) = 8 − 2t, find the NET displacement from t = 0 to t = 6 s. (Combine the forward and backward areas with their signs.)",
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
      correctAnswer: { value: 12 },
      feedback: {
        correct:
          "Correct — +16 m forward (0–4 s) and −4 m backward (4–6 s) give a net displacement of +12 m.",
        incorrect:
          "Keep the signs: the area above the axis is positive, the area below is negative. Add them.",
        hint: "Forward area is +16 m; the backward triangle is −4 m. Net = 16 + (−4).",
      },
      mastery: {
        difficulty: "hard",
        scaffold:
          "Split it at t = 4 s. The forward triangle (0–4 s) is +16 m. The backward triangle (4–6 s) is below the axis, so its area is NEGATIVE: −½ · 2 · 4 = −4 m. Now add them with their signs.",
        reveal:
          "Forward area = ½ · 4 · 8 = +16 m. Backward area = −½ · 2 · 4 = −4 m. Net displacement = 16 + (−4) = +12 m.",
        reviewToStepId: "l3-signed-concept",
      },
    },
  ],
};
