import type { Lesson } from "../../types/content";

/**
 * Lesson 9 (course order 8) — Relative Motion and Reference Frames.
 *
 * Follows the Lesson 2 mastery-learning template:
 *   1. Retrieval opener (recall Lesson 5's Pythagorean recombination of
 *      perpendicular components).
 *   2. Bridge + learning intention.
 *   3. Deeper concept teaching (velocity is frame-dependent; velocities add as
 *      vectors, v_AC = v_AB + v_BC) + the 2D vector sim.
 *   4. Worked example -> faded -> independent, difficulty rising, with per-step
 *      `mastery` scaffolding. Classic boat-in-a-river / relative-velocity items.
 */
export const lesson9: Lesson = {
  id: "lesson-9-relative-motion",
  title: "Relative Motion and Reference Frames",
  subtitle: "Velocity is measured relative to a frame; velocities add as vectors.",
  order: 8,
  estimatedMinutes: 12,
  coreIdea:
    "Velocity is measured relative to a reference frame, and velocities combine by vector addition.",
  steps: [
    // ---- 1. Retrieval opener (recall Lesson 5 from memory) -----------------
    {
      id: "l9-retrieve",
      type: "multipleChoice",
      prompt:
        "Warm-up from memory — no notes. From Lesson 5: a velocity has a horizontal component vₓ and a perpendicular vertical component v_y. How do you combine them into a single speed?",
      interactionConfig: {
        options: [
          { id: "pyth", label: "speed = √(vₓ² + v_y²)" },
          { id: "sum", label: "speed = vₓ + v_y" },
          { id: "avg", label: "speed = (vₓ + v_y) / 2" },
        ],
      },
      correctAnswer: { optionId: "pyth" },
      feedback: {
        correct:
          "Exactly — perpendicular components recombine with the Pythagorean theorem. Today we use that same vector addition to combine velocities measured in different frames.",
        incorrect:
          "Recall Lesson 5: perpendicular components combine as √(vₓ² + v_y²), not by simple addition.",
        incorrectByOption: {
          sum:
            "Simple addition only works for components along the SAME line. Perpendicular components form a right triangle, so the speed is the hypotenuse √(vₓ² + v_y²).",
          avg:
            "Averaging the components isn't how vectors combine. Perpendicular components give a speed of √(vₓ² + v_y²) — the hypotenuse of the right triangle.",
        },
        hint: "Perpendicular components form a right triangle.",
      },
      mastery: { difficulty: "easy" },
    },

    // ---- 2. Bridge + learning intention ------------------------------------
    {
      id: "l9-bridge",
      type: "concept",
      prompt: "Whose velocity? Motion depends on the observer",
      interactionConfig: {
        body: [
          "Every velocity is measured relative to something — a reference frame. Walk up the aisle of a moving train: relative to the train you stroll at 1 m/s, but relative to the ground you're moving much faster. Neither number is 'wrong'; they're answers to different questions.",
          "The big idea today is that you switch between frames by adding velocities as vectors. Your velocity relative to the ground is your velocity relative to the train PLUS the train's velocity relative to the ground.",
          "By the end of this lesson you'll be able to: combine velocities from different frames as vectors, solve the classic boat-crossing-a-river problem, and say which quantities change when you switch frames and which stay the same.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 3. Deeper concept teaching ----------------------------------------
    {
      id: "l9-concept",
      type: "concept",
      prompt: "The relative-velocity addition rule",
      interactionConfig: {
        formula: "v_AC = v_AB + v_BC     (and v_BA = −v_AB)",
        body: [
          "Read the subscripts as 'A relative to C'. The rule chains them together: the velocity of A relative to C equals the velocity of A relative to B plus the velocity of B relative to C. The inner subscripts (B) cancel like links in a chain.",
          "Example — a swimmer in a river. The swimmer's velocity relative to the GROUND = their velocity relative to the WATER + the water's velocity relative to the ground (the current). If those two are perpendicular, you add them as a right triangle and recombine with √(  ).",
          "Reversing the order just flips the sign: v_BA = −v_AB. Your velocity relative to a friend is exactly the opposite of their velocity relative to you.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l9-sim",
      type: "sliderSimulation",
      prompt:
        "Each arrow here is built from an x-component and a y-component (read them below). That is exactly how a boat's velocity combines with a current: two component velocities adding into one resultant arrow.",
      interactionConfig: { scenario: "vectors2d" },
      correctAnswer: null,
      feedback: {
        correct:
          "A single velocity arrow is just its x and y parts combined — the same vector addition that turns 'boat relative to water' plus 'water relative to ground' into 'boat relative to ground'.",
        incorrect: "",
      },
    },
    {
      id: "l9-frame-concept",
      type: "concept",
      prompt: "What changes with the frame — and what doesn't",
      interactionConfig: {
        body: [
          "Switching to a frame moving at a constant velocity SHIFTS every velocity by that frame's velocity. So velocity is frame-dependent: the same car can read +30 m/s to a bystander and 0 m/s to a passenger riding alongside it.",
          "But acceleration is the SAME in every such (inertial) frame. Subtracting a constant frame velocity doesn't change how velocity is changing, so a is unchanged. This is why the physics of a collision looks the same whether you watch from the platform or from a smoothly moving train.",
          "For two objects, the relative velocity v_AB tells you how fast the gap between them changes — and it's the quantity that matters for catching up, closing in, or crossing a current.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },

    // ---- 4a. 1D relative velocity check (medium) ---------------------------
    {
      id: "l9-1d",
      type: "multipleChoice",
      prompt:
        "On a straight highway, car A moves at +30 m/s and car B moves at +20 m/s (same direction). What is the velocity of car A relative to car B?",
      interactionConfig: {
        options: [
          { id: "ten", label: "+10 m/s" },
          { id: "fifty", label: "+50 m/s" },
          { id: "zero", label: "0 m/s" },
        ],
      },
      correctAnswer: { optionId: "ten" },
      feedback: {
        correct:
          "Right — v_AB = v_A − v_B = 30 − 20 = +10 m/s. To B, car A creeps ahead at 10 m/s.",
        incorrect:
          "Relative velocity along a line is the difference: v_AB = v_A − v_B.",
        incorrectByOption: {
          fifty:
            "Adding gives the closing speed of cars moving TOWARD each other. Here they move the same way, so subtract: 30 − 20 = +10 m/s.",
          zero:
            "They'd have zero relative velocity only if their speeds matched. Here 30 − 20 = +10 m/s, so A slowly pulls ahead.",
        },
        hint: "Same direction → subtract the velocities.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Velocity of A relative to B is v_A − v_B. Both point the same way (+), so subtract: 30 − 20.",
        reveal: "v_AB = v_A − v_B = 30 − 20 = +10 m/s.",
        reviewToStepId: "l9-frame-concept",
      },
    },

    // ---- 4b. Worked example -> faded -> independent (river crossing) -------
    {
      id: "l9-worked",
      type: "workedExample",
      prompt: "Worked example: a boat crossing a river",
      interactionConfig: {
        problem:
          "A boat points straight across a river, moving at 3 m/s relative to the water. The current flows downstream at 4 m/s. What is the boat's speed relative to the ground?",
        solution: [
          {
            label: "Step 1 — Identify the two velocities",
            detail:
              "Boat relative to water = 3 m/s straight across. Water relative to ground (the current) = 4 m/s downstream. These two directions are perpendicular.",
          },
          {
            label: "Step 2 — Add them as vectors",
            detail:
              "Boat relative to ground = boat relative to water + water relative to ground. Since the parts are perpendicular, they form a right triangle.",
            formula: "v = √(3² + 4²)",
          },
          {
            label: "Step 3 — Recombine with the Pythagorean theorem",
            detail: "Square each, add, then take the square root.",
            formula: "v = √(9 + 16) = √25 = 5 m/s",
          },
          {
            label: "Step 4 — Sanity check",
            detail:
              "The ground speed (5 m/s) is larger than either piece but less than their sum (7 m/s) — exactly how a hypotenuse behaves.",
          },
        ],
        takeaway:
          "Boat relative to ground = boat relative to water + current. When the across and downstream parts are perpendicular, combine them with √(across² + current²).",
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l9-faded",
      type: "numeric",
      prompt:
        "Your turn (same method). A boat heads straight across a river at 6 m/s relative to the water while the current carries it downstream at 8 m/s. What is its speed relative to the ground?",
      interactionConfig: { unit: "m/s", tolerance: 0.1, placeholder: "speed = ?" },
      correctAnswer: { value: 10 },
      feedback: {
        correct:
          "Correct — the across and downstream velocities are perpendicular, so v = √(6² + 8²) = √100 = 10 m/s.",
        incorrect:
          "Don't add 6 + 8. The two velocities are perpendicular, so combine them with √(6² + 8²).",
        hint: "speed = √(6² + 8²).",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "The across (6) and downstream (8) velocities form a right angle. Square each (36 and 64), add, then take the square root.",
        reveal: "v = √(6² + 8²) = √(36 + 64) = √100 = 10 m/s.",
        reviewToStepId: "l9-worked",
      },
    },
    {
      id: "l9-crossing",
      type: "numeric",
      prompt:
        "The same boat (6 m/s straight across the 60 m wide river, current 8 m/s downstream): how long does it take to reach the far bank?",
      interactionConfig: { unit: "s", tolerance: 0.1, placeholder: "t = ?" },
      correctAnswer: { value: 10 },
      feedback: {
        correct:
          "Correct — only the across velocity carries the boat over: t = width / vₐcross = 60 / 6 = 10 s. The current doesn't change the crossing time.",
        incorrect:
          "The axes are independent: only the across-the-river velocity (6 m/s) covers the 60 m width. The current is along the bank.",
        hint: "Use only the velocity directed ACROSS the river: t = 60 / 6.",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Crossing is purely the across-direction motion (independence of axes). The downstream current doesn't shorten the trip across. Use t = width / (across velocity) = 60 / 6.",
        reveal:
          "Only the 6 m/s across-component crosses the 60 m: t = 60 / 6 = 10 s. The 8 m/s current only carries the boat along the bank.",
        reviewToStepId: "l9-concept",
      },
    },
    {
      id: "l9-sort",
      type: "sort",
      prompt:
        "Sort each quantity by whether it changes when you switch to a different inertial (constant-velocity) reference frame.",
      interactionConfig: {
        buckets: [
          { id: "depends", label: "Depends on the frame" },
          { id: "same", label: "Same in every inertial frame" },
        ],
        items: [
          { id: "velocity", label: "An object's velocity" },
          { id: "position", label: "An object's position" },
          { id: "accel", label: "An object's acceleration" },
        ],
      },
      correctAnswer: {
        velocity: "depends",
        position: "depends",
        accel: "same",
      },
      feedback: {
        correct:
          "Switching frames shifts every velocity (and position) by the frame's motion, but leaves the acceleration unchanged.",
        incorrect:
          "A constant frame velocity shifts velocities and positions, but the rate of change of velocity (acceleration) is unaffected.",
        hint: "Adding a CONSTANT velocity changes v and x, but does it change how v is changing?",
      },
      mastery: {
        difficulty: "medium",
        scaffold:
          "Subtracting a constant frame velocity changes velocity and position readings. But a constant doesn't change a RATE of change — so what happens to acceleration?",
        reveal:
          "Velocity → depends and position → depends (both shift with the frame). Acceleration → same, because subtracting a constant velocity doesn't change how velocity is changing.",
        reviewToStepId: "l9-frame-concept",
      },
    },
    {
      id: "l9-reverse",
      type: "multipleChoice",
      prompt:
        "If your velocity relative to a friend is +4 m/s, what is your friend's velocity relative to you?",
      interactionConfig: {
        options: [
          { id: "neg", label: "−4 m/s" },
          { id: "pos", label: "+4 m/s" },
          { id: "zero", label: "0 m/s" },
        ],
      },
      correctAnswer: { optionId: "neg" },
      feedback: {
        correct:
          "Right — relative velocity just flips sign when you swap the two objects: v_BA = −v_AB.",
        incorrect:
          "Swapping the two objects reverses the relative velocity: v_BA = −v_AB.",
        incorrectByOption: {
          pos:
            "Same sign would mean you both see the other moving the same way, which is impossible. Swapping objects flips the sign: −4 m/s.",
          zero:
            "Zero would mean no relative motion at all, but there clearly is (4 m/s). Reversing who-relative-to-whom flips the sign to −4 m/s.",
        },
        hint: "v_BA = −v_AB.",
      },
      mastery: { difficulty: "medium" },
    },
    {
      id: "l9-independent",
      type: "numeric",
      prompt:
        "Independent challenge. A swimmer heads straight across a 30 m wide river at 1.5 m/s relative to the water, while the current flows downstream at 2 m/s. How far downstream does the swimmer land?",
      interactionConfig: { unit: "m", tolerance: 0.5, placeholder: "drift = ?" },
      correctAnswer: { value: 40 },
      feedback: {
        correct:
          "Correct — crossing time = 30 / 1.5 = 20 s (across motion only), then the current carries them 2 × 20 = 40 m downstream.",
        incorrect:
          "Solve each axis on its own: first the crossing time from the across velocity, then the downstream drift = current × that time.",
        hint: "First t = 30 / 1.5, then downstream distance = 2 × t.",
      },
      mastery: {
        difficulty: "hard",
        scaffold:
          "The two motions are independent. Across: t = width / (across speed) = 30 / 1.5 = 20 s. Downstream: distance = current × t = 2 × 20.",
        reveal:
          "Crossing time t = 30 / 1.5 = 20 s. In that time the 2 m/s current carries the swimmer 2 × 20 = 40 m downstream.",
        reviewToStepId: "l9-crossing",
      },
    },
  ],
};
