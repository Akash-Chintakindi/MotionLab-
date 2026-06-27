import type { Lesson } from "../../types/content";

/**
 * Lesson 5 — Motion in Two Dimensions.
 *
 * Follows the Lesson 2 mastery-learning template:
 *   1. Retrieval opener (recall Lesson 4's 1D kinematics from memory).
 *   2. Bridge + learning intention (one compact concept step).
 *   3. Deeper concept teaching (richer `concept` bodies + the vectors2d sim).
 *   4. Worked example -> faded practice -> independent practice, with rising
 *      difficulty and per-step `mastery` scaffolding.
 */
export const lesson5: Lesson = {
  id: "lesson-5-two-dimensions",
  title: "Motion in Two Dimensions",
  subtitle: "2D motion is two linked 1D motions.",
  order: 5,
  estimatedMinutes: 12,
  coreIdea: "2D motion is two linked 1D motions along x and y.",
  steps: [
    // ---- 1. Retrieval opener (recall Lesson 4 from memory) -----------------
    {
      id: "l5-retrieve",
      type: "multipleChoice",
      prompt:
        "Warm-up from memory — no notes. In Lesson 4 you integrated a **constant** acceleration to get velocity. For constant a, which equation gives the velocity at time t?",
      interactionConfig: {
        options: [
          { id: "vat", label: "v = v₀ + a·t" },
          { id: "xovert", label: "v = x / t" },
          { id: "half", label: "v = ½·a·t²" },
        ],
      },
      correctAnswer: { optionId: "vat" },
      feedback: {
        correct:
          "Exactly — integrating a constant acceleration adds a·t onto the starting velocity: v = v₀ + a·t. Today we apply that same 1D move to each axis of 2D motion.",
        incorrect:
          "Recall Lesson 4: integrating a constant acceleration gives v = v₀ + a·t.",
        incorrectByOption: {
          xovert:
            "x / t is an average velocity from a position change, not the result of integrating acceleration. Integrating constant a gives v = v₀ + a·t.",
          half:
            "½·a·t² is the displacement term in x = x₀ + v₀t + ½at², not the velocity. Velocity is v = v₀ + a·t.",
        },
        hint: "Integrate a constant a over time and add it to the starting velocity.",
      },
      mastery: { difficulty: "easy" },
    },

    // ---- 2. Bridge + learning intention ------------------------------------
    {
      id: "l5-bridge",
      type: "concept",
      prompt: "From one axis to two: apply 1D kinematics on each axis",
      interactionConfig: {
        body: [
          "You just recalled the 1D rule v = v₀ + a·t. The big idea today is that motion in two dimensions is nothing new — it is **two of those 1D problems running side by side**, one along x and one along y.",
          "By the end of this lesson you'll be able to: break a velocity into its x and y components, treat each axis as its own independent 1D motion, combine components back into a speed with the Pythagorean theorem, and say which way the acceleration points in circular motion.",
          "You'll know you've got it when you can take a 2D problem, solve it one axis at a time, and recombine — without help.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 3. Deeper concept teaching ----------------------------------------
    {
      id: "l5-concept",
      type: "concept",
      prompt: "Components and the independence of the axes",
      interactionConfig: {
        formula: "r = (x, y)   v = (vₓ, v_y)   a = (aₓ, a_y)",
        body: [
          "In 2D, position, velocity, and acceleration are vectors. We **decompose** each vector into an x-component and a y-component — its shadow on each axis. A velocity v becomes the pair (vₓ, v_y).",
          "The key result is the **independence of the axes**: the x-motion and the y-motion do not affect each other. Whatever happens along x obeys 1D kinematics using only aₓ, and whatever happens along y obeys 1D kinematics using only a_y. You can literally solve two separate 1D problems.",
          "To go back the other way, recombine the components. The speed is the magnitude of the velocity vector: |v| = √(vₓ² + v_y²). That Pythagorean step is how the two 1D answers become one 2D answer.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l5-sim",
      type: "sliderSimulation",
      prompt:
        "Watch an object move in a circle. Notice the velocity stays tangent while the acceleration points toward the center. Read the x and y components.",
      interactionConfig: { scenario: "vectors2d" },
      correctAnswer: null,
      feedback: {
        correct:
          "The velocity is tangent to the path and the acceleration points to the center — yet each is just its x and y parts combined.",
        incorrect: "",
      },
    },
    {
      id: "l5-centripetal-concept",
      type: "concept",
      prompt: "Why circular acceleration points to the center",
      interactionConfig: {
        body: [
          "In uniform circular motion the **speed** is constant, but the velocity is not — its direction is constantly turning. A change in velocity is an acceleration, even when the magnitude never changes.",
          "Because the velocity vector keeps rotating inward toward the path's curve, the change in velocity Δv always points toward the **center** of the circle. This inward acceleration is called centripetal (\"center-seeking\").",
          "It can feel like there is an outward push, but that is just your body's inertia. The real acceleration — the one bending the straight-line path into a circle — points inward, toward the center.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 4a. Conceptual check on the core idea (medium) --------------------
    {
      id: "l5-keyidea",
      type: "multipleChoice",
      prompt: "What is the key idea that makes 2D motion manageable?",
      interactionConfig: {
        options: [
          { id: "indep", label: "The x and y motions can be analyzed independently" },
          { id: "mag", label: "Only the speed (magnitude) matters" },
          { id: "ignore", label: "You can ignore one of the axes" },
        ],
      },
      correctAnswer: { optionId: "indep" },
      feedback: {
        correct: "Right — split the motion into independent x and y problems, then recombine.",
        incorrect:
          "Each component is its own 1D motion; you solve x and y separately and combine.",
        incorrectByOption: {
          mag:
            "Speed alone throws away direction. The real power of 2D is that the x and y components each behave as their own 1D motion.",
          ignore:
            "You can't drop an axis — both matter. The trick is treating x and y as independent 1D motions, then combining them.",
        },
        hint: "Think about how we treat horizontal and vertical motion separately.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Ask: does the horizontal motion change the vertical motion, or can each be solved on its own?",
        reveal:
          "The axes are independent — x obeys 1D kinematics with aₓ and y obeys 1D kinematics with a_y, separately — so you solve two 1D problems and recombine.",
        reviewToStepId: "l5-concept",
      },
    },

    // ---- 4b. Worked example -> faded -> independent (Pythagoras) -----------
    {
      id: "l5-worked",
      type: "workedExample",
      prompt: "Worked example: find the speed from velocity components",
      interactionConfig: {
        problem:
          "A drone's velocity has a horizontal component vₓ = 6 m/s and a vertical component v_y = 8 m/s. What is its speed (the magnitude of the velocity)?",
        solution: [
          {
            label: "Step 1 — List the components",
            detail:
              "The two independent 1D pieces of the velocity are vₓ = 6 m/s and v_y = 8 m/s.",
          },
          {
            label: "Step 2 — Recombine with the Pythagorean theorem",
            detail:
              "Speed is the magnitude of the velocity vector, so square each component and add.",
            formula: "|v| = √(vₓ² + v_y²) = √(6² + 8²)",
          },
          {
            label: "Step 3 — Evaluate",
            detail: "Add the squares, then take the square root.",
            formula: "|v| = √(36 + 64) = √100 = 10 m/s",
          },
          {
            label: "Step 4 — Sanity check",
            detail:
              "The speed (10 m/s) is larger than either component but smaller than their sum (14 m/s), exactly as a hypotenuse should be.",
          },
        ],
        takeaway:
          "To turn independent components back into a speed, use |v| = √(vₓ² + v_y²). Never just add the components.",
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l5-speed",
      type: "numeric",
      prompt:
        "Your turn (same method). An object's velocity has a horizontal component vₓ = 3 m/s and a vertical component v_y = 4 m/s. What is its speed?",
      interactionConfig: { unit: "m/s", tolerance: 0.1, placeholder: "speed = ?" },
      correctAnswer: { value: 5 },
      feedback: {
        correct:
          "Correct — speed = √(vₓ² + v_y²) = √(3² + 4²) = √25 = 5 m/s.",
        incorrect:
          "Don't just add 3 + 4. Combine the components with the Pythagorean theorem: √(vₓ² + v_y²).",
        hint: "speed = √(vₓ² + v_y²).",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Square each component: 3² = 9 and 4² = 16. Add them, then take the square root.",
        reveal:
          "√(3² + 4²) = √(9 + 16) = √25 = 5 m/s.",
        reviewToStepId: "l5-worked",
      },
    },
    {
      id: "l5-centripetal",
      type: "multipleChoice",
      prompt: "In uniform circular motion, the acceleration vector points…",
      interactionConfig: {
        options: [
          { id: "center", label: "Toward the center of the circle" },
          { id: "tangent", label: "Along the velocity (tangent)" },
          { id: "out", label: "Outward, away from the center" },
        ],
      },
      correctAnswer: { optionId: "center" },
      feedback: {
        correct:
          "Yes — speed is constant, but direction changes, and that change points to the center.",
        incorrect:
          "The velocity direction is constantly turning toward the center, so acceleration points inward.",
        incorrectByOption: {
          tangent:
            "The velocity is tangent; acceleration is how velocity changes. The direction keeps turning inward, so a points to the center, not along v.",
          out:
            "It feels like an outward push, but the acceleration actually points inward — toward the center — which is what bends the path into a circle.",
        },
        hint: "Watch the red acceleration arrow in the simulation.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "The speed is constant, so what about the velocity is changing — and which way does that change point?",
        reveal:
          "Only the velocity's direction changes, and that change Δv always points toward the center, so the acceleration is centripetal (inward).",
        reviewToStepId: "l5-centripetal-concept",
      },
    },
    {
      id: "l5-apply",
      type: "multipleChoice",
      prompt:
        "If the horizontal velocity component (vₓ) stays constant while the vertical component (v_y) changes over time, the acceleration is…",
      interactionConfig: {
        options: [
          { id: "vertical", label: "Purely vertical (in the y direction)" },
          { id: "horizontal", label: "Purely horizontal (in the x direction)" },
          { id: "zero", label: "Zero" },
        ],
      },
      correctAnswer: { optionId: "vertical" },
      feedback: {
        correct:
          "Correct — only v_y changes, so acceleration has only a y component. (This is exactly projectile motion!)",
        incorrect:
          "Acceleration comes from the velocity component that changes. Here only v_y changes.",
        incorrectByOption: {
          horizontal:
            "aₓ = d(vₓ)/dt, and vₓ is constant, so aₓ = 0. Only v_y changes, so the acceleration is vertical.",
          zero:
            "Zero acceleration needs both components constant, but v_y is changing — so a_y is nonzero and the acceleration is vertical.",
        },
        hint: "aₓ = d(vₓ)/dt and a_y = d(v_y)/dt. Which one is nonzero?",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Acceleration on each axis is the rate of change of that axis's velocity. Which component is actually changing?",
        reveal:
          "vₓ is constant so aₓ = 0; only v_y changes, so a_y ≠ 0 and the acceleration is purely vertical.",
        reviewToStepId: "l5-concept",
      },
    },
    {
      id: "l5-mag-independent",
      type: "numeric",
      prompt:
        "Independent challenge. An object accelerates with components aₓ = 5 m/s² and a_y = 12 m/s². What is the magnitude of its acceleration?",
      interactionConfig: { unit: "m/s²", tolerance: 0.1, placeholder: "|a| = ?" },
      correctAnswer: { value: 13 },
      feedback: {
        correct:
          "Correct — the same Pythagorean recombination works for any vector: |a| = √(5² + 12²) = √169 = 13 m/s².",
        incorrect:
          "Components recombine the same way for acceleration as for velocity: |a| = √(aₓ² + a_y²).",
        hint: "|a| = √(aₓ² + a_y²) = √(5² + 12²).",
      },
      mastery: {
        difficulty: "hard",
        scaffold:
          "Treat the acceleration like any vector: square each component (5² = 25, 12² = 144), add, then take the square root.",
        reveal:
          "|a| = √(5² + 12²) = √(25 + 144) = √169 = 13 m/s².",
        reviewToStepId: "l5-worked",
      },
    },
  ],
};
