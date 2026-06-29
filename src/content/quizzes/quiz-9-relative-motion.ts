import type { Quiz } from "../../types/content";

// Original questions answerable from the Lesson 9 "Learn" sequence: velocity is
// frame-dependent, velocities add as vectors (v_AC = v_AB + v_BC, v_BA = −v_AB),
// the boat-in-a-river problem (perpendicular components recombine via √, and the
// crossing time depends only on the across velocity), and what changes between
// inertial frames (velocity, position) versus what doesn't (acceleration).
export const quiz9: Quiz = {
  lessonId: "lesson-9-relative-motion",
  questions: [
    {
      id: "q1",
      type: "multipleChoice",
      category: "conceptual",
      prompt: "An object's velocity is always measured relative to:",
      options: [
        { id: "a", label: "A chosen reference frame" },
        { id: "b", label: "The center of the Earth only" },
        { id: "c", label: "Its own starting point only" },
        { id: "d", label: "Nothing — velocity is absolute" },
      ],
      correctOptionId: "a",
      explanation:
        "Velocity has meaning only relative to a reference frame; the same motion gives different velocities to different observers.",
    },
    {
      id: "q2",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "Which quantity is the SAME for all observers in inertial (constant-velocity) reference frames?",
      options: [
        { id: "a", label: "Acceleration" },
        { id: "b", label: "Velocity" },
        { id: "c", label: "Position" },
        { id: "d", label: "Kinetic energy" },
      ],
      correctOptionId: "a",
      explanation:
        "Switching frames shifts velocities and positions by the frame's constant velocity, but the acceleration (the rate of change of velocity) is unchanged.",
    },
    {
      id: "q3",
      type: "numeric",
      category: "calculation",
      prompt:
        "A boat points straight across a river at 3 m/s relative to the water; the current flows downstream at 4 m/s. What is the boat's speed relative to the ground? (m/s)",
      value: 5,
      tolerance: 0.1,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "The across and downstream velocities are perpendicular, so v = √(3² + 4²) = √25 = 5 m/s.",
    },
    {
      id: "q4",
      type: "numeric",
      category: "calculation",
      prompt:
        "On a straight road, car A moves at +30 m/s and car B at +20 m/s (same direction). What is the velocity of A relative to B? (m/s)",
      value: 10,
      tolerance: 0.1,
      unit: "m/s",
      placeholder: "m/s",
      explanation: "v_AB = v_A − v_B = 30 − 20 = +10 m/s.",
    },
    {
      id: "q5",
      type: "numeric",
      category: "calculation",
      prompt:
        "A boat heads straight across a 60 m wide river at 6 m/s relative to the water, with a 8 m/s downstream current. How long does it take to cross? (s)",
      value: 10,
      tolerance: 0.1,
      unit: "s",
      placeholder: "s",
      explanation:
        "Only the across velocity covers the width: t = 60 / 6 = 10 s. The current acts along the bank and doesn't change the crossing time.",
    },
    {
      id: "q6",
      type: "numeric",
      category: "calculation",
      prompt:
        "A swimmer heads straight across a 30 m wide river at 1.5 m/s relative to the water; the current is 2 m/s downstream. How far downstream do they land? (m)",
      value: 40,
      tolerance: 0.5,
      unit: "m",
      placeholder: "m",
      explanation:
        "Crossing time t = 30 / 1.5 = 20 s; downstream drift = current × t = 2 × 20 = 40 m.",
    },
    {
      id: "q7",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "Your velocity relative to a friend is +6 m/s. Your friend's velocity relative to you is:",
      options: [
        { id: "a", label: "−6 m/s" },
        { id: "b", label: "+6 m/s" },
        { id: "c", label: "0 m/s" },
        { id: "d", label: "+12 m/s" },
      ],
      correctOptionId: "a",
      explanation:
        "Relative velocity flips sign when the objects are swapped: v_BA = −v_AB = −6 m/s.",
    },
    {
      id: "q8",
      type: "numeric",
      category: "calculation",
      prompt:
        "A plane flies due north with an airspeed of 200 m/s while a wind blows due east at 30 m/s. What is the plane's speed relative to the ground? (m/s)",
      value: 202.2,
      tolerance: 0.5,
      unit: "m/s",
      placeholder: "m/s",
      explanation:
        "The two velocities are perpendicular: |v| = √(200² + 30²) = √40900 ≈ 202.2 m/s.",
    },
    {
      id: "q9",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "A boat always points straight across a river. If the current speed increases (boat speed relative to water unchanged), the time to cross:",
      options: [
        { id: "a", label: "Stays the same" },
        { id: "b", label: "Increases" },
        { id: "c", label: "Decreases" },
        { id: "d", label: "Drops to zero" },
      ],
      correctOptionId: "a",
      explanation:
        "Crossing time depends only on the across-the-river velocity (independence of axes). A faster current carries the boat farther downstream but does not change the crossing time.",
    },
  ],
};
