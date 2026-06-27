import type { Lesson } from "../../types/content";

/**
 * Lesson 7 — Kinematics Mastery Challenge (course capstone).
 *
 * Follows the Lesson 2 mastery-learning template:
 *   1. Retrieval opener (recall the derivative/integral chain from memory).
 *   2. Bridge + learning intention (synthesis capstone framing).
 *   3. Deeper concept teaching (synthesize x ⇄ v ⇄ a) + interactive sim.
 *   4. Worked example -> faded practice -> independent practice, difficulty
 *      rising, with per-step `mastery` scaffolding. The original synthesis
 *      checks (x→v, v→a, area, derivative/integral sort, 2D, final) are kept
 *      and given mastery blocks where useful.
 */
export const lesson7: Lesson = {
  id: "lesson-7-mastery-challenge",
  title: "Kinematics Mastery Challenge",
  subtitle: "Combine graphs, equations, derivatives, and 2D reasoning.",
  order: 7,
  estimatedMinutes: 12,
  coreIdea:
    "Combine graphs, equations, derivatives, integrals, and 2D reasoning.",
  steps: [
    // ---- 1. Retrieval opener (recall the chain from memory) ----------------
    {
      id: "l7-retrieve",
      type: "multipleChoice",
      prompt:
        "Warm-up from memory — no notes. To get from **position** x(t) down to **acceleration** a(t), which operations do you apply, in order?",
      interactionConfig: {
        options: [
          {
            id: "diff_twice",
            label:
              "Differentiate once to get v(t), then differentiate again to get a(t)",
          },
          {
            id: "int_twice",
            label: "Integrate once to get v(t), then integrate again to get a(t)",
          },
          {
            id: "diff_int",
            label: "Differentiate to get v(t), then integrate to get a(t)",
          },
        ],
      },
      correctAnswer: { optionId: "diff_twice" },
      feedback: {
        correct:
          "Exactly. Going down the chain x → v → a is differentiation each step; going back up a → v → x is integration. That round-trip is the whole course.",
        incorrect:
          "Going down the chain (x → v → a) you differentiate at every step; integrating moves you back up.",
        incorrectByOption: {
          int_twice:
            "Integration moves you UP the chain (a → v → x). To go from position down to acceleration you differentiate twice.",
          diff_int:
            "Both steps go the same direction here. From position down to acceleration you differentiate, then differentiate again — never switching to an integral.",
        },
        hint: "Slope (derivative) takes you x → v → a. Area (integral) takes you back.",
      },
      mastery: { difficulty: "easy" },
    },

    // ---- 2. Bridge + learning intention ------------------------------------
    {
      id: "l7-bridge",
      type: "concept",
      prompt: "The capstone: weave the whole course into one chain",
      interactionConfig: {
        body: [
          "You've built every piece separately: slopes turn position into velocity and velocity into acceleration, areas turn acceleration back into velocity and velocity back into position, and in 2D each axis runs its own copy of that story.",
          "This challenge stitches those pieces together. A single problem may ask you to read a slope AND an area, or to move both down the chain (derivatives) and back up (integrals).",
          "By the end you'll be able to: translate freely between x, v, and a as graphs or equations, pick derivative vs. integral on demand, and apply the same reasoning to each axis of a 2D motion — with no scaffolding.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 3. Deeper concept teaching + interactive sim ----------------------
    {
      id: "l7-synthesis",
      type: "concept",
      prompt: "One chain, two directions",
      interactionConfig: {
        formula: "x(t)  --d/dt-->  v(t)  --d/dt-->  a(t)   (and back via ∫)",
        body: [
          "Think of position, velocity, and acceleration as three rungs of one ladder. Differentiation steps DOWN: v(t) = dx/dt is the slope of position, and a(t) = dv/dt is the slope of velocity. Each derivative answers 'how fast is this changing right now?'",
          "Integration climbs back UP. The signed area under a(t) over an interval is the change in velocity, Δv; the signed area under v(t) is the change in position, Δx. Each integral answers 'how much has accumulated so far?'",
          "Because slope and area are inverse operations, the two directions undo each other. Differentiate x twice and you reach a; integrate a twice (with the right starting values) and you return to x. That symmetry is why a single graph of v(t) tells you BOTH the acceleration (its slope) and the displacement (its area) at the same time.",
          "In two dimensions nothing new is added — you just run this same ladder independently on the x-axis and the y-axis, then recombine the components.",
        ],
        plot: {
          preset: "vAccelPos",
          tMin: 0,
          tMax: 6,
          yMin: 0,
          yMax: 12,
          yLabel: "velocity (m/s)",
        },
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l7-sim",
      type: "sliderSimulation",
      prompt:
        "Drive the chain yourself. Set v₀ and a, then watch how the constant slope a builds the velocity line, and how the growing area under v(t) builds the position. Slope down, area up.",
      interactionConfig: {
        scenario: "kinematics",
        v0: 2,
        a: 1.5,
        x0: 0,
        T: 6,
        v0Range: [-6, 6],
        aRange: [-3, 3],
      },
      correctAnswer: null,
      feedback: {
        correct:
          "The acceleration is the slope of v(t); the position grows like the running area under v(t). Same ladder, two directions.",
        incorrect: "",
      },
    },

    // ---- 4. Mastery core: worked example -> faded -> independent -----------
    {
      id: "l7-worked",
      type: "workedExample",
      prompt:
        "Worked example: pull BOTH acceleration and displacement from one velocity graph",
      interactionConfig: {
        problem:
          "A drone's velocity rises steadily in a straight line from 3 m/s at t = 0 to 15 m/s at t = 4 s. Find (a) its acceleration and (b) its displacement over those 4 seconds.",
        plot: {
          preset: "vAccelPos",
          tMin: 0,
          tMax: 6,
          yMin: 0,
          yMax: 16,
          yLabel: "velocity (m/s)",
          area: { from: 0, to: 4 },
        },
        solution: [
          {
            label: "Step 1 — List what's known",
            detail:
              "v₀ = 3 m/s, v = 15 m/s, Δt = 4 s. The graph is a straight line, so acceleration is constant.",
          },
          {
            label: "Step 2 — Acceleration is the SLOPE of v(t)",
            detail: "Use a = Δv/Δt with Δv = final − initial velocity.",
            formula: "a = (15 − 3) / 4 = 12 / 4 = 3 m/s²",
          },
          {
            label: "Step 3 — Displacement is the AREA under v(t)",
            detail:
              "The region is a trapezoid: parallel sides 3 and 15, width 4. Area = ½ · (v₀ + v) · Δt.",
            formula: "Δx = ½ · (3 + 15) · 4 = ½ · 18 · 4 = 36 m",
          },
          {
            label: "Step 4 — Sanity check",
            detail:
              "Average velocity is (3 + 15)/2 = 9 m/s; over 4 s that's 9 · 4 = 36 m. The area answer matches.",
          },
        ],
        takeaway:
          "One straight velocity graph gives you two answers: its slope is the acceleration (a = Δv/Δt), and its area is the displacement (trapezoid: ½ · (v₀ + v) · Δt).",
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l7-faded",
      type: "numeric",
      prompt:
        "Your turn (same method). A cart's velocity rises steadily from 2 m/s to 10 m/s over 4 s. What is its **displacement** over that interval?",
      interactionConfig: {
        unit: "m",
        tolerance: 0.5,
        plot: {
          preset: "vAccelPos",
          tMin: 0,
          tMax: 6,
          yMin: 0,
          yMax: 12,
          yLabel: "velocity (m/s)",
          area: { from: 0, to: 4 },
        },
        placeholder: "Δx = ?",
      },
      correctAnswer: { value: 24 },
      feedback: {
        correct:
          "Correct — trapezoid area: ½ · (2 + 10) · 4 = ½ · 12 · 4 = 24 m.",
        incorrect:
          "Displacement is the area under v(t). With a sloped line it's a trapezoid: ½ · (v₀ + v) · Δt.",
        hint: "Sides are 2 and 10, width 4. Area = ½ · (2 + 10) · 4.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "The area is a trapezoid with parallel sides v₀ = 2 and v = 10, and width Δt = 4. Plug into ½ · (v₀ + v) · Δt.",
        reveal:
          "Δx = ½ · (2 + 10) · 4 = ½ · 12 · 4 = 24 m. (Equivalently, average velocity 6 m/s × 4 s = 24 m.)",
        reviewToStepId: "l7-worked",
      },
    },

    // ---- 5. Kept synthesis checks (with mastery where useful) ---------------
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
            label:
              "A straight line starting positive, decreasing through zero to negative",
          },
          { id: "const", label: "A constant positive value" },
          { id: "parab", label: "A downward parabola like x(t)" },
        ],
      },
      correctAnswer: { optionId: "line" },
      feedback: {
        correct:
          "Right — v = dx/dt = 6 − 2t, a straight line crossing zero at t = 3.",
        incorrect:
          "Differentiate: the slope of x(t) = 6t − t² is 6 − 2t, which is a line.",
        incorrectByOption: {
          const:
            "Constant velocity would need a straight-line x(t). Differentiating 6t − t² gives 6 − 2t, which changes with time — a sloped line.",
          parab:
            "v is the derivative of x, not a copy of it. d/dt(6t − t²) = 6 − 2t is a straight line, not another parabola.",
        },
        hint: "The derivative of a parabola is a straight line.",
      },
      mastery: { difficulty: "medium" },
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
        correct:
          "Yes — the slope of this line is constant and negative (a = −2 m/s²).",
        incorrect:
          "Acceleration is the slope of v(t). This line has a constant negative slope.",
        incorrectByOption: {
          zero:
            "Zero acceleration means a flat velocity line. This v(t) slopes steadily downward, so a is constant and negative.",
          increasing:
            "The slope of this line never changes, so acceleration is constant — and since the line falls, that constant is negative, not increasing.",
        },
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
        incorrect:
          "Displacement is the area under v(t): a triangle with base 4 and height 8.",
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
        correct:
          "Going down the chain (x → v → a) is differentiation; going back up is integration.",
        incorrect:
          "Differentiate to go from position toward acceleration; integrate to go the other way.",
        hint: "x → v → a uses derivatives; a → v → x uses integrals.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "For each row, ask which way along x → v → a you're moving. Heading toward acceleration = derivative; heading back toward position = integral.",
        reveal:
          "A (x→v) and B (v→a) move down the chain → derivatives. C (a→v) and D (v→x) move back up → integrals.",
        reviewToStepId: "l7-synthesis",
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
        correct:
          "Correct — that independence is what lets us solve each axis separately.",
        incorrect:
          "Gravity only affects vertical motion; horizontal motion is unaffected.",
        incorrectByOption: {
          linked:
            "They aren't locked together — gravity touches only the vertical axis, leaving horizontal motion independent.",
          same:
            "The two motions differ (horizontal is constant-velocity, vertical accelerates), so they're independent, not equal.",
        },
        hint: "Recall the projectile lesson: which axis does gravity touch?",
      },
    },

    // ---- 6. Independent challenge (hard, full 2D synthesis) -----------------
    {
      id: "l7-independent",
      type: "numeric",
      prompt:
        "Independent challenge. A ball is launched **horizontally** at 20 m/s from a 45 m cliff (take g = 10 m/s²). How far from the base does it land? (Solve each axis on its own.)",
      interactionConfig: {
        unit: "m",
        tolerance: 1,
        placeholder: "range = ?",
      },
      correctAnswer: { value: 60 },
      feedback: {
        correct:
          "Correct — fall time from 45 = ½·10·t² gives t = 3 s, and horizontal range = 20 · 3 = 60 m.",
        incorrect:
          "Use the vertical axis to find the time to fall, then the horizontal axis (constant velocity) for the distance.",
        hint: "First solve 45 = ½ · 10 · t² for t, then multiply by the horizontal speed 20 m/s.",
      },
      mastery: {
        difficulty: "hard",
        scaffold:
          "The axes are independent. Vertical: 45 = ½ · 10 · t² sets the flight time. Horizontal: distance = 20 · t with that same t.",
        reveal:
          "Vertical: 45 = ½ · 10 · t² → t² = 9 → t = 3 s. Horizontal (constant velocity): range = 20 · 3 = 60 m.",
        reviewToStepId: "l7-2d",
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
        correct:
          "Yes — zero acceleration means velocity never changes, though it need not be zero.",
        incorrect:
          "Acceleration is the rate of change of velocity. If it's zero, velocity stays the same.",
        incorrectByOption: {
          zero:
            "Zero acceleration means velocity doesn't change — but it can hold any constant value, not necessarily zero (think of a car at steady highway speed).",
          increasing:
            "Increasing velocity requires positive acceleration. With a = 0 there's no change, so velocity stays constant.",
        },
        hint: "No acceleration means no change in velocity — but the object can still be moving.",
      },
    },
  ],
};
