import type { Lesson } from "../../types/content";

/**
 * Lesson 10 (course order 9) — Oscillations: Motion That Repeats.
 *
 * The BRIDGE lesson: it carries the course's core derivative relationships
 * (v = dx/dt, a = dv/dt) into a new, periodic context — simple harmonic motion —
 * without introducing forces yet. It reuses the existing graph primitives via
 * two new sinusoidal presets (curve `cosineWave`, plot `vSineOsc`).
 *
 * Follows the Lesson 2 mastery-learning template:
 *   1. Retrieval opener (recall that velocity/acceleration come from
 *      differentiating position).
 *   2. Bridge + learning intention.
 *   3. Deeper concept teaching (x = A·cos(ωt) and its derivatives) + the
 *      interactive cosine graph.
 *   4. Worked example -> faded -> independent, difficulty rising, with per-step
 *      `mastery` scaffolding.
 */
export const lesson10: Lesson = {
  id: "lesson-10-oscillations",
  title: "Oscillations: Motion That Repeats",
  subtitle: "Velocity and acceleration are still just derivatives of position.",
  order: 9,
  estimatedMinutes: 12,
  coreIdea:
    "In simple harmonic motion x = A·cos(ωt), velocity and acceleration are its derivatives, and a = −ω²·x.",
  steps: [
    // ---- 1. Retrieval opener (recall the derivative chain) -----------------
    {
      id: "l10-retrieve",
      type: "multipleChoice",
      prompt:
        "Warm-up from memory — no notes. Across this whole course, to get the velocity from a position function x(t), you:",
      interactionConfig: {
        options: [
          { id: "diff", label: "Differentiate it (take its slope), v = dx/dt" },
          { id: "int", label: "Integrate it (take its area)" },
          { id: "mult", label: "Multiply it by the time t" },
        ],
      },
      correctAnswer: { optionId: "diff" },
      feedback: {
        correct:
          "Exactly — velocity is the derivative of position, and acceleration is the derivative of velocity. Today we apply that same chain to motion that repeats.",
        incorrect:
          "Recall the core idea: velocity is the slope (derivative) of position, v = dx/dt.",
        incorrectByOption: {
          int:
            "Integration goes the OTHER way (acceleration → velocity → position). To go from position DOWN to velocity you differentiate.",
          mult:
            "Multiplying by t only works for the special case of constant velocity. In general, velocity is the derivative v = dx/dt.",
        },
        hint: "Slope takes you x → v → a; area takes you back.",
      },
      mastery: { difficulty: "easy" },
    },

    // ---- 2. Bridge + learning intention ------------------------------------
    {
      id: "l10-bridge",
      type: "concept",
      prompt: "A new kind of motion — but the same tools",
      interactionConfig: {
        body: [
          "A mass on a spring, a pendulum, a guitar string: these all OSCILLATE — they sweep back and forth, repeating the same path over and over. This is the gateway to waves, sound, and AC circuits.",
          "The beautiful part: you don't need any new calculus. The position of a simple oscillator is x(t) = A·cos(ωt), and its velocity and acceleration are just the derivatives you've taken all along.",
          "By the end of this lesson you'll be able to: read amplitude and period off an oscillation, find its velocity and acceleration as derivatives, and use the signature relationship a = −ω²·x that defines simple harmonic motion.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 3. Deeper concept teaching ----------------------------------------
    {
      id: "l10-concept",
      type: "concept",
      prompt: "Describing an oscillation: x(t) = A·cos(ωt)",
      interactionConfig: {
        formula: "x(t) = A·cos(ωt)     T = 2π/ω     f = 1/T",
        body: [
          "Start the oscillator at its maximum displacement and its position traces a cosine: x(t) = A·cos(ωt). The amplitude A is the farthest it gets from the center (equilibrium); it swings between +A and −A.",
          "The angular frequency ω (in rad/s) sets how fast it cycles. One full back-and-forth takes the period T = 2π/ω seconds, and the frequency f = 1/T counts cycles per second (hertz).",
          "The curve below is one such oscillation. Notice it's steepest as it crosses the center and momentarily flat at the extremes — which, since velocity is the slope, already tells you where it moves fastest and where it stops.",
        ],
        graph: {
          curve: "cosineWave",
          tMin: 0,
          tMax: 6,
          xMin: -3,
          xMax: 3,
          xLabel: "time (s)",
          yLabel: "position (m)",
        },
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l10-explore",
      type: "graphDrag",
      prompt:
        "Drag the dot along this oscillating position curve. Watch the velocity readout: it's largest as the dot crosses the center, and drops to zero at the very top and bottom of the swing.",
      interactionConfig: {
        mode: "explore",
        showTangent: true,
        initialT: 1,
        graph: {
          curve: "cosineWave",
          tMin: 0,
          tMax: 6,
          xMin: -3,
          xMax: 3,
          xLabel: "time (s)",
          yLabel: "position (m)",
        },
      },
      correctAnswer: null,
      feedback: {
        correct:
          "The tangent is steepest at the center crossings (fastest) and flat at the extremes (momentarily at rest) — velocity is the slope of position, even here.",
        incorrect: "",
      },
    },
    {
      id: "l10-deriv-concept",
      type: "concept",
      prompt: "Velocity and acceleration: just differentiate",
      interactionConfig: {
        formula: "v = −Aω·sin(ωt)     a = −Aω²·cos(ωt) = −ω²·x",
        body: [
          "Differentiate x = A·cos(ωt) once and you get the velocity v = −Aω·sin(ωt). Its largest size is Aω, reached as the oscillator races through the center (x = 0).",
          "Differentiate again for the acceleration a = −Aω²·cos(ωt). Its largest size is Aω², reached at the extremes (x = ±A), where the object is momentarily stopped but turning around hardest.",
          "Compare the acceleration with the position and a remarkable pattern appears: a = −ω²·x. The acceleration is always proportional to the displacement and points the OPPOSITE way — back toward the center. That single relationship, a = −ω²x, is the definition of simple harmonic motion.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 4a. Read-the-graph conceptual check (medium) ----------------------
    {
      id: "l10-fastest",
      type: "multipleChoice",
      prompt:
        "This is the velocity v(t) of an oscillator whose position is x = A·cos(ωt). When is the object moving fastest?",
      interactionConfig: {
        plot: {
          preset: "vSineOsc",
          tMin: 0,
          tMax: 6,
          yMin: -2.5,
          yMax: 2.5,
          xLabel: "time (s)",
          yLabel: "velocity (m/s)",
        },
        options: [
          { id: "center", label: "As it passes through the center (x = 0)" },
          { id: "extremes", label: "At the extreme points (x = ±A)" },
          { id: "constant", label: "It moves at constant speed the whole time" },
        ],
      },
      correctAnswer: { optionId: "center" },
      feedback: {
        correct:
          "Right — the speed |v| peaks at the center crossings (where the velocity graph reaches ±Aω) and is zero at the turning points.",
        incorrect:
          "Speed is the size of the velocity. The velocity graph reaches its biggest magnitude at the center crossings, not at the extremes.",
        incorrectByOption: {
          extremes:
            "At the extremes (x = ±A) the object momentarily stops — the velocity graph crosses zero there. It's fastest at the center.",
          constant:
            "The velocity graph is a sine wave, not a flat line, so the speed clearly changes. It's largest at the center and zero at the extremes.",
        },
        hint: "Speed is biggest where the velocity graph is farthest from zero.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Speed is the magnitude of velocity. Find where the velocity curve reaches its largest value (up or down) — that corresponds to which point of the swing?",
        reveal:
          "The velocity magnitude peaks (at ±Aω) as the oscillator passes through the center x = 0, and is zero at the extremes. So it's fastest at the center.",
        reviewToStepId: "l10-deriv-concept",
      },
    },

    // ---- 4b. Worked example -> faded -> independent ------------------------
    {
      id: "l10-worked",
      type: "workedExample",
      prompt: "Worked example: read everything off x(t) = 0.2·cos(5t)",
      interactionConfig: {
        problem:
          "A mass oscillates with x(t) = 0.2·cos(5t) (SI units). Find (a) its period, (b) its maximum speed, and (c) its maximum acceleration.",
        solution: [
          {
            label: "Step 1 — Read off A and ω",
            detail:
              "Compare with x = A·cos(ωt): the amplitude is A = 0.2 m and the angular frequency is ω = 5 rad/s.",
          },
          {
            label: "Step 2 — Period from ω",
            detail: "One full cycle takes T = 2π/ω.",
            formula: "T = 2π / 5 ≈ 1.26 s",
          },
          {
            label: "Step 3 — Maximum speed = Aω",
            detail:
              "Differentiate: v = −Aω·sin(5t), whose largest size is Aω (at the center).",
            formula: "v_max = Aω = 0.2 × 5 = 1.0 m/s",
          },
          {
            label: "Step 4 — Maximum acceleration = Aω²",
            detail:
              "Differentiate again: a = −Aω²·cos(5t), whose largest size is Aω² (at the extremes).",
            formula: "a_max = Aω² = 0.2 × 5² = 0.2 × 25 = 5 m/s²",
          },
        ],
        takeaway:
          "From x = A·cos(ωt): period T = 2π/ω, max speed = Aω, max acceleration = Aω². Each extra factor of ω comes from one more derivative.",
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l10-period",
      type: "numeric",
      prompt:
        "Your turn. An oscillator has angular frequency ω = 5 rad/s. What is its period T?",
      interactionConfig: { unit: "s", tolerance: 0.05, placeholder: "T = ?" },
      correctAnswer: { value: 1.26 },
      feedback: {
        correct: "Correct — T = 2π/ω = 2π/5 ≈ 1.26 s.",
        incorrect: "Use T = 2π/ω.",
        hint: "Divide 2π by ω = 5.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "The period is T = 2π/ω. Put ω = 5 in the denominator: T = 2π / 5.",
        reveal: "T = 2π/ω = 2π/5 ≈ 6.283 / 5 ≈ 1.26 s.",
        reviewToStepId: "l10-concept",
      },
    },
    {
      id: "l10-maxspeed",
      type: "numeric",
      prompt:
        "An object oscillates as x(t) = 0.1·cos(4t) (SI units). What is its maximum speed?",
      interactionConfig: { unit: "m/s", tolerance: 0.02, placeholder: "v_max = ?" },
      correctAnswer: { value: 0.4 },
      feedback: {
        correct: "Correct — v_max = Aω = 0.1 × 4 = 0.4 m/s.",
        incorrect:
          "Maximum speed is Aω. Read A and ω from x = A·cos(ωt), then multiply.",
        hint: "A = 0.1 and ω = 4, so v_max = Aω.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Match x = A·cos(ωt): A = 0.1 m, ω = 4 rad/s. The maximum speed is the product Aω.",
        reveal: "v_max = Aω = 0.1 × 4 = 0.4 m/s.",
        reviewToStepId: "l10-worked",
      },
    },
    {
      id: "l10-sort",
      type: "sort",
      prompt:
        "For a simple harmonic oscillator, sort each statement by WHERE in the swing it happens.",
      interactionConfig: {
        buckets: [
          { id: "center", label: "At the center (x = 0)" },
          { id: "extremes", label: "At the extremes (x = ±A)" },
        ],
        items: [
          { id: "maxspeed", label: "The speed is maximum" },
          { id: "zerospeed", label: "The speed is zero (it turns around)" },
          { id: "maxaccel", label: "The acceleration is maximum" },
          { id: "zeroaccel", label: "The acceleration is zero" },
        ],
      },
      correctAnswer: {
        maxspeed: "center",
        zerospeed: "extremes",
        maxaccel: "extremes",
        zeroaccel: "center",
      },
      feedback: {
        correct:
          "Speed peaks at the center and dies at the extremes; acceleration (a = −ω²x) does the opposite — zero at the center, biggest at the extremes.",
        incorrect:
          "Use a = −ω²x: acceleration tracks displacement (biggest at the extremes, zero at the center), while speed is the reverse.",
        hint: "Acceleration is proportional to displacement; speed is largest where displacement is zero.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Two facts: speed is the slope of the position curve (steepest at the center), and a = −ω²x (so acceleration is largest where x is largest).",
        reveal:
          "Speed: max at the center, zero at the extremes. Acceleration (a = −ω²x): zero at the center, max at the extremes.",
        reviewToStepId: "l10-deriv-concept",
      },
    },
    {
      id: "l10-restoring",
      type: "multipleChoice",
      prompt:
        "The relationship a = −ω²·x means that the acceleration of a simple harmonic oscillator always points:",
      interactionConfig: {
        options: [
          { id: "toward", label: "Back toward the center (opposite the displacement)" },
          { id: "away", label: "Away from the center (along the displacement)" },
          { id: "withv", label: "In the direction the object is moving" },
        ],
      },
      correctAnswer: { optionId: "toward" },
      feedback: {
        correct:
          "Right — the minus sign means a points opposite to x, always pulling the object back toward equilibrium. That restoring tendency is what makes it oscillate.",
        incorrect:
          "Look at the minus sign in a = −ω²x: the acceleration is opposite to the displacement.",
        incorrectByOption: {
          away:
            "That would push the object farther out and it would never come back. The minus sign makes a point OPPOSITE to x — back toward the center.",
          withv:
            "Acceleration here depends on position (a = −ω²x), not on the direction of motion. It points opposite the displacement, back toward the center.",
        },
        hint: "What does the minus sign in a = −ω²x do to the direction?",
      },
      mastery: { difficulty: "medium" },
    },
    {
      id: "l10-independent",
      type: "numeric",
      prompt:
        "Independent challenge. An object oscillates with x(t) = 0.05·cos(10t) (SI units). What is the magnitude of its maximum acceleration?",
      interactionConfig: { unit: "m/s²", tolerance: 0.1, placeholder: "a_max = ?" },
      correctAnswer: { value: 5 },
      feedback: {
        correct:
          "Correct — a_max = Aω² = 0.05 × 10² = 0.05 × 100 = 5 m/s².",
        incorrect:
          "Maximum acceleration is Aω². Read A and ω from x = A·cos(ωt), and remember ω is squared.",
        hint: "A = 0.05 and ω = 10, so a_max = Aω² = 0.05 × 10².",
      },
      mastery: {
        difficulty: "hard",
        scaffold:
          "Match x = A·cos(ωt): A = 0.05 m, ω = 10 rad/s. Maximum acceleration is Aω² — square the ω first (10² = 100).",
        reveal: "a_max = Aω² = 0.05 × 10² = 0.05 × 100 = 5 m/s².",
        reviewToStepId: "l10-worked",
      },
    },
  ],
};
