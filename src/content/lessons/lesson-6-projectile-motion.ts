import type { Lesson } from "../../types/content";

/**
 * Lesson 6 — Projectile Motion. Follows the Lesson 2 mastery template:
 *   1. Retrieval opener (recall Lesson 5: 2D = two independent 1D motions).
 *   2. Bridge + learning intention.
 *   3. Deeper concept teaching (independence, constant vₓ, vertical free-fall,
 *      symmetry, the peak) + the interactive projectile simulation.
 *   4. Worked example -> faded practice -> independent practice, with rising
 *      difficulty and per-step `mastery` scaffolding.
 */
export const lesson6: Lesson = {
  id: "lesson-6-projectile-motion",
  title: "Projectile Motion",
  subtitle: "Horizontal and vertical motion are independent.",
  order: 6,
  estimatedMinutes: 11,
  coreIdea: "Horizontal and vertical motion are independent.",
  steps: [
    // ---- 1. Retrieval opener (recall Lesson 5 from memory) -----------------
    {
      id: "l6-retrieve",
      type: "multipleChoice",
      prompt:
        "Warm-up from memory — no notes. From **Lesson 5**, how do we analyze an object moving in **two dimensions**?",
      interactionConfig: {
        options: [
          {
            id: "independent",
            label:
              "As two separate 1D motions — the x-axis and y-axis are analyzed independently",
          },
          {
            id: "diagonal",
            label: "With one equation that follows the diagonal path directly",
          },
          {
            id: "linked",
            label:
              "The x and y motions are linked, so they must be solved together as one",
          },
        ],
      },
      correctAnswer: { optionId: "independent" },
      feedback: {
        correct:
          "Exactly. 2D motion is just two 1D motions side by side — the x and y axes don't interfere. That independence is the whole key to projectile motion today.",
        incorrect:
          "Recall Lesson 5: a 2D motion splits into independent x and y components you analyze separately.",
        incorrectByOption: {
          diagonal:
            "We don't chase the diagonal directly. The Lesson 5 trick is to split the motion into x and y components and handle each on its own.",
          linked:
            "The opposite, in fact — the x and y motions are *independent*. What happens horizontally doesn't change the vertical motion, and vice versa.",
        },
        hint: "Split it into components — one motion per axis.",
      },
      mastery: { difficulty: "easy" },
    },

    // ---- 2. Bridge + learning intention ------------------------------------
    {
      id: "l6-bridge",
      type: "concept",
      prompt: "From 2D components to the projectile",
      interactionConfig: {
        body: [
          "You just recalled that 2D motion is two independent 1D motions, one per axis. Projectile motion is the most important example of exactly that idea.",
          "A projectile only has gravity acting on it. Gravity pulls straight **down**, so it changes the vertical motion but leaves the horizontal motion completely alone. The two axes run independently — just like Lesson 5 promised.",
          "By the end of this lesson you'll be able to: split a launch velocity into components, explain why horizontal velocity stays constant while vertical velocity changes at g, use the peak (vᵧ = 0) and symmetry, and compute time-to-peak and time-of-flight on your own.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 3. Deeper concept teaching ----------------------------------------
    {
      id: "l6-concept",
      type: "concept",
      prompt: "Two motions at once",
      interactionConfig: {
        formula: "x = (v₀ cosθ) t     y = (v₀ sinθ) t − ½ g t²",
        body: [
          "A projectile has **constant horizontal velocity** and **constant vertical acceleration** (gravity, g ≈ 10 m/s² downward). Nothing pushes it sideways, so vₓ never changes; gravity acts only vertically, so vᵧ changes steadily.",
          "Because the axes are independent, you can solve each one separately and then combine. The horizontal motion is constant-velocity (x = vₓ·t); the vertical motion is free-fall with the same equations you used for a ball thrown straight up.",
          "The first move on every projectile problem is to **split the launch velocity into components**: the horizontal part v₀ₓ = v₀·cosθ and the vertical part v₀ᵧ = v₀·sinθ. From there it's just two 1D problems.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l6-vertical-concept",
      type: "concept",
      prompt: "The vertical story: rise, stop, fall — symmetrically",
      interactionConfig: {
        formula: "vᵧ(t) = v₀ᵧ − g t",
        body: [
          "Vertically, a projectile behaves exactly like something thrown straight up: it rises while gravity slows it, momentarily stops, then falls while gravity speeds it back up.",
          "At the **highest point** the vertical velocity is zero (vᵧ = 0) for an instant — the object has stopped going up but hasn't started coming down. The horizontal velocity, meanwhile, keeps cruising along unchanged.",
          "The flight is **symmetric**. Time going up equals time coming down, so the time to reach the peak is t_peak = v₀ᵧ / g, and the total time of flight on level ground is twice that: t_flight = 2·v₀ᵧ / g.",
          "Range is largest at a **45°** launch, which best balances horizontal speed against time in the air. Higher angles spend more time aloft but move slower sideways; lower angles move fast sideways but land quickly.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l6-sim",
      type: "sliderSimulation",
      prompt:
        "Launch projectiles. Change the angle and speed and watch the trajectory, time of flight, peak height, and range. Notice horizontal velocity never changes while vertical velocity flips sign at the top.",
      interactionConfig: {
        scenario: "projectile",
        a: 45,
        v0: 20,
      },
      correctAnswer: null,
      feedback: {
        correct:
          "Range is largest near 45°. Steeper launches go higher but not as far, and the horizontal velocity stays constant the whole flight.",
        incorrect: "",
      },
    },

    // ---- 4a. Concept checks on the kept ideas ------------------------------
    {
      id: "l6-horizontal",
      type: "multipleChoice",
      prompt:
        "Ignoring air resistance, the horizontal velocity during the flight…",
      interactionConfig: {
        options: [
          { id: "constant", label: "Stays constant" },
          { id: "increase", label: "Increases" },
          { id: "decrease", label: "Decreases to zero at the top" },
        ],
      },
      correctAnswer: { optionId: "constant" },
      feedback: {
        correct: "Right — there is no horizontal force, so vₓ never changes.",
        incorrect:
          "Gravity acts only vertically, so it cannot change the horizontal velocity.",
        incorrectByOption: {
          increase:
            "Nothing pushes the projectile horizontally — gravity acts only downward — so vₓ has no way to increase; it stays constant.",
          decrease:
            "Horizontal velocity doesn't drop at the top; only the vertical velocity does. With no horizontal force, vₓ stays constant throughout.",
        },
        hint: "Which direction does gravity pull?",
      },
      mastery: {
        difficulty: "easy",
        scaffold:
          "List the forces in flight. The only one is gravity — which way does it point?",
        reveal:
          "Gravity is purely vertical, so there is no horizontal force. With no horizontal force, vₓ stays constant for the whole flight.",
        reviewToStepId: "l6-concept",
      },
    },
    {
      id: "l6-peak",
      type: "multipleChoice",
      prompt: "At the highest point of the trajectory, the vertical velocity is…",
      interactionConfig: {
        options: [
          { id: "zero", label: "Zero" },
          { id: "max", label: "At its maximum" },
          { id: "neg", label: "Equal to the launch speed, but downward" },
        ],
      },
      correctAnswer: { optionId: "zero" },
      feedback: {
        correct:
          "Yes — the object stops rising for an instant, so vᵧ = 0 at the peak (horizontal velocity continues).",
        incorrect:
          "At the very top the object is momentarily not moving up or down, so vᵧ = 0.",
        incorrectByOption: {
          max:
            "vᵧ is largest at launch, not the top. At the peak the object briefly stops rising, so vᵧ = 0 there.",
          neg:
            "vᵧ only becomes downward (negative) after the peak. At the very top it passes through zero as it switches from rising to falling.",
        },
        hint: "What must vᵧ be the instant the object switches from rising to falling?",
      },
      mastery: {
        difficulty: "easy",
        scaffold:
          "Right at the top the object is neither rising nor falling. What does that make its vertical velocity?",
        reveal:
          "At the peak the object switches from going up to coming down, so for that instant vᵧ = 0. The horizontal velocity keeps going.",
        reviewToStepId: "l6-vertical-concept",
      },
    },
    {
      id: "l6-component",
      type: "numeric",
      prompt:
        "A projectile is launched at 20 m/s at 30° above the horizontal. What is the initial **vertical** velocity component?",
      interactionConfig: { unit: "m/s", tolerance: 0.3, placeholder: "vᵧ = ?" },
      correctAnswer: { value: 10 },
      feedback: {
        correct: "Correct — v₀ᵧ = v₀·sinθ = 20·sin30° = 10 m/s.",
        incorrect:
          "Use v₀ᵧ = v₀·sinθ for the vertical part — sinθ, not cosθ (cosθ gives the horizontal component).",
        hint: "sin30° = 0.5.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "The vertical component uses sine: v₀ᵧ = v₀·sinθ. Here v₀ = 20 m/s and θ = 30°, and sin30° = 0.5.",
        reveal:
          "v₀ᵧ = v₀·sinθ = 20·sin30° = 20·0.5 = 10 m/s.",
        reviewToStepId: "l6-concept",
      },
    },

    // ---- 4b. Worked example -> faded -> independent (time to peak) ----------
    {
      id: "l6-worked",
      type: "workedExample",
      prompt: "Worked example: how long to reach the highest point?",
      interactionConfig: {
        problem:
          "A ball is kicked at 25 m/s at 53° above the horizontal. Using g = 10 m/s², how long does it take to reach its highest point? (sin53° ≈ 0.80)",
        solution: [
          {
            label: "Step 1 — List what's known",
            detail:
              "Launch speed v₀ = 25 m/s, angle θ = 53°, gravity g = 10 m/s². We want the time to the peak.",
          },
          {
            label: "Step 2 — Find the vertical velocity component",
            detail:
              "Only the vertical motion matters for the peak. Use the sine for the vertical part.",
            formula: "v₀ᵧ = v₀·sinθ = 25·0.80 = 20 m/s",
          },
          {
            label: "Step 3 — Use vᵧ = 0 at the peak",
            detail:
              "Vertical velocity drops by g each second: vᵧ = v₀ᵧ − g·t. At the top vᵧ = 0, so solve for t.",
            formula: "0 = 20 − 10·t  →  t = 20 / 10 = 2 s",
          },
          {
            label: "Step 4 — Sanity check",
            detail:
              "2 seconds of rising is reasonable for a 20 m/s vertical launch, and the horizontal velocity (25·cos53° ≈ 15 m/s) is irrelevant here — that's the independence of the axes.",
          },
        ],
        takeaway:
          "Time to the peak is always t_peak = v₀ᵧ / g, where v₀ᵧ = v₀·sinθ. The horizontal motion never enters this calculation.",
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l6-faded",
      type: "numeric",
      prompt:
        "Your turn (same method). A stone is thrown with an initial **vertical** velocity of 15 m/s. Using g = 10 m/s², how long until it reaches its highest point?",
      interactionConfig: { unit: "s", tolerance: 0.1, placeholder: "t = ?" },
      correctAnswer: { value: 1.5 },
      feedback: {
        correct:
          "Correct — t_peak = v₀ᵧ / g = 15 / 10 = 1.5 s.",
        incorrect:
          "At the peak vᵧ = 0, so 0 = v₀ᵧ − g·t. Solve for t = v₀ᵧ / g.",
        hint: "t_peak = v₀ᵧ / g, with v₀ᵧ = 15 m/s and g = 10 m/s².",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "The vertical component is already given: v₀ᵧ = 15 m/s. At the peak vᵧ = 0, so use t = v₀ᵧ / g.",
        reveal:
          "0 = 15 − 10·t → t = 15 / 10 = 1.5 s.",
        reviewToStepId: "l6-worked",
      },
    },
    {
      id: "l6-range",
      type: "multipleChoice",
      prompt:
        "For maximum range on flat ground (no air resistance), the best launch angle is…",
      interactionConfig: {
        options: [
          { id: "fortyfive", label: "45°" },
          { id: "thirty", label: "30°" },
          { id: "ninety", label: "90° (straight up)" },
        ],
      },
      correctAnswer: { optionId: "fortyfive" },
      feedback: {
        correct: "Correct — 45° balances horizontal speed and time of flight.",
        incorrect:
          "Try it in the simulation: range peaks at 45° and is symmetric around it.",
        incorrectByOption: {
          thirty:
            "30° lands shorter than 45°. Range ∝ sin(2θ) is largest at 45°, where 2θ = 90°.",
          ninety:
            "Straight up gives maximum height but zero range — it lands back at the start. 45° best balances horizontal speed and time of flight.",
        },
        hint: "Range ∝ sin(2θ), which is largest when 2θ = 90°.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Range depends on sin(2θ). Which angle makes 2θ equal to 90°, where sine is largest?",
        reveal:
          "Range ∝ sin(2θ) is maximized when 2θ = 90°, i.e. θ = 45°.",
        reviewToStepId: "l6-vertical-concept",
      },
    },
    {
      id: "l6-independent",
      type: "numeric",
      prompt:
        "Independent challenge. A projectile is launched at 50 m/s at 37° above the horizontal on level ground. Using g = 10 m/s², what is the **total time of flight**? (sin37° ≈ 0.60)",
      interactionConfig: { unit: "s", tolerance: 0.1, placeholder: "t = ?" },
      correctAnswer: { value: 6 },
      feedback: {
        correct:
          "Correct — v₀ᵧ = 50·0.60 = 30 m/s, t_peak = 30/10 = 3 s, and flight is symmetric, so t_flight = 2·3 = 6 s.",
        incorrect:
          "Find v₀ᵧ = v₀·sinθ, then time to the peak v₀ᵧ/g, then double it for the full flight.",
        hint: "Total flight is twice the time to the peak: t_flight = 2·v₀ᵧ / g.",
      },
      mastery: {
        difficulty: "hard",
        scaffold:
          "First the vertical component: v₀ᵧ = 50·sin37° = 50·0.60 = 30 m/s. Then time to peak = v₀ᵧ/g. Don't forget the trip back down.",
        reveal:
          "v₀ᵧ = 50·0.60 = 30 m/s, t_peak = 30/10 = 3 s, and by symmetry the total time of flight is 2·3 = 6 s.",
        reviewToStepId: "l6-worked",
      },
    },
  ],
};
