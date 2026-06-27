import type { Lesson } from "../../types/content";

/**
 * Lesson 2 — the mastery-learning template lesson.
 *
 * Shape every other lesson follows:
 *   1. Retrieval opener (recall the prerequisite from Lesson 1, from memory).
 *   2. Bridge + learning intention (one compact concept step).
 *   3. Deeper concept teaching (richer `concept` bodies + interactive sim).
 *   4. Worked example -> faded practice -> independent practice, with the
 *      difficulty rising through the lesson and per-step `mastery` scaffolding
 *      (first miss = scaffold hint, second miss = full reveal + jump-back).
 */
export const lesson2: Lesson = {
  id: "lesson-2-velocity-acceleration",
  title: "Velocity, Acceleration, and Changing Motion",
  subtitle: "Acceleration is the derivative of velocity.",
  order: 2,
  estimatedMinutes: 11,
  coreIdea: "Acceleration is the derivative of velocity.",
  steps: [
    // ---- 1. Retrieval opener (recall Lesson 1 from memory) -----------------
    {
      id: "l2-retrieve",
      type: "multipleChoice",
      prompt:
        "Warm-up from memory — no notes. On a **position–time** graph, what does the *slope* of the line tell you?",
      interactionConfig: {
        graph: {
          curve: "linearUp",
          tMin: 0,
          tMax: 6,
          xMin: 0,
          xMax: 12,
          xLabel: "time (s)",
          yLabel: "position (m)",
        },
        options: [
          { id: "velocity", label: "The velocity" },
          { id: "position", label: "The position" },
          { id: "accel", label: "The acceleration" },
        ],
      },
      correctAnswer: { optionId: "velocity" },
      feedback: {
        correct:
          "Exactly. Velocity is the slope (derivative) of position — that is the idea today's lesson builds on.",
        incorrect:
          "Recall Lesson 1: the slope of a position–time graph is the velocity.",
        incorrectByOption: {
          position:
            "The height of the line is the position; the slope (how tilted it is) is the velocity.",
          accel:
            "Acceleration comes from the slope of a *velocity* graph — that's where we're headed. The slope of a *position* graph is velocity.",
        },
        hint: "Velocity is the derivative of position — slope.",
      },
      mastery: { difficulty: "easy" },
    },

    // ---- 2. Bridge + learning intention ------------------------------------
    {
      id: "l2-bridge",
      type: "concept",
      prompt: "From velocity to acceleration: the same move, one level up",
      interactionConfig: {
        body: [
          "You just showed that velocity is the slope of position. Today we apply that exact same operation one level up: **acceleration is the slope of velocity**.",
          "By the end of this lesson you'll be able to: read acceleration off a velocity–time graph, compute it with a = Δv/Δt, and decide whether an object is speeding up or slowing down from the signs of v and a.",
          "You'll know you've got it when you can solve an acceleration problem — including a negative one — without help.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 3. Deeper concept teaching ----------------------------------------
    {
      id: "l2-concept",
      type: "concept",
      prompt: "Acceleration is the derivative of velocity",
      interactionConfig: {
        formula: "a(t) = dv/dt",
        body: [
          "Acceleration measures how quickly velocity changes. On a velocity–time graph it is the slope, just as velocity was the slope of position.",
          "A steeper v(t) line means a larger acceleration. A flat v(t) line (slope 0) means zero acceleration — constant velocity.",
          "Sign matters: positive acceleration tilts v(t) upward, negative acceleration tilts it downward. The sign of a is NOT the same question as the sign of v.",
        ],
        graph: {
          curve: "linearUp",
          tMin: 0,
          tMax: 6,
          xMin: 0,
          xMax: 12,
          xLabel: "time (s)",
          yLabel: "velocity (m/s)",
        },
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l2-sim",
      type: "sliderSimulation",
      prompt:
        "Play with v₀ and a. Acceleration is the slope of v(t). Watch the object speed up when v and a share a sign, and slow down when they don't.",
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
      id: "l2-sign-concept",
      type: "concept",
      prompt: "The sign rule: speeding up vs. slowing down",
      interactionConfig: {
        body: [
          "Whether an object speeds up or slows down depends on how the signs of velocity and acceleration compare — not on the sign of either one alone.",
          "Same signs (both + or both −): acceleration pushes in the direction of motion, so the object SPEEDS UP.",
          "Opposite signs (one + and one −): acceleration opposes the motion, so the object SLOWS DOWN.",
          "Example: velocity −4 m/s with acceleration −1 m/s² → same signs → speeding up (moving backward faster).",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 4. Faded practice on the sign rule (medium) -----------------------
    {
      id: "l2-speedup",
      type: "multipleChoice",
      prompt:
        "An object has **positive** velocity and **negative** acceleration. What is it doing?",
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
          "Yes — velocity and acceleration have opposite signs, so the object slows down.",
        incorrect:
          "Compare the signs of v and a. Opposite signs mean slowing down.",
        incorrectByOption: {
          speeding:
            "Speeding up needs v and a to share a sign. Here they're opposite (positive v, negative a), so the object is slowing down.",
          rest: "At rest means v = 0, but here velocity is positive. Opposite signs of v and a mean it's slowing down, not stopped.",
        },
        hint: "Same signs → speeding up. Opposite signs → slowing down.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Write the two signs side by side: velocity is +, acceleration is −. Are they the same or opposite?",
        reveal:
          "The signs are opposite (+ velocity, − acceleration), so acceleration opposes the motion and the object slows down.",
        reviewToStepId: "l2-sign-concept",
      },
    },
    {
      id: "l2-sort",
      type: "sort",
      prompt:
        "Sort each scenario by whether the object is speeding up or slowing down.",
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
      mastery: {
        difficulty: "medium",
        scaffold:
          "Go one row at a time. For each, are the velocity and acceleration signs the same (speed up) or opposite (slow down)?",
        reveal:
          "A: both + → speeding up. B: + and − → slowing down. C: both − → speeding up.",
        reviewToStepId: "l2-sign-concept",
      },
    },

    // ---- 5. Worked example -> faded -> independent (a = Δv/Δt) -------------
    {
      id: "l2-worked",
      type: "workedExample",
      prompt: "Worked example: compute acceleration from a change in velocity",
      interactionConfig: {
        problem:
          "A train speeds up steadily from 4 m/s to 16 m/s over 6 seconds. What is its acceleration?",
        solution: [
          {
            label: "Step 1 — List what's known",
            detail:
              "Initial velocity v₀ = 4 m/s, final velocity v = 16 m/s, time interval Δt = 6 s.",
          },
          {
            label: "Step 2 — Find the change in velocity",
            detail: "Δv is final minus initial velocity.",
            formula: "Δv = 16 − 4 = 12 m/s",
          },
          {
            label: "Step 3 — Divide by the time taken",
            detail: "Acceleration is the change in velocity per second.",
            formula: "a = Δv / Δt = 12 / 6 = 2 m/s²",
          },
          {
            label: "Step 4 — Check the sign",
            detail:
              "Velocity is positive and increasing, so a is positive — it matches 'speeding up'.",
          },
        ],
        takeaway:
          "Acceleration from a velocity change is always a = Δv/Δt, where Δv = (final − initial) velocity. Keep the sign of Δv.",
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l2-faded",
      type: "numeric",
      prompt:
        "Your turn (same method). A car speeds up from 5 m/s to 20 m/s in 3 seconds. What is its acceleration?",
      interactionConfig: {
        unit: "m/s²",
        tolerance: 0.1,
        placeholder: "a = ?",
      },
      correctAnswer: { value: 5 },
      feedback: {
        correct: "Correct — Δv = 15 m/s over 3 s, so a = 15/3 = 5 m/s².",
        incorrect:
          "Use a = Δv/Δt with Δv = final − initial velocity.",
        hint: "First find Δv = 20 − 5, then divide by Δt = 3 s.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Start with the change in velocity: Δv = 20 − 5 = 15 m/s. The time is Δt = 3 s. Now divide.",
        reveal:
          "Δv = 20 − 5 = 15 m/s, Δt = 3 s, so a = 15 / 3 = 5 m/s².",
        reviewToStepId: "l2-worked",
      },
    },
    {
      id: "l2-apply-graph",
      type: "multipleChoice",
      prompt: "Read the acceleration directly from this velocity graph.",
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
          { id: "ten", label: "10 m/s²" },
        ],
      },
      correctAnswer: { optionId: "onefive" },
      feedback: {
        correct: "Correct — the line rises 1.5 m/s every second, so a = 1.5 m/s².",
        incorrect:
          "Acceleration is the slope: change in velocity ÷ change in time, not the final velocity.",
        incorrectByOption: {
          zero: "Zero would mean a flat velocity line, but this line rises over time. The slope (rise ÷ run) is 1.5 m/s².",
          ten: "10 m/s is roughly the final velocity, not the acceleration. Use the slope: from t = 0 to t = 6 s velocity goes 1 → 10 m/s, so a = 9/6 = 1.5 m/s².",
        },
        hint: "From t = 0 to t = 6 s velocity goes 1 → 10 m/s. Slope = rise / run.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Pick two points on the line. At t = 0, v ≈ 1 m/s; at t = 6 s, v = 10 m/s. The slope is rise ÷ run.",
        reveal:
          "Rise = 10 − 1 = 9 m/s, run = 6 s, so a = 9/6 = 1.5 m/s².",
        reviewToStepId: "l2-concept",
      },
    },
    {
      id: "l2-independent",
      type: "numeric",
      prompt:
        "Independent challenge — mind the sign. A cyclist slows from 12 m/s to 0 m/s in 4 seconds. What is the acceleration? (Include the sign.)",
      interactionConfig: {
        unit: "m/s²",
        tolerance: 0.1,
        placeholder: "a = ?",
      },
      correctAnswer: { value: -3 },
      feedback: {
        correct:
          "Correct — Δv = 0 − 12 = −12 m/s over 4 s, so a = −3 m/s² (negative because the cyclist slows).",
        incorrect:
          "Δv = final − initial velocity. Slowing down with positive velocity gives a negative acceleration.",
        hint: "Δv = 0 − 12 = −12 m/s. Then a = Δv/Δt.",
      },
      mastery: {
        difficulty: "hard",
        scaffold:
          "Final velocity is 0, initial is 12 m/s, so Δv = 0 − 12 = −12 m/s. Keep that minus sign when you divide by Δt = 4 s.",
        reveal:
          "Δv = 0 − 12 = −12 m/s, Δt = 4 s, so a = −12 / 4 = −3 m/s². It's negative because the velocity is decreasing.",
        reviewToStepId: "l2-worked",
      },
    },
  ],
};
