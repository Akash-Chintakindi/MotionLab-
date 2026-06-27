import type { Lesson } from "../../types/content";

/**
 * Lesson 1 — Position, Velocity, and Slope.
 *
 * Follows the mastery-learning template (mirrored from Lesson 2):
 *   1. Retrieval opener — Lesson 1 has no prior lesson, so this primes everyday
 *      intuition about reading a position–time graph (no equations needed).
 *   2. Bridge + learning intention (one compact concept step).
 *   3. Deeper concept teaching (richer `concept` bodies + the interactive
 *      explore/predict/secant graphDrag steps that build slope → tangent).
 *   4. Worked example -> faded practice -> independent practice, with the
 *      difficulty rising through the lesson and per-step `mastery` scaffolding
 *      (first miss = scaffold hint, second miss = full reveal + jump-back).
 */
export const lesson1: Lesson = {
  id: "lesson-1-position-velocity",
  title: "Position, Velocity, and Slope",
  subtitle: "Velocity is the derivative of position.",
  order: 1,
  estimatedMinutes: 12,
  coreIdea: "Velocity is the derivative of position with respect to time.",
  steps: [
    // ---- 1. Retrieval opener (prime everyday intuition, no equations) -------
    {
      id: "l1-hook",
      type: "multipleChoice",
      prompt:
        "Warm-up — trust your eyes, no equations. A cart moves along a track and this is its **position over time**. Where is the cart moving *fastest*?",
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
          "Right. The cart covers the most distance per second where the graph is **steepest** — the middle. That steepness is the idea this whole lesson is built on.",
        incorrect:
          "Look for where the graph is steepest, not where the position is highest.",
        incorrectByOption: {
          early:
            "Near the start the curve is still shallow, so the cart is barely moving. Fastest means steepest slope — that's the middle.",
          late:
            "Late is where the cart is highest, but the curve has flattened out there. Height isn't speed; the steepest climb is in the middle.",
        },
        hint: "Fastest means the biggest change in position each second. Which part of the curve climbs most steeply?",
      },
      mastery: { difficulty: "easy" },
    },

    // ---- 2. Bridge + learning intention -------------------------------------
    {
      id: "l1-bridge",
      type: "concept",
      prompt: "From 'steepest' to a precise idea: slope is velocity",
      interactionConfig: {
        body: [
          "You just judged speed from how **steep** a position–time graph looks. That instinct is exactly right — and today we make it precise. The steepness of a position–time graph *is* the velocity.",
          "By the end of this lesson you'll be able to: read velocity off a position–time graph by eye, compute an **average velocity** as Δx/Δt (the slope of a secant line), and explain how that average becomes the **instantaneous velocity** v(t) = dx/dt as the time interval shrinks to zero.",
          "You'll know you've got it when you can compute an average velocity from a position formula — including a negative one — without help.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 3. Deeper concept teaching (interactive explore/predict/secant) ----
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
      prompt: "Tap the region of the graph where the velocity is greatest.",
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
        formula: "v(t) = dx/dt = limₜ→₀ Δx/Δt",
        body: [
          "Instantaneous velocity is the slope of the position–time graph at a single instant — the slope of the **tangent** line at that point.",
          "You reached it by hand a moment ago: pick a time t, take a nearby time t + Δt, and form the average velocity Δx/Δt (the secant slope). As Δt shrinks toward zero, that secant rotates into the tangent and the average velocity converges to one number. That limit is the derivative of position with respect to time, written v(t) = dx/dt.",
          "Reading the graph by sign: an **upward** slope means positive velocity (moving forward), a **downward** slope means negative velocity (moving backward), and a momentarily **flat** slope means v = 0. A steeper curve — in either direction — means a larger speed |v|.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l1-calc-concept",
      type: "concept",
      prompt: "Computing velocity from a position formula",
      interactionConfig: {
        formula: "average v = Δx / Δt     and     v(t) = dx/dt",
        body: [
          "When motion is given as a formula x(t) instead of a drawn curve, the same two tools apply. The **average velocity** over an interval is the change in position divided by the change in time: Δx/Δt = [x(t₂) − x(t₁)] / (t₂ − t₁). Graphically that is still the slope of the secant between the two times.",
          "The **instantaneous velocity** is the derivative dx/dt. For a polynomial you can take it term by term with the power rule: a term tⁿ becomes n·tⁿ⁻¹, and a constant becomes 0.",
          "Example: if x(t) = t², then v(t) = 2t. If x(t) = 6t − t², then v(t) = 6 − 2t — so velocity is positive early, zero at t = 3 s, and negative after that. Notice the average velocity over an interval generally differs from the instantaneous velocity at either endpoint; they agree only in the limit Δt → 0.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 4. Mastery core: worked -> faded -> independent (Δx/Δt) -----------
    {
      id: "l1-worked",
      type: "workedExample",
      prompt: "Worked example: average velocity from a position formula",
      interactionConfig: {
        problem:
          "A drone moves along a straight line with position x(t) = 2t² (meters, t in seconds). What is its average velocity between t = 1 s and t = 3 s?",
        solution: [
          {
            label: "Step 1 — List what's known",
            detail:
              "Position formula x(t) = 2t². Interval endpoints t₁ = 1 s and t₂ = 3 s. We want the average velocity, which is the slope of the secant over this interval.",
          },
          {
            label: "Step 2 — Evaluate the position at each end",
            detail: "Plug each time into x(t) = 2t².",
            formula: "x(1) = 2(1)² = 2 m,   x(3) = 2(3)² = 18 m",
          },
          {
            label: "Step 3 — Find the change in position and time",
            detail: "Δx is final minus initial position; Δt is the elapsed time.",
            formula: "Δx = 18 − 2 = 16 m,   Δt = 3 − 1 = 2 s",
          },
          {
            label: "Step 4 — Divide to get the average velocity",
            detail:
              "Average velocity is Δx per second — the slope of the secant line.",
            formula: "average v = Δx / Δt = 16 / 2 = 8 m/s",
          },
          {
            label: "Step 5 — Sanity check",
            detail:
              "x(t) = 2t² is increasing on this interval, so the secant rises and the average velocity is positive. ✓",
          },
        ],
        takeaway:
          "Average velocity from a formula is always Δx/Δt: evaluate x at both times, subtract to get Δx, then divide by Δt. Keep the sign of Δx.",
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l1-calc-practice",
      type: "numeric",
      prompt:
        "Your turn (same method). For x(t) = 6t − t² (meters), what is the AVERAGE velocity between t = 0 s and t = 2 s?",
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
      mastery: {
        difficulty: "medium",
        scaffold:
          "Evaluate the formula at both times first: x(0) = 0, and x(2) = 6(2) − 2² = 12 − 4 = 8 m. Now you have Δx and Δt = 2 s.",
        reveal:
          "x(0) = 0 m, x(2) = 6(2) − 2² = 8 m, so Δx = 8 − 0 = 8 m over Δt = 2 s. Average v = 8 / 2 = 4 m/s.",
        reviewToStepId: "l1-worked",
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
      mastery: {
        difficulty: "medium",
        scaffold:
          "Use v(t) = 6 − 2t, or just read the slope. At t = 1 the curve climbs, at t = 3 it's at the peak, at t = 5 it falls. What sign is each slope?",
        reveal:
          "v(t) = 6 − 2t gives v(1) = +4 (positive), v(3) = 0 (zero, the peak), v(5) = −4 (negative). So A → positive, B → zero, C → negative.",
        reviewToStepId: "l1-derivative",
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
        incorrectByOption: {
          forward:
            "Forward needs a rising curve, but after the peak at t = 3 s the curve falls — a downward slope is negative velocity, so it's moving backward.",
          rest:
            "Staying at rest needs a flat curve (zero slope). Here the curve is clearly falling after t = 3 s, so velocity is negative, not zero.",
        },
        hint: "Is the position increasing or decreasing between t = 4 s and t = 6 s?",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Check the velocity formula v(t) = 6 − 2t on this interval. Is 6 − 2t positive or negative for t between 4 and 6 s?",
        reveal:
          "For t = 4 to 6 s, v(t) = 6 − 2t is negative (e.g. v(4) = −2, v(6) = −6). Negative velocity means the cart moves backward.",
        reviewToStepId: "l1-derivative",
      },
    },
    {
      id: "l1-independent",
      type: "numeric",
      prompt:
        "Independent challenge — mind the sign. For x(t) = 6t − t² (meters), what is the AVERAGE velocity between t = 4 s and t = 6 s? (Include the sign.)",
      interactionConfig: {
        tolerance: 0.1,
        unit: "m/s",
        placeholder: "m/s",
      },
      correctAnswer: { value: -4 },
      feedback: {
        correct:
          "Correct — x(4) = 8 m and x(6) = 0 m, so Δx = 0 − 8 = −8 m over Δt = 2 s, giving average v = −4 m/s (negative: the cart moves backward).",
        incorrect:
          "Average velocity is Δx/Δt with Δx = x(6) − x(4). On the falling part of the curve Δx is negative, so the answer is negative.",
        hint: "x(4) = 6(4) − 4² = 8 m and x(6) = 6(6) − 6² = 0 m. Then average v = (0 − 8)/(6 − 4).",
      },
      mastery: {
        difficulty: "hard",
        scaffold:
          "Evaluate both ends: x(4) = 6(4) − 4² = 8 m, x(6) = 6(6) − 6² = 0 m. The position decreased, so Δx will be negative — keep that minus sign.",
        reveal:
          "x(4) = 8 m, x(6) = 0 m, so Δx = 0 − 8 = −8 m over Δt = 6 − 4 = 2 s. Average v = −8 / 2 = −4 m/s. It's negative because the cart is past the peak and moving backward.",
        reviewToStepId: "l1-worked",
      },
    },
  ],
};
