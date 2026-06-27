import type { Lesson } from "../../types/content";

/**
 * Lesson 4 — From Acceleration to Velocity and Position.
 *
 * Mirrors the Lesson 2 mastery-learning template:
 *   1. Retrieval opener (recall Lesson 3 from memory: displacement = area under v).
 *   2. Bridge + learning intention.
 *   3. Deeper concept teaching (derive v = v₀ + a·t and x = x₀ + v₀·t + ½·a·t²
 *      from integration/area) + the interactive kinematics sim.
 *   4. Worked example -> faded -> independent, difficulty rising through the
 *      lesson with per-step `mastery` scaffolding.
 */
export const lesson4: Lesson = {
  id: "lesson-4-acceleration-to-position",
  title: "From Acceleration to Velocity and Position",
  subtitle: "Integrate acceleration to build velocity and position.",
  order: 4,
  estimatedMinutes: 12,
  coreIdea:
    "Integrating acceleration builds velocity, and integrating velocity builds position.",
  steps: [
    // ---- 1. Retrieval opener (recall Lesson 3 from memory) -----------------
    {
      id: "l4-retrieve",
      type: "multipleChoice",
      prompt:
        "Warm-up from memory — no notes. From Lesson 3: on a **velocity–time** graph, the *displacement* over an interval is given by what?",
      interactionConfig: {
        plot: {
          preset: "vConstantPos",
          tMin: 0,
          tMax: 5,
          yMin: 0,
          yMax: 8,
          xLabel: "time (s)",
          yLabel: "velocity (m/s)",
          area: { from: 0, to: 5 },
        },
        options: [
          { id: "area", label: "The (signed) area under the velocity–time graph" },
          { id: "slope", label: "The slope of the velocity–time graph" },
          { id: "areaA", label: "The area under the acceleration–time graph" },
        ],
      },
      correctAnswer: { optionId: "area" },
      feedback: {
        correct:
          "Exactly — displacement is the signed area under v(t). That integrate-to-accumulate idea is what today extends one level down, from acceleration.",
        incorrect:
          "Recall Lesson 3: displacement is the signed area under the velocity–time graph.",
        incorrectByOption: {
          slope:
            "The slope of v(t) is the acceleration (Lesson 2). The *area* under v(t) is the displacement (Lesson 3).",
          areaA:
            "Close idea, wrong graph. Area under v(t) gives displacement; area under a(t) gives the change in velocity — which is exactly what we'll use today.",
        },
        hint: "Area under velocity accumulates distance traveled.",
      },
      mastery: { difficulty: "easy" },
    },

    // ---- 2. Bridge + learning intention ------------------------------------
    {
      id: "l4-bridge",
      type: "concept",
      prompt: "From area-under-velocity to building motion from acceleration",
      interactionConfig: {
        body: [
          "You just recalled that displacement is the area under v(t) — integrating velocity accumulates position. Today we run that same accumulate-by-area move one rung lower: the area under a(t) accumulates velocity.",
          "So the chain is: integrate **acceleration** to build **velocity**, then integrate **velocity** to build **position**. Two integrations turn a known acceleration into a full description of the motion.",
          "By the end of this lesson you'll be able to derive and apply v = v₀ + a·t and x = x₀ + v₀·t + ½·a·t², and solve for a final velocity or a position even when v₀ and x₀ aren't zero.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 3. Deeper concept teaching ----------------------------------------
    {
      id: "l4-concept-v",
      type: "concept",
      prompt: "Building velocity: v = v₀ + a·t",
      interactionConfig: {
        formula: "v(t) = v₀ + ∫₀ᵗ a dt  →  v = v₀ + a·t",
        body: [
          "Change in velocity is the area under the acceleration–time graph: Δv = ∫a dt. This is the same area logic you used for displacement in Lesson 3, just applied to a(t).",
          "With a *constant* acceleration a, the a(t) graph is a flat line at height a, so the area from 0 to t is just a rectangle: width t × height a = a·t. That area is the change in velocity, Δv = a·t.",
          "Add the velocity you already had at the start, v₀ (the constant of integration), and you get v(t) = v₀ + a·t. Because v grows by a fixed amount each second, v(t) is a straight line: v₀ is its intercept and a is its slope.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l4-concept-x",
      type: "concept",
      prompt: "Building position: x = x₀ + v₀·t + ½·a·t²",
      interactionConfig: {
        formula: "x(t) = x₀ + ∫₀ᵗ v dt  →  x = x₀ + v₀·t + ½·a·t²",
        body: [
          "Now integrate again. Position change is the area under the velocity–time graph: Δx = ∫v dt. With v(t) = v₀ + a·t, that area is a region under a tilted straight line.",
          "Split that area into two simple pieces. The rectangle of height v₀ over width t contributes v₀·t. The triangle on top — base t, height a·t (the extra velocity gained) — contributes ½·(t)·(a·t) = ½·a·t².",
          "Add the starting position x₀ and you get x(t) = x₀ + v₀·t + ½·a·t². The t² term makes x(t) a parabola: under constant acceleration, position curves rather than rising in a straight line.",
        ],
        graph: {
          curve: "accelerating",
          tMin: 0,
          tMax: 6,
          xMin: 0,
          xMax: 10,
          xLabel: "time (s)",
          yLabel: "position (m)",
        },
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l4-sim",
      type: "sliderSimulation",
      prompt:
        "Change the constant acceleration and initial velocity. Watch a(t), v(t), and x(t) respond together — each graph is the integral of the one above it.",
      interactionConfig: {
        scenario: "kinematics",
        a: 2,
        v0: 0,
        x0: 0,
        T: 5,
        aRange: [-4, 4],
        v0Range: [-6, 6],
      },
      correctAnswer: null,
      feedback: {
        correct:
          "Each graph is the integral of the one above it: constant a gives a straight-line v, which gives a parabolic x.",
        incorrect: "",
      },
    },

    // ---- 4. Mastery: worked example -> faded -> independent -----------------
    {
      id: "l4-worked",
      type: "workedExample",
      prompt: "Worked example: find a final velocity with v = v₀ + a·t",
      interactionConfig: {
        problem:
          "A drone is already moving at v₀ = 3 m/s when it fires its thruster, giving a constant acceleration a = 4 m/s² for t = 6 s. What is its final velocity?",
        solution: [
          {
            label: "Step 1 — List what's known",
            detail:
              "Initial velocity v₀ = 3 m/s, acceleration a = 4 m/s², time t = 6 s. We want the final velocity v.",
          },
          {
            label: "Step 2 — Choose the equation",
            detail:
              "Velocity is built by integrating acceleration. With constant a that's the rectangle area a·t added to the starting velocity.",
            formula: "v = v₀ + a·t",
          },
          {
            label: "Step 3 — Substitute and compute",
            detail: "Put the numbers in and evaluate.",
            formula: "v = 3 + (4)(6) = 3 + 24 = 27 m/s",
          },
          {
            label: "Step 4 — Sanity check",
            detail:
              "Acceleration is positive and shares the sign of v₀, so the drone speeds up — a final velocity larger than 3 m/s is exactly what we expect.",
          },
        ],
        takeaway:
          "Final velocity under constant acceleration is always v = v₀ + a·t. The a·t term is the velocity GAINED; don't forget to add the starting velocity v₀.",
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l4-finalv",
      type: "numeric",
      prompt:
        "Starting from rest (v₀ = 0) with a = 2 m/s², what is the velocity at t = 5 s?",
      interactionConfig: {
        unit: "m/s",
        tolerance: 0.5,
        placeholder: "m/s",
      },
      correctAnswer: { value: 10 },
      feedback: {
        correct: "Correct — v = v₀ + a·t = 0 + 2·5 = 10 m/s.",
        incorrect: "Use v = v₀ + a·t with v₀ = 0, a = 2, t = 5.",
        hint: "v = v₀ + a·t.",
      },
      mastery: {
        difficulty: "easy",
        scaffold:
          "Starting from rest means v₀ = 0, so the final velocity is just the gained velocity a·t. Multiply a = 2 by t = 5.",
        reveal:
          "v = v₀ + a·t = 0 + (2)(5) = 10 m/s.",
        reviewToStepId: "l4-concept-v",
      },
    },
    {
      id: "l4-faded",
      type: "numeric",
      prompt:
        "Your turn (same method as the worked example). A cart already moving at v₀ = 2 m/s accelerates at a = 3 m/s² for t = 4 s. What is its final velocity?",
      interactionConfig: {
        unit: "m/s",
        tolerance: 0.1,
        placeholder: "v = ?",
      },
      correctAnswer: { value: 14 },
      feedback: {
        correct: "Correct — v = v₀ + a·t = 2 + 3·4 = 2 + 12 = 14 m/s.",
        incorrect:
          "Use v = v₀ + a·t. Add the gained velocity a·t to the starting velocity v₀.",
        hint: "First find the gained velocity a·t = 3 × 4, then add v₀ = 2.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Find the velocity gained first: a·t = 3 × 4 = 12 m/s. The cart didn't start from rest, so add the initial v₀ = 2 m/s.",
        reveal:
          "a·t = 3 × 4 = 12 m/s, then v = v₀ + a·t = 2 + 12 = 14 m/s.",
        reviewToStepId: "l4-worked",
      },
    },
    {
      id: "l4-disp",
      type: "numeric",
      prompt:
        "With v₀ = 0, x₀ = 0, and a = 2 m/s², what is the displacement after 5 s?",
      interactionConfig: {
        unit: "m",
        tolerance: 0.5,
        placeholder: "m",
      },
      correctAnswer: { value: 25 },
      feedback: {
        correct: "Correct — x = ½·a·t² = ½·2·25 = 25 m.",
        incorrect: "Use x = x₀ + v₀·t + ½·a·t² with v₀ = 0.",
        hint: "With v₀ = 0, displacement is ½·a·t².",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "With v₀ = 0 and x₀ = 0, the v₀·t and x₀ terms vanish, leaving x = ½·a·t². Square t = 5 first (= 25), then take ½ of a × that.",
        reveal:
          "x = x₀ + v₀·t + ½·a·t² = 0 + 0 + ½·(2)(5²) = ½·2·25 = 25 m.",
        reviewToStepId: "l4-concept-x",
      },
    },
    {
      id: "l4-independent",
      type: "numeric",
      prompt:
        "Independent challenge — nothing starts at zero. A car at position x₀ = 5 m is moving at v₀ = 3 m/s and accelerates at a = 2 m/s². Where is it (its position x) after t = 4 s?",
      interactionConfig: {
        unit: "m",
        tolerance: 0.1,
        placeholder: "x = ?",
      },
      correctAnswer: { value: 33 },
      feedback: {
        correct:
          "Correct — x = x₀ + v₀·t + ½·a·t² = 5 + 3·4 + ½·2·4² = 5 + 12 + 16 = 33 m.",
        incorrect:
          "Use the full equation x = x₀ + v₀·t + ½·a·t². Keep all three terms — x₀ and v₀ are not zero here.",
        hint: "Add three pieces: x₀ = 5, then v₀·t = 3·4, then ½·a·t² = ½·2·16.",
      },
      mastery: {
        difficulty: "hard",
        scaffold:
          "Work term by term: x₀ = 5 m, v₀·t = 3 × 4 = 12 m, and ½·a·t² = ½ × 2 × 4² = 16 m. Then add all three.",
        reveal:
          "x = x₀ + v₀·t + ½·a·t² = 5 + (3)(4) + ½·(2)(4²) = 5 + 12 + 16 = 33 m.",
        reviewToStepId: "l4-concept-x",
      },
    },
    {
      id: "l4-initcond",
      type: "multipleChoice",
      prompt:
        "Keeping the same acceleration but increasing v₀, how does the v(t) graph change?",
      interactionConfig: {
        options: [
          { id: "up", label: "It shifts upward (same slope)" },
          { id: "steeper", label: "It gets steeper" },
          { id: "nochange", label: "It does not change" },
        ],
      },
      correctAnswer: { optionId: "up" },
      feedback: {
        correct:
          "Right — v₀ sets the starting value (the intercept); the slope is still a.",
        incorrect:
          "v₀ is the value of v at t = 0. The slope of v(t) is the acceleration, which hasn't changed.",
        incorrectByOption: {
          steeper:
            "Steepness is set by the slope, which is the acceleration — and that's unchanged. v₀ only moves the starting value, so the line shifts up.",
          nochange:
            "v₀ is the value of v at t = 0, so changing it does move the graph — the whole line shifts up while keeping the same slope.",
        },
        hint: "Changing the intercept shifts a line; changing the slope tilts it.",
      },
      mastery: { difficulty: "medium" },
    },
    {
      id: "l4-apply",
      type: "multipleChoice",
      prompt: "Under constant acceleration, the position-time graph x(t) is…",
      interactionConfig: {
        options: [
          { id: "parabola", label: "A parabola" },
          { id: "line", label: "A straight line" },
          { id: "flat", label: "Flat at zero" },
        ],
      },
      correctAnswer: { optionId: "parabola" },
      feedback: {
        correct:
          "Yes — x(t) = x₀ + v₀t + ½at² is quadratic in t, so it's a parabola.",
        incorrect:
          "Integrating a straight-line v(t) gives a t² term, which is a parabola.",
        incorrectByOption: {
          line:
            "A straight-line x(t) would mean constant velocity. With constant acceleration v grows linearly, so x picks up a t² term — a parabola.",
          flat:
            "Flat at zero means no motion at all. Under constant acceleration the object moves, and x(t) = x₀ + v₀t + ½at² is a parabola.",
        },
        hint: "Look at the highest power of t in x(t).",
      },
      mastery: { difficulty: "medium" },
    },
  ],
};
