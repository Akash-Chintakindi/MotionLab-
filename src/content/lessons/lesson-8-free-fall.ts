import type { Lesson } from "../../types/content";

/**
 * Lesson 8 (course order 7) — Free Fall and Motion Under Gravity.
 *
 * Follows the Lesson 2 mastery-learning template:
 *   1. Retrieval opener (recall from projectile motion that gravity gives a
 *      constant downward acceleration).
 *   2. Bridge + learning intention.
 *   3. Deeper concept teaching (free fall as constant-acceleration motion with
 *      a = -g) + the interactive kinematics sim.
 *   4. Worked example -> faded -> independent, difficulty rising, with per-step
 *      `mastery` scaffolding. g = 9.8 m/s² throughout.
 */
export const lesson8: Lesson = {
  id: "lesson-8-free-fall",
  title: "Free Fall and Motion Under Gravity",
  subtitle: "Free fall is constant-acceleration motion with a = −g.",
  order: 7,
  estimatedMinutes: 12,
  coreIdea:
    "Free fall is constant-acceleration motion with a downward acceleration of g ≈ 9.8 m/s².",
  steps: [
    // ---- 1. Retrieval opener (recall gravity from projectile motion) -------
    {
      id: "l8-retrieve",
      type: "multipleChoice",
      prompt:
        "Warm-up from memory — no notes. In the projectile lesson, the only thing acting on an airborne object (ignoring air resistance) was gravity. What is that object's acceleration while it is in the air?",
      interactionConfig: {
        options: [
          {
            id: "gdown",
            label: "About 9.8 m/s² directed downward, the whole time",
          },
          {
            id: "zeropeak",
            label: "9.8 m/s² down on the way up, but zero at the highest point",
          },
          { id: "depends", label: "It depends on how fast the object is moving" },
        ],
      },
      correctAnswer: { optionId: "gdown" },
      feedback: {
        correct:
          "Exactly — gravity gives a constant 9.8 m/s² downward the entire flight. Today we build all of free fall on that single constant acceleration.",
        incorrect:
          "Recall projectile motion: gravity acts the whole time, giving a constant 9.8 m/s² downward.",
        incorrectByOption: {
          zeropeak:
            "At the peak the velocity is momentarily zero, but gravity never switches off — the acceleration stays 9.8 m/s² downward the entire flight.",
          depends:
            "Gravity gives the same acceleration to everything regardless of speed (or mass): a constant 9.8 m/s² downward.",
        },
        hint: "Does gravity ever turn off while the object is in the air?",
      },
      mastery: { difficulty: "easy" },
    },

    // ---- 2. Bridge + learning intention ------------------------------------
    {
      id: "l8-bridge",
      type: "concept",
      prompt: "Free fall is just constant-acceleration motion",
      interactionConfig: {
        body: [
          "Here is the whole idea: an object in free fall obeys nothing new. It is the same constant-acceleration motion you mastered in Lesson 4 — the acceleration just happens to be gravity.",
          "Choose up as the positive direction. Then the acceleration is a = −g ≈ −9.8 m/s² (negative because gravity points down). Every constant-acceleration equation you already know still applies, with that one substitution.",
          "By the end of this lesson you'll be able to: find how fast and how far a dropped object moves, handle an object thrown straight up, and explain why velocity is zero — but acceleration is NOT — at the very top of the flight.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 3. Deeper concept teaching ----------------------------------------
    {
      id: "l8-concept",
      type: "concept",
      prompt: "The free-fall equations (taking up as positive)",
      interactionConfig: {
        formula: "v = v₀ − g·t     and     y = y₀ + v₀·t − ½·g·t²",
        body: [
          "Start from the constant-acceleration equations and substitute a = −g. The velocity becomes v = v₀ − g·t, and the height becomes y = y₀ + v₀·t − ½·g·t². The minus signs are just gravity pulling down on a coordinate where up is positive.",
          "Dropped from rest (v₀ = 0): the speed after time t is simply g·t, and the distance fallen is ½·g·t². Notice the speed grows linearly while the distance grows with t² — fall twice as long and you fall four times as far.",
          "A useful time-free equation also carries over: v² = v₀² − 2·g·(y − y₀). It's the quickest route to a maximum height or an impact speed when you don't care about the time.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l8-sim",
      type: "sliderSimulation",
      prompt:
        "Model free fall: set the acceleration near −9.8 m/s² (gravity, with up positive). Watch the velocity fall as a straight line and the position curve downward as a parabola — exactly the constant-acceleration picture.",
      interactionConfig: {
        scenario: "kinematics",
        a: -9.8,
        v0: 0,
        x0: 0,
        T: 4,
        aRange: [-10, 4],
        v0Range: [-10, 20],
      },
      correctAnswer: null,
      feedback: {
        correct:
          "With a constant negative acceleration, velocity is a downward-sloping straight line and position is a downward parabola — free fall is just constant-acceleration motion.",
        incorrect: "",
      },
    },
    {
      id: "l8-peak-concept",
      type: "concept",
      prompt: "Throwing straight up: the trip is symmetric",
      interactionConfig: {
        body: [
          "Throw a ball straight up. On the way up gravity opposes the motion, so the ball slows down; at the very top its velocity is momentarily zero; then it speeds up on the way down. Throughout, the acceleration is the same −g.",
          "The most common trap: at the highest point velocity = 0 but acceleration ≠ 0. If acceleration were zero up there, the ball would hang in the air. It's gravity (still 9.8 m/s² down) that pulls it back.",
          "The motion is symmetric: the time to rise equals the time to fall back to the launch height, and the speed when it returns equals the launch speed. So the time to the peak is t = v₀/g.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 4a. Conceptual check on the peak misconception (medium) -----------
    {
      id: "l8-peak",
      type: "multipleChoice",
      prompt:
        "A ball is thrown straight up. At the exact highest point of its flight, its velocity and acceleration are:",
      interactionConfig: {
        options: [
          { id: "vzero_anonzero", label: "Velocity zero; acceleration 9.8 m/s² downward" },
          { id: "both_zero", label: "Both zero" },
          { id: "both_down", label: "Both 9.8 m/s² downward" },
        ],
      },
      correctAnswer: { optionId: "vzero_anonzero" },
      feedback: {
        correct:
          "Right — the velocity is momentarily zero, but gravity still acts, so the acceleration is 9.8 m/s² downward.",
        incorrect:
          "Velocity is zero at the peak, but acceleration is not — gravity never stops.",
        incorrectByOption: {
          both_zero:
            "If the acceleration were zero, the ball would hover at the top forever. Gravity keeps acting, so a = 9.8 m/s² down even though v = 0.",
          both_down:
            "Acceleration is 9.8 m/s² down, but the velocity is not — at the very top the velocity is momentarily zero before reversing.",
        },
        hint: "What would happen if the acceleration really were zero at the top?",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Separate the two quantities. The ball stops rising for an instant (what is v?), but gravity is still pulling (what is a?).",
        reveal:
          "At the peak v = 0 (it has stopped rising and not yet started falling), but a = 9.8 m/s² downward because gravity acts the whole time.",
        reviewToStepId: "l8-peak-concept",
      },
    },

    // ---- 4b. Worked example -> faded -> independent ------------------------
    {
      id: "l8-worked",
      type: "workedExample",
      prompt: "Worked example: a dropped rock",
      interactionConfig: {
        problem:
          "A rock is dropped from rest off a cliff. Using g = 9.8 m/s², find (a) its speed after 4 s and (b) how far it has fallen in that time.",
        solution: [
          {
            label: "Step 1 — List what's known",
            detail:
              "Dropped from rest, so v₀ = 0. Acceleration is gravity, g = 9.8 m/s². Time t = 4 s.",
          },
          {
            label: "Step 2 — Speed grows linearly (v = g·t)",
            detail:
              "With v₀ = 0, the speed is just the velocity gained: g·t.",
            formula: "v = g·t = 9.8 × 4 = 39.2 m/s",
          },
          {
            label: "Step 3 — Distance grows with t² (½·g·t²)",
            detail:
              "With v₀ = 0, the distance fallen is ½·g·t². Square the time first.",
            formula: "y = ½·g·t² = ½ × 9.8 × 4² = ½ × 9.8 × 16 = 78.4 m",
          },
          {
            label: "Step 4 — Sanity check",
            detail:
              "Speed (39.2 m/s) is g times the time, and the distance uses t² — both are exactly what constant downward acceleration predicts.",
          },
        ],
        takeaway:
          "Dropped from rest: speed after time t is g·t, and distance fallen is ½·g·t². Square the time for the distance, not for the speed.",
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l8-faded-speed",
      type: "numeric",
      prompt:
        "Your turn (same method). A ball is dropped from rest. Using g = 9.8 m/s², what is its speed after 3 s?",
      interactionConfig: {
        unit: "m/s",
        tolerance: 0.2,
        placeholder: "v = ?",
      },
      correctAnswer: { value: 29.4 },
      feedback: {
        correct: "Correct — v = g·t = 9.8 × 3 = 29.4 m/s.",
        incorrect: "Dropped from rest, the speed is just g·t.",
        hint: "Multiply g = 9.8 m/s² by the time t = 3 s.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "It starts from rest (v₀ = 0), so the speed is simply the velocity gained: v = g·t. Multiply 9.8 by 3.",
        reveal: "v = g·t = 9.8 × 3 = 29.4 m/s.",
        reviewToStepId: "l8-worked",
      },
    },
    {
      id: "l8-faded-distance",
      type: "numeric",
      prompt:
        "Same drop, now the distance. How far does an object dropped from rest fall in 2 s? (g = 9.8 m/s²)",
      interactionConfig: {
        unit: "m",
        tolerance: 0.2,
        placeholder: "y = ?",
      },
      correctAnswer: { value: 19.6 },
      feedback: {
        correct: "Correct — y = ½·g·t² = ½ × 9.8 × 2² = ½ × 9.8 × 4 = 19.6 m.",
        incorrect:
          "Distance fallen from rest is ½·g·t². Remember to square the time.",
        hint: "Square t = 2 first (= 4), then take ½ × 9.8 × 4.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Use y = ½·g·t² with v₀ = 0. Square the time first: t² = 2² = 4. Then multiply by ½ × 9.8.",
        reveal: "y = ½·g·t² = ½ × 9.8 × 4 = 19.6 m.",
        reviewToStepId: "l8-concept",
      },
    },
    {
      id: "l8-sort",
      type: "sort",
      prompt:
        "A ball is thrown straight up. Sort each quantity by its value at the instant the ball reaches its highest point.",
      interactionConfig: {
        buckets: [
          { id: "zero", label: "Becomes zero" },
          { id: "nonzero", label: "Stays nonzero" },
        ],
        items: [
          { id: "velocity", label: "The velocity" },
          { id: "speed", label: "The speed" },
          { id: "accel", label: "The acceleration" },
        ],
      },
      correctAnswer: { velocity: "zero", speed: "zero", accel: "nonzero" },
      feedback: {
        correct:
          "At the peak the ball is momentarily not moving (velocity and speed are zero), but gravity still acts, so the acceleration is not zero.",
        incorrect:
          "The ball stops moving for an instant at the top, but gravity never stops.",
        hint: "Velocity and speed describe the motion (which pauses); acceleration describes gravity (which doesn't).",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Ask for each: is it about how the ball is MOVING at the top, or about GRAVITY? Motion pauses; gravity does not.",
        reveal:
          "Velocity → zero and speed → zero (the ball is momentarily stopped), but acceleration → not zero (gravity is still 9.8 m/s² down).",
        reviewToStepId: "l8-peak-concept",
      },
    },
    {
      id: "l8-symmetry",
      type: "multipleChoice",
      prompt:
        "A ball is thrown straight up and returns to the same height it was launched from. Ignoring air resistance, how does the time going up compare with the time coming down?",
      interactionConfig: {
        options: [
          { id: "equal", label: "They are equal" },
          { id: "up_longer", label: "The trip up takes longer" },
          { id: "down_longer", label: "The trip down takes longer" },
        ],
      },
      correctAnswer: { optionId: "equal" },
      feedback: {
        correct:
          "Right — free fall is symmetric: rise time equals fall time, and the return speed equals the launch speed.",
        incorrect:
          "The same constant gravity governs both halves, so the motion is symmetric.",
        incorrectByOption: {
          up_longer:
            "Gravity is the same constant on both halves, so neither leg is favored — the up and down times are equal.",
          down_longer:
            "It feels that way, but with the same constant acceleration the two halves are mirror images: rise time equals fall time.",
        },
        hint: "Gravity is the same the whole time, so the two halves mirror each other.",
      },
      mastery: { difficulty: "medium" },
    },
    {
      id: "l8-independent",
      type: "numeric",
      prompt:
        "Independent challenge. A ball is thrown straight up at 19.6 m/s (g = 9.8 m/s²). What maximum height does it reach above the launch point?",
      interactionConfig: {
        unit: "m",
        tolerance: 0.3,
        placeholder: "h = ?",
      },
      correctAnswer: { value: 19.6 },
      feedback: {
        correct:
          "Correct — at the peak v = 0, so 0 = v₀² − 2gh gives h = v₀²/(2g) = 19.6² / (2 × 9.8) = 384.16 / 19.6 = 19.6 m.",
        incorrect:
          "At the highest point the velocity is zero. Use v² = v₀² − 2gh with v = 0 and solve for h.",
        hint: "Set v = 0 in v² = v₀² − 2gh, so h = v₀²/(2g).",
      },
      mastery: {
        difficulty: "hard",
        scaffold:
          "At the top the velocity is 0. Put v = 0 into v² = v₀² − 2gh: that gives 0 = v₀² − 2gh, so h = v₀²/(2g). Now plug in v₀ = 19.6 and g = 9.8.",
        reveal:
          "h = v₀²/(2g) = 19.6² / (2 × 9.8) = 384.16 / 19.6 = 19.6 m.",
        reviewToStepId: "l8-concept",
      },
    },
  ],
};
