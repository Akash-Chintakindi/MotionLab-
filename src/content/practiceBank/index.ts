import type { BankDifficulty, BankQuestion } from "./types";

// A large, self-contained practice bank covering all 7 kinematics topics across
// three difficulties. Every item is answerable purely from its text (no external
// figure/graph required) so it can power the basketball game's timed questions
// and a future AI-practice fallback. g = 9.8 m/s² throughout.
//
// id scheme: bank-<topicNumber>-<difficulty>-<n>
const BANK: BankQuestion[] = [
  // ---------------------------------------------------------------------------
  // Lesson 1 — position & velocity
  // ---------------------------------------------------------------------------
  {
    id: "bank-1-easy-1",
    topicId: "lesson-1-position-velocity",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "An object moves from x = 5 m to x = 25 m in 5 s at constant velocity. What is its average velocity?",
    value: 4,
    tolerance: 0.1,
    unit: "m/s",
    explanation: "v_avg = Δx/Δt = (25 − 5) / 5 = 20 / 5 = 4 m/s.",
  },
  {
    id: "bank-1-easy-2",
    topicId: "lesson-1-position-velocity",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "On a position–time (x–t) graph, the instantaneous velocity at a point is represented by:",
    options: [
      { id: "a", label: "The slope of the tangent line at that point" },
      { id: "b", label: "The area under the curve up to that point" },
      { id: "c", label: "The height (x-value) of the curve at that point" },
      { id: "d", label: "The y-intercept of the curve" },
    ],
    correctOptionId: "a",
    explanation:
      "Velocity is the derivative dx/dt, which is the slope of the x–t curve. The instantaneous value is the slope of the tangent at that instant.",
  },
  {
    id: "bank-1-easy-3",
    topicId: "lesson-1-position-velocity",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt: "An object's position decreases steadily over time. What is the sign of its velocity?",
    options: [
      { id: "a", label: "Positive" },
      { id: "b", label: "Negative" },
      { id: "c", label: "Zero" },
      { id: "d", label: "Cannot be determined" },
    ],
    correctOptionId: "b",
    explanation:
      "Velocity is dx/dt. If x is decreasing, Δx is negative, so the velocity is negative.",
  },
  {
    id: "bank-1-easy-4",
    topicId: "lesson-1-position-velocity",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "A runner moves from x = 12 m to x = 4 m in 2 s. What is the average velocity (include the sign)?",
    value: -4,
    tolerance: 0.1,
    unit: "m/s",
    explanation: "v_avg = Δx/Δt = (4 − 12) / 2 = −8 / 2 = −4 m/s (negative direction).",
  },
  {
    id: "bank-1-medium-1",
    topicId: "lesson-1-position-velocity",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle's position is x(t) = 3t² (meters, t in seconds). What is its instantaneous velocity at t = 2 s?",
    value: 12,
    tolerance: 0.1,
    unit: "m/s",
    explanation: "v = dx/dt = 6t. At t = 2 s, v = 6 × 2 = 12 m/s.",
  },
  {
    id: "bank-1-medium-2",
    topicId: "lesson-1-position-velocity",
    difficulty: "medium",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "A particle has position x(t) = 5 + 2t − t² (meters). At what time is its velocity zero?",
    options: [
      { id: "a", label: "0.5 s" },
      { id: "b", label: "1 s" },
      { id: "c", label: "2 s" },
      { id: "d", label: "5 s" },
    ],
    correctOptionId: "b",
    explanation: "v = dx/dt = 2 − 2t. Setting 2 − 2t = 0 gives t = 1 s.",
  },
  {
    id: "bank-1-medium-3",
    topicId: "lesson-1-position-velocity",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A car travels 100 m in 4 s, then 60 m in 6 s, all in the +x direction. What is its average velocity for the whole trip?",
    value: 16,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "Average velocity = total displacement / total time = (100 + 60) / (4 + 6) = 160 / 10 = 16 m/s.",
  },
  {
    id: "bank-1-hard-1",
    topicId: "lesson-1-position-velocity",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle moves with x(t) = t³ − 6t² + 9t (meters). What is its instantaneous velocity at t = 4 s?",
    value: 9,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "v = dx/dt = 3t² − 12t + 9. At t = 4: v = 3(16) − 12(4) + 9 = 48 − 48 + 9 = 9 m/s.",
  },
  {
    id: "bank-1-hard-2",
    topicId: "lesson-1-position-velocity",
    difficulty: "hard",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "For x(t) = t³ − 6t² + 9t, during which time interval is the particle moving in the −x direction?",
    options: [
      { id: "a", label: "0 < t < 1 s" },
      { id: "b", label: "1 s < t < 3 s" },
      { id: "c", label: "t > 3 s" },
      { id: "d", label: "It never moves in the −x direction" },
    ],
    correctOptionId: "b",
    explanation:
      "v = 3t² − 12t + 9 = 3(t − 1)(t − 3). This is negative between its roots, so v < 0 for 1 s < t < 3 s.",
  },

  // ---------------------------------------------------------------------------
  // Lesson 2 — velocity & acceleration
  // ---------------------------------------------------------------------------
  {
    id: "bank-2-easy-1",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "A car's velocity increases from 10 m/s to 22 m/s in 4 s. What is its acceleration?",
    value: 3,
    tolerance: 0.1,
    unit: "m/s²",
    explanation: "a = Δv/Δt = (22 − 10) / 4 = 12 / 4 = 3 m/s².",
  },
  {
    id: "bank-2-easy-2",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt: "On a velocity–time (v–t) graph, the acceleration is given by:",
    options: [
      { id: "a", label: "The slope of the curve" },
      { id: "b", label: "The area under the curve" },
      { id: "c", label: "The y-intercept" },
      { id: "d", label: "The maximum velocity value" },
    ],
    correctOptionId: "a",
    explanation: "Acceleration is a = dv/dt, which is the slope of the v–t graph.",
  },
  {
    id: "bank-2-easy-3",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "An object is moving in the +x direction but has a negative acceleration. The object is:",
    options: [
      { id: "a", label: "Speeding up" },
      { id: "b", label: "Slowing down" },
      { id: "c", label: "At rest" },
      { id: "d", label: "Moving in the −x direction" },
    ],
    correctOptionId: "b",
    explanation:
      "When velocity and acceleration have opposite signs, the object slows down. Here v > 0 and a < 0, so it is slowing down.",
  },
  {
    id: "bank-2-medium-1",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has velocity v(t) = 2t² (m/s). What is its acceleration at t = 4 s?",
    value: 16,
    tolerance: 0.1,
    unit: "m/s²",
    explanation: "a = dv/dt = 4t. At t = 4 s, a = 4 × 4 = 16 m/s².",
  },
  {
    id: "bank-2-medium-2",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "medium",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "An object has velocity −8 m/s and acceleration −3 m/s². The object is:",
    options: [
      { id: "a", label: "Speeding up" },
      { id: "b", label: "Slowing down" },
      { id: "c", label: "At rest" },
      { id: "d", label: "About to reverse direction" },
    ],
    correctOptionId: "a",
    explanation:
      "Velocity and acceleration have the same sign (both negative), so the speed is increasing — the object is speeding up in the −x direction.",
  },
  {
    id: "bank-2-medium-3",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle's velocity changes from +5 m/s to −7 m/s in 4 s. What is its average acceleration?",
    value: -3,
    tolerance: 0.1,
    unit: "m/s²",
    explanation: "a = Δv/Δt = (−7 − 5) / 4 = −12 / 4 = −3 m/s².",
  },
  {
    id: "bank-2-hard-1",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "hard",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "A particle moves so that for 0 < t < 2 s it has v > 0 and a < 0, and for t > 2 s it has v > 0 and a > 0. Which statement best describes the motion?",
    options: [
      { id: "a", label: "It speeds up, then slows down" },
      { id: "b", label: "It slows down, then speeds up" },
      { id: "c", label: "It speeds up the whole time" },
      { id: "d", label: "It slows down the whole time" },
    ],
    correctOptionId: "b",
    explanation:
      "While v > 0 and a < 0 the speed decreases (slowing). Once a > 0 with v > 0 the speed increases (speeding up). So it slows down then speeds up.",
  },
  {
    id: "bank-2-hard-2",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has velocity v(t) = t² − 4t (m/s). For t > 0 it is momentarily at rest at t = 4 s. What is its acceleration at that instant?",
    value: 4,
    tolerance: 0.1,
    unit: "m/s²",
    explanation:
      "v = 0 gives t(t − 4) = 0, so t = 4 s for t > 0. Acceleration a = dv/dt = 2t − 4 = 2(4) − 4 = 4 m/s².",
  },

  // ---------------------------------------------------------------------------
  // Lesson 3 — displacement as area under v–t
  // ---------------------------------------------------------------------------
  {
    id: "bank-3-easy-1",
    topicId: "lesson-3-displacement-area",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "On a velocity–time (v–t) graph, the displacement over a time interval is represented by:",
    options: [
      { id: "a", label: "The slope of the curve" },
      { id: "b", label: "The area between the curve and the time axis" },
      { id: "c", label: "The peak velocity reached" },
      { id: "d", label: "The y-intercept" },
    ],
    correctOptionId: "b",
    explanation:
      "Displacement = ∫v dt, which equals the (signed) area between the v–t curve and the time axis.",
  },
  {
    id: "bank-3-easy-2",
    topicId: "lesson-3-displacement-area",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "An object moves at a constant 6 m/s for 8 s. What is its displacement?",
    value: 48,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "For constant velocity, displacement = v·t = 6 × 8 = 48 m (a rectangle of area 48 under the v–t graph).",
  },
  {
    id: "bank-3-easy-3",
    topicId: "lesson-3-displacement-area",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt: "Net displacement differs from total distance traveled when:",
    options: [
      { id: "a", label: "The velocity is constant" },
      { id: "b", label: "The object changes direction during the motion" },
      { id: "c", label: "The acceleration is zero" },
      { id: "d", label: "The object only speeds up" },
    ],
    correctOptionId: "b",
    explanation:
      "Net displacement uses signed area (direction matters); total distance sums the magnitudes. They differ only when the object reverses direction.",
  },
  {
    id: "bank-3-medium-1",
    topicId: "lesson-3-displacement-area",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "An object moves at +5 m/s for 4 s, then at +3 m/s for 6 s. What is its total displacement?",
    value: 38,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "Add the two rectangular areas: (5 × 4) + (3 × 6) = 20 + 18 = 38 m.",
  },
  {
    id: "bank-3-medium-2",
    topicId: "lesson-3-displacement-area",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle moves at +4 m/s for 3 s, then at −2 m/s for 5 s. What is its net displacement?",
    value: 2,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "Net displacement uses signed area: (4 × 3) + (−2 × 5) = 12 − 10 = 2 m.",
  },
  {
    id: "bank-3-medium-3",
    topicId: "lesson-3-displacement-area",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle moves at +4 m/s for 3 s, then at −2 m/s for 5 s. What is the total distance traveled?",
    value: 22,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "Total distance sums magnitudes of each leg: |4 × 3| + |−2 × 5| = 12 + 10 = 22 m.",
  },
  {
    id: "bank-3-hard-1",
    topicId: "lesson-3-displacement-area",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has velocity v(t) = 6t (m/s). Using displacement = ∫v dt, how far does it travel from t = 0 to t = 4 s?",
    value: 48,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "∫₀⁴ 6t dt = 3t² evaluated from 0 to 4 = 3(16) − 0 = 48 m. (Equivalently, the triangular area ½ × 4 × 24 = 48 m.)",
  },
  {
    id: "bank-3-hard-2",
    topicId: "lesson-3-displacement-area",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "An object accelerates uniformly from rest, reaching 12 m/s after 6 s. Using the area under the v–t graph, what is its displacement?",
    value: 36,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "The v–t graph is a triangle with base 6 s and height 12 m/s. Area = ½ × 6 × 12 = 36 m.",
  },
  {
    id: "bank-3-hard-3",
    topicId: "lesson-3-displacement-area",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has velocity v(t) = 10 − 2t (m/s) for 0 ≤ t ≤ 8 s. What is its net displacement over this interval?",
    value: 16,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "Net displacement = ∫₀⁸ (10 − 2t) dt = [10t − t²]₀⁸ = (80 − 64) − 0 = 16 m.",
  },
  {
    id: "bank-3-hard-4",
    topicId: "lesson-3-displacement-area",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "For v(t) = 10 − 2t (m/s) over 0 ≤ t ≤ 8 s, what is the total distance traveled? (Note: v = 0 at t = 5 s.)",
    value: 34,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "From 0–5 s (v > 0): ∫₀⁵(10 − 2t)dt = 50 − 25 = 25 m. From 5–8 s (v < 0): ∫₅⁸(10 − 2t)dt = (80 − 64) − (50 − 25) = 16 − 25 = −9 m, i.e. 9 m of distance. Total = 25 + 9 = 34 m.",
  },

  // ---------------------------------------------------------------------------
  // Lesson 4 — acceleration → velocity → position (constant-accel kinematics)
  // ---------------------------------------------------------------------------
  {
    id: "bank-4-easy-1",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "A car starts at 4 m/s and accelerates at 2 m/s² for 5 s. What is its final velocity? (v = v₀ + at)",
    value: 14,
    tolerance: 0.1,
    unit: "m/s",
    explanation: "v = v₀ + at = 4 + (2)(5) = 4 + 10 = 14 m/s.",
  },
  {
    id: "bank-4-easy-2",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "Starting from rest, an object accelerates at 3 m/s² for 4 s. How far does it travel? (x = ½at²)",
    value: 24,
    tolerance: 0.1,
    unit: "m",
    explanation: "x = ½at² = ½ × 3 × 4² = ½ × 3 × 16 = 24 m.",
  },
  {
    id: "bank-4-easy-3",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "Which constant-acceleration equation gives final velocity directly from displacement, without needing the time?",
    options: [
      { id: "a", label: "v = v₀ + at" },
      { id: "b", label: "x = x₀ + v₀t + ½at²" },
      { id: "c", label: "v² = v₀² + 2aΔx" },
      { id: "d", label: "v = Δx/Δt" },
    ],
    correctOptionId: "c",
    explanation:
      "v² = v₀² + 2aΔx relates velocity to displacement and acceleration with no time variable.",
  },
  {
    id: "bank-4-medium-1",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A car traveling at 30 m/s decelerates at −5 m/s². How far does it travel before stopping? (v² = v₀² + 2aΔx)",
    value: 90,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "0 = 30² + 2(−5)Δx → 0 = 900 − 10Δx → Δx = 900 / 10 = 90 m.",
  },
  {
    id: "bank-4-medium-2",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "An object starts at x₀ = 2 m with v₀ = 3 m/s and a = 4 m/s². Where is it at t = 2 s? (x = x₀ + v₀t + ½at²)",
    value: 16,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "x = 2 + (3)(2) + ½(4)(2²) = 2 + 6 + 8 = 16 m.",
  },
  {
    id: "bank-4-medium-3",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "medium",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "A ball is thrown straight up. At the highest point of its flight, its velocity and acceleration are:",
    options: [
      { id: "a", label: "Both zero" },
      { id: "b", label: "Velocity zero; acceleration 9.8 m/s² downward" },
      { id: "c", label: "Both 9.8 m/s² downward" },
      { id: "d", label: "Velocity maximum; acceleration zero" },
    ],
    correctOptionId: "b",
    explanation:
      "At the peak the velocity is instantaneously zero, but gravity still acts, so the acceleration is 9.8 m/s² downward throughout the flight.",
  },
  {
    id: "bank-4-hard-1",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball is thrown straight up at 24.5 m/s (g = 9.8 m/s²). What maximum height does it reach?",
    value: 30.6,
    tolerance: 0.3,
    unit: "m",
    explanation:
      "At peak v = 0: 0 = v₀² − 2gh → h = v₀²/(2g) = 24.5² / (2 × 9.8) = 600.25 / 19.6 ≈ 30.6 m.",
  },
  {
    id: "bank-4-hard-2",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "An object has acceleration a(t) = 6t (m/s²) and starts from rest (v(0) = 0). What is its velocity at t = 3 s?",
    value: 27,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "v(t) = ∫a dt = ∫6t dt = 3t². At t = 3 s, v = 3(9) = 27 m/s.",
  },
  {
    id: "bank-4-hard-3",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A car traveling at 20 m/s brakes with a = −4 m/s². How far does it travel during the time it takes to stop?",
    value: 50,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "v² = v₀² + 2aΔx → 0 = 400 + 2(−4)Δx → Δx = 400 / 8 = 50 m. (It stops after t = 20/4 = 5 s.)",
  },

  // ---------------------------------------------------------------------------
  // Lesson 5 — motion in two dimensions (vectors & components)
  // ---------------------------------------------------------------------------
  {
    id: "bank-5-easy-1",
    topicId: "lesson-5-two-dimensions",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "A velocity vector has components vₓ = 3 m/s and v_y = 4 m/s. What is its magnitude?",
    value: 5,
    tolerance: 0.1,
    unit: "m/s",
    explanation: "|v| = √(vₓ² + v_y²) = √(3² + 4²) = √(9 + 16) = √25 = 5 m/s.",
  },
  {
    id: "bank-5-easy-2",
    topicId: "lesson-5-two-dimensions",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "In two-dimensional motion (e.g., a projectile), the horizontal (x) and vertical (y) motions are:",
    options: [
      { id: "a", label: "Coupled — one controls the other" },
      { id: "b", label: "Independent of each other" },
      { id: "c", label: "Always equal in magnitude" },
      { id: "d", label: "Always opposite in direction" },
    ],
    correctOptionId: "b",
    explanation:
      "The x and y components evolve independently; the shared variable is only time. This independence is the key to solving projectile problems.",
  },
  {
    id: "bank-5-medium-1",
    topicId: "lesson-5-two-dimensions",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A boat heads east at 6 m/s while a current pushes it north at 8 m/s. What is the magnitude of its resultant velocity?",
    value: 10,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "The components are perpendicular: |v| = √(6² + 8²) = √(36 + 64) = √100 = 10 m/s.",
  },
  {
    id: "bank-5-medium-2",
    topicId: "lesson-5-two-dimensions",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A velocity vector has magnitude 20 m/s directed 30° above the horizontal. What is its horizontal component?",
    value: 17.3,
    tolerance: 0.2,
    unit: "m/s",
    explanation: "vₓ = v cos θ = 20 × cos 30° = 20 × 0.866 ≈ 17.3 m/s.",
  },
  {
    id: "bank-5-hard-1",
    topicId: "lesson-5-two-dimensions",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has position r(t) = (2t, 3t²) meters. What is its speed at t = 2 s?",
    value: 12.2,
    tolerance: 0.2,
    unit: "m/s",
    explanation:
      "v = dr/dt = (2, 6t). At t = 2 s, v = (2, 12), so speed = √(2² + 12²) = √(4 + 144) = √148 ≈ 12.2 m/s.",
  },
  {
    id: "bank-5-hard-2",
    topicId: "lesson-5-two-dimensions",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A plane flies due north at 200 m/s while a wind blows due east at 30 m/s. What is the magnitude of the plane's resultant velocity?",
    value: 202.2,
    tolerance: 0.5,
    unit: "m/s",
    explanation:
      "|v| = √(200² + 30²) = √(40000 + 900) = √40900 ≈ 202.2 m/s.",
  },

  // ---------------------------------------------------------------------------
  // Lesson 6 — projectile motion
  // ---------------------------------------------------------------------------
  {
    id: "bank-6-easy-1",
    topicId: "lesson-6-projectile-motion",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball is dropped from rest. Using g = 9.8 m/s², what is its speed after 2 s?",
    value: 19.6,
    tolerance: 0.2,
    unit: "m/s",
    explanation: "v = gt = 9.8 × 2 = 19.6 m/s.",
  },
  {
    id: "bank-6-easy-2",
    topicId: "lesson-6-projectile-motion",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "For a projectile launched horizontally (ignoring air resistance), the horizontal component of its velocity:",
    options: [
      { id: "a", label: "Increases steadily" },
      { id: "b", label: "Decreases steadily" },
      { id: "c", label: "Stays constant" },
      { id: "d", label: "Becomes zero at the highest point" },
    ],
    correctOptionId: "c",
    explanation:
      "No horizontal force acts, so the horizontal velocity stays constant. Only the vertical component changes due to gravity.",
  },
  {
    id: "bank-6-medium-1",
    topicId: "lesson-6-projectile-motion",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball is launched horizontally at 12 m/s from a 20 m high cliff (g = 9.8 m/s²). How long is it in the air?",
    value: 2.02,
    tolerance: 0.05,
    unit: "s",
    explanation:
      "Vertical: 20 = ½gt² → t = √(2 × 20 / 9.8) = √4.08 ≈ 2.02 s. (Horizontal speed does not affect fall time.)",
  },
  {
    id: "bank-6-medium-2",
    topicId: "lesson-6-projectile-motion",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball launched horizontally at 12 m/s from a 20 m cliff stays in the air ≈ 2.02 s. What is its horizontal range?",
    value: 24.2,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "Range = vₓ · t = 12 × 2.02 ≈ 24.2 m (horizontal velocity is constant).",
  },
  {
    id: "bank-6-medium-3",
    topicId: "lesson-6-projectile-motion",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A projectile is launched straight up at 19.6 m/s (g = 9.8 m/s²). How long does it take to reach its peak height?",
    value: 2,
    tolerance: 0.05,
    unit: "s",
    explanation:
      "At the peak v_y = 0: t = v₀/g = 19.6 / 9.8 = 2 s.",
  },
  {
    id: "bank-6-hard-1",
    topicId: "lesson-6-projectile-motion",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A projectile is launched at 30 m/s at 40° above the horizontal (g = 9.8 m/s²). What is its total time of flight (lands at launch height)?",
    value: 3.94,
    tolerance: 0.1,
    unit: "s",
    explanation:
      "t = 2v₀sinθ / g = 2 × 30 × sin 40° / 9.8 = 60 × 0.643 / 9.8 ≈ 3.94 s.",
  },
  {
    id: "bank-6-hard-2",
    topicId: "lesson-6-projectile-motion",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A projectile is launched at 25 m/s at 53° above the horizontal (g = 9.8 m/s²). What is its maximum height?",
    value: 20.3,
    tolerance: 0.4,
    unit: "m",
    explanation:
      "h = (v₀ sin θ)² / (2g) = (25 × sin 53°)² / 19.6 = (19.97)² / 19.6 ≈ 398.6 / 19.6 ≈ 20.3 m.",
  },
  {
    id: "bank-6-hard-3",
    topicId: "lesson-6-projectile-motion",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A projectile is launched at 20 m/s at 30° above the horizontal (g = 9.8 m/s²). What is its horizontal range (lands at launch height)?",
    value: 35.3,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "R = v₀² sin(2θ) / g = 20² × sin 60° / 9.8 = 400 × 0.866 / 9.8 ≈ 35.3 m.",
  },

  // ---------------------------------------------------------------------------
  // Lesson 7 — mastery challenge (mixed / multi-step)
  // ---------------------------------------------------------------------------
  {
    id: "bank-7-easy-1",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "An object travels 30 m in the +x direction, then 10 m in the −x direction. What is its net displacement?",
    value: 20,
    tolerance: 0.1,
    unit: "m",
    explanation: "Net displacement = +30 + (−10) = 20 m in the +x direction.",
  },
  {
    id: "bank-7-medium-1",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A car accelerates from rest at 2 m/s² for 5 s, then travels at constant velocity for 10 s. What total distance does it cover?",
    value: 125,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "Phase 1: x₁ = ½(2)(5²) = 25 m, reaching v = 2 × 5 = 10 m/s. Phase 2: x₂ = 10 × 10 = 100 m. Total = 25 + 100 = 125 m.",
  },
  {
    id: "bank-7-hard-1",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball is thrown horizontally at 15 m/s from a 45 m high cliff (g = 9.8 m/s²). What is its speed when it hits the ground?",
    value: 33.3,
    tolerance: 0.5,
    unit: "m/s",
    explanation:
      "Fall time: t = √(2 × 45 / 9.8) ≈ 3.03 s. v_y = gt ≈ 29.7 m/s. Speed = √(vₓ² + v_y²) = √(15² + 29.7²) = √(225 + 882) ≈ 33.3 m/s.",
  },
  {
    id: "bank-7-hard-2",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "hard",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "From the same height, one ball is dropped from rest and another is thrown horizontally at the same instant. Ignoring air resistance, which reaches the ground first?",
    options: [
      { id: "a", label: "The dropped ball" },
      { id: "b", label: "The horizontally thrown ball" },
      { id: "c", label: "They land at the same time" },
      { id: "d", label: "It depends on the horizontal speed" },
    ],
    correctOptionId: "c",
    explanation:
      "Vertical and horizontal motions are independent. Both balls have the same initial vertical velocity (zero) and the same g, so they fall for the same time and land together.",
  },
  {
    id: "bank-7-hard-3",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A car accelerates from rest at 3 m/s² for 4 s, then decelerates at 2 m/s² until it stops. What total distance does it cover?",
    value: 60,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "Phase 1: v = 3 × 4 = 12 m/s, x₁ = ½(3)(4²) = 24 m. Phase 2: from 12 m/s to 0 at −2 m/s², x₂ = v²/(2a) = 144 / 4 = 36 m. Total = 24 + 36 = 60 m.",
  },

  // ===========================================================================
  // ADDITIONAL BANK — second wave of original, self-contained questions.
  // Grouped by lesson; every numeric answer hand-verified. g = 9.8 m/s².
  // ===========================================================================

  // --- Lesson 1 — position & velocity (additions) ----------------------------
  {
    id: "bank-1-easy-5",
    topicId: "lesson-1-position-velocity",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "At constant velocity an object moves from x = 0 to x = −18 m in 6 s. What is its average velocity (include the sign)?",
    value: -3,
    tolerance: 0.1,
    unit: "m/s",
    explanation: "v_avg = Δx/Δt = (−18 − 0) / 6 = −18 / 6 = −3 m/s.",
  },
  {
    id: "bank-1-easy-6",
    topicId: "lesson-1-position-velocity",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt: "Average velocity over a time interval is defined as:",
    options: [
      { id: "a", label: "Total distance traveled divided by time" },
      { id: "b", label: "Displacement divided by the time interval" },
      { id: "c", label: "The slope of the tangent line at a point" },
      { id: "d", label: "The change in speed divided by time" },
    ],
    correctOptionId: "b",
    explanation:
      "Average velocity = Δx/Δt (displacement over elapsed time). It uses displacement, not total distance, so direction matters.",
  },
  {
    id: "bank-1-easy-7",
    topicId: "lesson-1-position-velocity",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt: "A jogger runs 200 m due east in 40 s. What is the average velocity?",
    value: 5,
    tolerance: 0.1,
    unit: "m/s",
    explanation: "v_avg = Δx/Δt = 200 / 40 = 5 m/s east.",
  },
  {
    id: "bank-1-medium-4",
    topicId: "lesson-1-position-velocity",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle's position is x(t) = 4t + t² (meters). What is its instantaneous velocity at t = 3 s?",
    value: 10,
    tolerance: 0.1,
    unit: "m/s",
    explanation: "v = dx/dt = 4 + 2t. At t = 3 s, v = 4 + 6 = 10 m/s.",
  },
  {
    id: "bank-1-medium-5",
    topicId: "lesson-1-position-velocity",
    difficulty: "medium",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "For what kind of motion is the average velocity over an interval equal to the instantaneous velocity at every instant in that interval?",
    options: [
      { id: "a", label: "Motion with constant (uniform) velocity" },
      { id: "b", label: "Motion with constant acceleration" },
      { id: "c", label: "Any motion that starts and ends at rest" },
      { id: "d", label: "Only circular motion" },
    ],
    correctOptionId: "a",
    explanation:
      "If velocity is constant, the instantaneous value never changes, so it equals the average over any interval. Under nonzero acceleration the instantaneous value varies.",
  },
  {
    id: "bank-1-medium-6",
    topicId: "lesson-1-position-velocity",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has position x(t) = t² − 6t (meters). What is its average velocity between t = 1 s and t = 4 s?",
    value: -1,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "x(1) = 1 − 6 = −5 m; x(4) = 16 − 24 = −8 m. v_avg = (−8 − (−5)) / (4 − 1) = −3 / 3 = −1 m/s.",
  },
  {
    id: "bank-1-hard-3",
    topicId: "lesson-1-position-velocity",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle moves with x(t) = 2t³ − 9t² + 12t (meters). What is its instantaneous velocity at t = 3 s?",
    value: 12,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "v = dx/dt = 6t² − 18t + 12. At t = 3: v = 6(9) − 18(3) + 12 = 54 − 54 + 12 = 12 m/s.",
  },
  {
    id: "bank-1-hard-4",
    topicId: "lesson-1-position-velocity",
    difficulty: "hard",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "For x(t) = 2t³ − 9t² + 12t, at which times (t > 0) is the particle momentarily at rest?",
    options: [
      { id: "a", label: "t = 1 s and t = 2 s" },
      { id: "b", label: "t = 0 s and t = 3 s" },
      { id: "c", label: "t = 2 s only" },
      { id: "d", label: "It is never at rest" },
    ],
    correctOptionId: "a",
    explanation:
      "v = 6t² − 18t + 12 = 6(t − 1)(t − 2). Setting v = 0 gives t = 1 s and t = 2 s.",
  },

  // --- Lesson 2 — velocity & acceleration (additions) ------------------------
  {
    id: "bank-2-easy-4",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "A car's velocity decreases from 20 m/s to 8 m/s in 3 s. What is its acceleration (include the sign)?",
    value: -4,
    tolerance: 0.1,
    unit: "m/s²",
    explanation: "a = Δv/Δt = (8 − 20) / 3 = −12 / 3 = −4 m/s².",
  },
  {
    id: "bank-2-easy-5",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt: "An object speeds up (its speed increases) whenever:",
    options: [
      { id: "a", label: "Its velocity and acceleration point in the same direction" },
      { id: "b", label: "Its velocity and acceleration point in opposite directions" },
      { id: "c", label: "Its acceleration is zero" },
      { id: "d", label: "Its velocity is zero" },
    ],
    correctOptionId: "a",
    explanation:
      "Speed increases when velocity and acceleration share a sign (same direction). Opposite signs mean slowing down.",
  },
  {
    id: "bank-2-easy-6",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "Starting from rest, an object reaches 15 m/s in 5 s. What is its average acceleration?",
    value: 3,
    tolerance: 0.1,
    unit: "m/s²",
    explanation: "a = Δv/Δt = (15 − 0) / 5 = 3 m/s².",
  },
  {
    id: "bank-2-medium-4",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has velocity v(t) = 3t² − 2t (m/s). What is its acceleration at t = 2 s?",
    value: 10,
    tolerance: 0.1,
    unit: "m/s²",
    explanation: "a = dv/dt = 6t − 2. At t = 2 s, a = 12 − 2 = 10 m/s².",
  },
  {
    id: "bank-2-medium-5",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "medium",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "An object moves in the +x direction with zero acceleration. Which statement is true?",
    options: [
      { id: "a", label: "It is speeding up" },
      { id: "b", label: "It is slowing down" },
      { id: "c", label: "It moves at constant velocity" },
      { id: "d", label: "It is momentarily at rest" },
    ],
    correctOptionId: "c",
    explanation:
      "Zero acceleration means the velocity does not change, so the object moves at constant velocity (neither speeding up nor slowing down).",
  },
  {
    id: "bank-2-medium-6",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "On a straight v–t line, velocity falls from 10 m/s at t = 0 to 2 m/s at t = 4 s. What is the acceleration?",
    value: -2,
    tolerance: 0.1,
    unit: "m/s²",
    explanation:
      "Acceleration is the slope of the v–t line: a = (2 − 10) / (4 − 0) = −8 / 4 = −2 m/s².",
  },
  {
    id: "bank-2-hard-3",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has velocity v(t) = t³ − 3t (m/s). What is its acceleration at t = 2 s?",
    value: 9,
    tolerance: 0.1,
    unit: "m/s²",
    explanation: "a = dv/dt = 3t² − 3. At t = 2 s, a = 3(4) − 3 = 12 − 3 = 9 m/s².",
  },
  {
    id: "bank-2-hard-4",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "hard",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "A particle's velocity is positive and decreasing, passes through zero, then becomes negative, while its acceleration stays constant and negative. At the instant v = 0, the particle is:",
    options: [
      { id: "a", label: "Permanently at rest" },
      { id: "b", label: "Momentarily at rest and about to reverse direction" },
      { id: "c", label: "Speeding up in the +x direction" },
      { id: "d", label: "Experiencing zero acceleration" },
    ],
    correctOptionId: "b",
    explanation:
      "v = 0 only for an instant; the constant negative acceleration keeps changing v, so the particle momentarily stops and then moves in the −x direction.",
  },

  // --- Lesson 3 — displacement as area (additions) ---------------------------
  {
    id: "bank-3-easy-4",
    topicId: "lesson-3-displacement-area",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "An object moves at a constant −4 m/s for 5 s. What is its displacement (include the sign)?",
    value: -20,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "Displacement = v·t = (−4)(5) = −20 m (signed area under a v–t graph below the axis).",
  },
  {
    id: "bank-3-easy-5",
    topicId: "lesson-3-displacement-area",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "On a v–t graph, a region of area that lies below the time axis represents:",
    options: [
      { id: "a", label: "Displacement in the positive direction" },
      { id: "b", label: "Displacement in the negative direction" },
      { id: "c", label: "Zero displacement" },
      { id: "d", label: "An increase in speed" },
    ],
    correctOptionId: "b",
    explanation:
      "Area below the axis is negative (signed) area, corresponding to displacement in the negative direction.",
  },
  {
    id: "bank-3-medium-4",
    topicId: "lesson-3-displacement-area",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle moves at +8 m/s for 3 s, then at −8 m/s for 3 s. What is its net displacement?",
    value: 0,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "Net displacement uses signed area: (8 × 3) + (−8 × 3) = 24 − 24 = 0 m.",
  },
  {
    id: "bank-3-medium-5",
    topicId: "lesson-3-displacement-area",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle moves at +8 m/s for 3 s, then at −8 m/s for 3 s. What is the total distance traveled?",
    value: 48,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "Total distance sums magnitudes: |8 × 3| + |−8 × 3| = 24 + 24 = 48 m.",
  },
  {
    id: "bank-3-hard-5",
    topicId: "lesson-3-displacement-area",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has velocity v(t) = 3t² (m/s). Using displacement = ∫v dt, how far does it travel from t = 0 to t = 2 s?",
    value: 8,
    tolerance: 0.1,
    unit: "m",
    explanation: "∫₀² 3t² dt = [t³]₀² = 8 − 0 = 8 m.",
  },
  {
    id: "bank-3-hard-6",
    topicId: "lesson-3-displacement-area",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has velocity v(t) = 8 − 2t (m/s) for 0 ≤ t ≤ 6 s. What is its net displacement over this interval?",
    value: 12,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "Net displacement = ∫₀⁶ (8 − 2t) dt = [8t − t²]₀⁶ = (48 − 36) − 0 = 12 m.",
  },

  // --- Lesson 4 — acceleration → velocity → position (additions) -------------
  {
    id: "bank-4-easy-4",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "A car starts at 10 m/s and accelerates at −2 m/s² for 3 s. What is its final velocity? (v = v₀ + at)",
    value: 4,
    tolerance: 0.1,
    unit: "m/s",
    explanation: "v = v₀ + at = 10 + (−2)(3) = 10 − 6 = 4 m/s.",
  },
  {
    id: "bank-4-easy-5",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "Under constant acceleration, which equation gives position as a function of time?",
    options: [
      { id: "a", label: "v = v₀ + at" },
      { id: "b", label: "x = x₀ + v₀t + ½at²" },
      { id: "c", label: "v² = v₀² + 2aΔx" },
      { id: "d", label: "a = Δv/Δt" },
    ],
    correctOptionId: "b",
    explanation:
      "x = x₀ + v₀t + ½at² gives position vs. time. It is the integral of v = v₀ + at.",
  },
  {
    id: "bank-4-medium-4",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A car uniformly accelerates from rest to 25 m/s in 5 s. How far does it travel during this time?",
    value: 62.5,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "With constant acceleration, distance = average velocity × time = ((0 + 25)/2) × 5 = 12.5 × 5 = 62.5 m.",
  },
  {
    id: "bank-4-medium-5",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "Starting from rest, an object accelerates at 3 m/s² over a distance of 6 m. What is its final speed? (v² = v₀² + 2aΔx)",
    value: 6,
    tolerance: 0.1,
    unit: "m/s",
    explanation: "v² = 0 + 2(3)(6) = 36, so v = √36 = 6 m/s.",
  },
  {
    id: "bank-4-hard-4",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "An object has constant acceleration a = 4 m/s², starting with v₀ = 2 m/s at x₀ = 0. What is its position at t = 3 s?",
    value: 24,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "x = x₀ + v₀t + ½at² = 0 + (2)(3) + ½(4)(3²) = 6 + 18 = 24 m.",
  },
  {
    id: "bank-4-hard-5",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball is thrown straight up at 19.6 m/s (g = 9.8 m/s²). How long after launch does it return to its starting height?",
    value: 4,
    tolerance: 0.1,
    unit: "s",
    explanation:
      "Total flight time = 2v₀/g = 2 × 19.6 / 9.8 = 4 s (up-time equals down-time).",
  },

  // --- Lesson 5 — two dimensions (additions) ---------------------------------
  {
    id: "bank-5-easy-3",
    topicId: "lesson-5-two-dimensions",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "A velocity vector has components vₓ = 5 m/s and v_y = 12 m/s. What is its magnitude?",
    value: 13,
    tolerance: 0.1,
    unit: "m/s",
    explanation: "|v| = √(5² + 12²) = √(25 + 144) = √169 = 13 m/s.",
  },
  {
    id: "bank-5-easy-4",
    topicId: "lesson-5-two-dimensions",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "In two dimensions, the velocity vector is obtained from the position vector r(t) by:",
    options: [
      { id: "a", label: "Integrating r(t) with respect to time" },
      { id: "b", label: "Taking the derivative v = dr/dt" },
      { id: "c", label: "Multiplying r(t) by time" },
      { id: "d", label: "Taking the magnitude of r(t)" },
    ],
    correctOptionId: "b",
    explanation:
      "Velocity is the time derivative of position: v = dr/dt, applied component-by-component.",
  },
  {
    id: "bank-5-medium-3",
    topicId: "lesson-5-two-dimensions",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A velocity vector has magnitude 50 m/s directed 37° above the horizontal. What is its vertical component?",
    value: 30.1,
    tolerance: 0.3,
    unit: "m/s",
    explanation: "v_y = v sin θ = 50 × sin 37° = 50 × 0.602 ≈ 30.1 m/s.",
  },
  {
    id: "bank-5-medium-4",
    topicId: "lesson-5-two-dimensions",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has position r(t) = (3t, 4t) meters. What is its speed?",
    value: 5,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "v = dr/dt = (3, 4) m/s (constant). Speed = √(3² + 4²) = √25 = 5 m/s.",
  },
  {
    id: "bank-5-hard-3",
    topicId: "lesson-5-two-dimensions",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has position r(t) = (t², 2t) meters. What is its speed at t = 3 s?",
    value: 6.32,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "v = dr/dt = (2t, 2). At t = 3 s, v = (6, 2), so speed = √(6² + 2²) = √40 ≈ 6.32 m/s.",
  },
  {
    id: "bank-5-hard-4",
    topicId: "lesson-5-two-dimensions",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A swimmer heads straight across a river at 1.5 m/s while the current carries them downstream at 2 m/s. What is the magnitude of their resultant velocity?",
    value: 2.5,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "The components are perpendicular: |v| = √(1.5² + 2²) = √(2.25 + 4) = √6.25 = 2.5 m/s.",
  },

  // --- Lesson 6 — projectile motion (additions) ------------------------------
  {
    id: "bank-6-easy-3",
    topicId: "lesson-6-projectile-motion",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball is dropped from rest. Using g = 9.8 m/s², how far does it fall in 3 s?",
    value: 44.1,
    tolerance: 0.2,
    unit: "m",
    explanation: "y = ½gt² = ½ × 9.8 × 3² = ½ × 9.8 × 9 = 44.1 m.",
  },
  {
    id: "bank-6-easy-4",
    topicId: "lesson-6-projectile-motion",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "During the entire flight of a projectile (ignoring air resistance), its acceleration is:",
    options: [
      { id: "a", label: "Zero at the highest point" },
      { id: "b", label: "9.8 m/s² downward at all times" },
      { id: "c", label: "Directed along the velocity" },
      { id: "d", label: "Largest at launch and smallest at the peak" },
    ],
    correctOptionId: "b",
    explanation:
      "Only gravity acts, so the acceleration is a constant 9.8 m/s² downward throughout — even at the peak where the vertical velocity is zero.",
  },
  {
    id: "bank-6-medium-4",
    topicId: "lesson-6-projectile-motion",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball is launched horizontally from a 45 m high platform (g = 9.8 m/s²). How long is it in the air?",
    value: 3.03,
    tolerance: 0.05,
    unit: "s",
    explanation:
      "Vertical: 45 = ½gt² → t = √(2 × 45 / 9.8) = √9.18 ≈ 3.03 s. Horizontal speed does not affect fall time.",
  },
  {
    id: "bank-6-medium-5",
    topicId: "lesson-6-projectile-motion",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A projectile is launched straight up at 29.4 m/s (g = 9.8 m/s²). How long does it take to reach its peak?",
    value: 3,
    tolerance: 0.05,
    unit: "s",
    explanation: "At the peak v_y = 0: t = v₀/g = 29.4 / 9.8 = 3 s.",
  },
  {
    id: "bank-6-hard-4",
    topicId: "lesson-6-projectile-motion",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A projectile is launched at 40 m/s at 30° above the horizontal (g = 9.8 m/s²). What is its horizontal range (lands at launch height)?",
    value: 141.4,
    tolerance: 1,
    unit: "m",
    explanation:
      "R = v₀² sin(2θ) / g = 40² × sin 60° / 9.8 = 1600 × 0.866 / 9.8 ≈ 141.4 m.",
  },
  {
    id: "bank-6-hard-5",
    topicId: "lesson-6-projectile-motion",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A projectile is launched at 35 m/s at 45° above the horizontal (g = 9.8 m/s²). What is its maximum height?",
    value: 31.3,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "h = (v₀ sin θ)² / (2g) = (35 × sin 45°)² / 19.6 = (24.75)² / 19.6 ≈ 612.5 / 19.6 ≈ 31.3 m.",
  },

  // --- Lesson 7 — mastery challenge (additions) ------------------------------
  {
    id: "bank-7-easy-2",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "An object travels 30 m in the +x direction, then 10 m in the −x direction. What total distance does it travel?",
    value: 40,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "Total distance sums the magnitudes of each leg: 30 + 10 = 40 m (compare with the net displacement of 20 m).",
  },
  {
    id: "bank-7-easy-3",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "A ball is thrown straight up and caught at the same height it left the hand. Its net displacement for the whole trip is:",
    options: [
      { id: "a", label: "Zero" },
      { id: "b", label: "Twice the maximum height" },
      { id: "c", label: "Equal to the maximum height" },
      { id: "d", label: "It depends on the launch speed" },
    ],
    correctOptionId: "a",
    explanation:
      "Displacement is final position minus initial position. Since it returns to its start, the net displacement is zero (the total distance, however, is twice the peak height).",
  },
  {
    id: "bank-7-medium-2",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A car accelerates from rest at 4 m/s² for 3 s, then travels at constant velocity for 5 s. What total distance does it cover?",
    value: 78,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "Phase 1: x₁ = ½(4)(3²) = 18 m, reaching v = 4 × 3 = 12 m/s. Phase 2: x₂ = 12 × 5 = 60 m. Total = 18 + 60 = 78 m.",
  },
  {
    id: "bank-7-medium-3",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball is thrown horizontally at 10 m/s from a 5 m high table (g = 9.8 m/s²). How far from the base of the table does it land?",
    value: 10.1,
    tolerance: 0.3,
    unit: "m",
    explanation:
      "Fall time: t = √(2 × 5 / 9.8) ≈ 1.01 s. Range = vₓ · t = 10 × 1.01 ≈ 10.1 m.",
  },
  {
    id: "bank-7-hard-4",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball is thrown straight up at 30 m/s from the edge of a 25 m tall building (g = 9.8 m/s²). How long until it hits the ground below?",
    value: 6.87,
    tolerance: 0.1,
    unit: "s",
    explanation:
      "Take up as positive: −25 = 30t − ½(9.8)t² → 4.9t² − 30t − 25 = 0. t = (30 + √(900 + 490)) / 9.8 = (30 + 37.28) / 9.8 ≈ 6.87 s.",
  },
  {
    id: "bank-7-hard-5",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A projectile is launched at 25 m/s at 53° above the horizontal (g = 9.8 m/s²). What is its horizontal range (lands at launch height)?",
    value: 61.3,
    tolerance: 0.8,
    unit: "m",
    explanation:
      "R = v₀² sin(2θ) / g = 25² × sin 106° / 9.8 = 625 × 0.961 / 9.8 ≈ 61.3 m.",
  },

  // ===========================================================================
  // AP-STYLE WAVE — exam-flavored items emphasizing the reasoning AP rewards:
  // ratio reasoning (d ∝ v², R ∝ v²), conceptual traps, motion symmetry, and
  // independence of x/y motion. Self-contained; numeric answers hand-verified.
  // ===========================================================================

  // --- Lesson 1 — position & velocity (AP-style) -----------------------------
  {
    id: "bank-1-easy-8",
    topicId: "lesson-1-position-velocity",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "A car's speedometer reads 60 km/h. This reading is a measure of the car's:",
    options: [
      { id: "a", label: "Instantaneous speed" },
      { id: "b", label: "Average velocity for the trip" },
      { id: "c", label: "Total displacement" },
      { id: "d", label: "Acceleration" },
    ],
    correctOptionId: "a",
    explanation:
      "A speedometer shows how fast the car is moving at that moment — its instantaneous speed — not an average over the trip and not a direction-dependent velocity.",
  },
  {
    id: "bank-1-medium-7",
    topicId: "lesson-1-position-velocity",
    difficulty: "medium",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "A car covers equal distances in each successive 1-second interval of its motion. Which statement best describes the motion?",
    options: [
      { id: "a", label: "Constant (uniform) velocity" },
      { id: "b", label: "Constant nonzero acceleration" },
      { id: "c", label: "Steadily increasing speed" },
      { id: "d", label: "Steadily decreasing speed" },
    ],
    correctOptionId: "a",
    explanation:
      "Equal displacements in equal times means Δx/Δt never changes, so the velocity is constant and the acceleration is zero.",
  },
  {
    id: "bank-1-hard-5",
    topicId: "lesson-1-position-velocity",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has position x(t) = t³ − 12t (meters). What is its average velocity between t = 1 s and t = 3 s?",
    value: 1,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "x(1) = 1 − 12 = −11 m; x(3) = 27 − 36 = −9 m. v_avg = (−9 − (−11)) / (3 − 1) = 2 / 2 = 1 m/s.",
  },

  // --- Lesson 2 — velocity & acceleration (AP-style) -------------------------
  {
    id: "bank-2-easy-7",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball rolling up a ramp slows uniformly from 6 m/s to rest in 3 s. What is the magnitude of its acceleration?",
    value: 2,
    tolerance: 0.1,
    unit: "m/s²",
    explanation:
      "a = Δv/Δt = (0 − 6) / 3 = −2 m/s²; the magnitude is 2 m/s² (directed down the ramp).",
  },
  {
    id: "bank-2-medium-7",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "medium",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "Moving in the +x direction, an object slows down, momentarily stops, then speeds up in the −x direction — all with constant acceleration. During this motion the acceleration is:",
    options: [
      { id: "a", label: "Negative the entire time" },
      { id: "b", label: "Zero at the instant it stops" },
      { id: "c", label: "Positive, then negative" },
      { id: "d", label: "Negative, then positive" },
    ],
    correctOptionId: "a",
    explanation:
      "The acceleration is constant and points in the −x direction the whole time. Velocity passes through zero, but acceleration does not — it stays negative, which is exactly what reverses the motion.",
  },
  {
    id: "bank-2-hard-5",
    topicId: "lesson-2-velocity-acceleration",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle starts from rest with acceleration a(t) = 4 − 2t (m/s²). What is its maximum velocity for t > 0?",
    value: 4,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "v(t) = ∫a dt = 4t − t². Velocity is maximum where a = 0, i.e. 4 − 2t = 0 → t = 2 s. v(2) = 4(2) − 2² = 8 − 4 = 4 m/s.",
  },

  // --- Lesson 3 — displacement as area (AP-style) ----------------------------
  {
    id: "bank-3-easy-6",
    topicId: "lesson-3-displacement-area",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "Two cars travel for the same time. Car A moves at a constant 20 m/s; Car B starts from rest and accelerates uniformly to 20 m/s. Compared with Car A, Car B's displacement is:",
    options: [
      { id: "a", label: "The same" },
      { id: "b", label: "Half as large" },
      { id: "c", label: "Twice as large" },
      { id: "d", label: "One-quarter as large" },
    ],
    correctOptionId: "b",
    explanation:
      "Displacement is the area under the v–t graph. Car A's is a rectangle (20·T); Car B's is a triangle to the same final speed (½·20·T) — exactly half.",
  },
  {
    id: "bank-3-medium-6",
    topicId: "lesson-3-displacement-area",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "On a v–t graph, an object's velocity rises linearly from 0 to 12 m/s over the first 4 s, then stays constant at 12 m/s for 3 s. What is the total displacement?",
    value: 60,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "Triangle area (0–4 s): ½ × 4 × 12 = 24 m. Rectangle area (4–7 s): 12 × 3 = 36 m. Total = 24 + 36 = 60 m.",
  },
  {
    id: "bank-3-hard-7",
    topicId: "lesson-3-displacement-area",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has velocity v(t) = t² − 4 (m/s) for 0 ≤ t ≤ 3 s. What is its net displacement over this interval?",
    value: -3,
    tolerance: 0.1,
    unit: "m",
    explanation:
      "Net displacement = ∫₀³ (t² − 4) dt = [t³/3 − 4t]₀³ = (9 − 12) − 0 = −3 m.",
  },

  // --- Lesson 4 — constant-acceleration kinematics (AP-style) ----------------
  {
    id: "bank-4-easy-6",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "A car uniformly accelerates from 8 m/s to 20 m/s over 6 s. How far does it travel during this time?",
    value: 84,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "With constant acceleration, distance = average velocity × time = ((8 + 20)/2) × 6 = 14 × 6 = 84 m.",
  },
  {
    id: "bank-4-medium-6",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "medium",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "Under maximum braking, a car traveling at speed v stops in a distance d. Traveling at 2v with the same braking, its minimum stopping distance is:",
    options: [
      { id: "a", label: "2d" },
      { id: "b", label: "4d" },
      { id: "c", label: "d√2" },
      { id: "d", label: "8d" },
    ],
    correctOptionId: "b",
    explanation:
      "From v² = v₀² + 2aΔx, stopping distance ∝ v₀² for fixed a. Doubling the speed multiplies the distance by 2² = 4, so it becomes 4d.",
  },
  {
    id: "bank-4-hard-6",
    topicId: "lesson-4-acceleration-to-position",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A stone is dropped from rest and strikes the ground at 28 m/s (g = 9.8 m/s²). From what height was it dropped?",
    value: 40,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "v² = 2gh → h = v² / (2g) = 28² / (2 × 9.8) = 784 / 19.6 = 40 m.",
  },

  // --- Lesson 5 — two dimensions (AP-style) ----------------------------------
  {
    id: "bank-5-easy-5",
    topicId: "lesson-5-two-dimensions",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "Two perpendicular displacements, 3 m east and 4 m north, are added. The magnitude of the resultant displacement is:",
    options: [
      { id: "a", label: "1 m" },
      { id: "b", label: "5 m" },
      { id: "c", label: "7 m" },
      { id: "d", label: "12 m" },
    ],
    correctOptionId: "b",
    explanation:
      "Perpendicular vectors add by the Pythagorean theorem: √(3² + 4²) = √25 = 5 m (not the simple sum 7 m).",
  },
  {
    id: "bank-5-medium-5",
    topicId: "lesson-5-two-dimensions",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "An airplane's velocity has an eastward component of 120 m/s and a northward component of 50 m/s. What is its speed?",
    value: 130,
    tolerance: 0.5,
    unit: "m/s",
    explanation:
      "Speed = √(vₓ² + v_y²) = √(120² + 50²) = √(14400 + 2500) = √16900 = 130 m/s.",
  },
  {
    id: "bank-5-hard-5",
    topicId: "lesson-5-two-dimensions",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A particle has velocity components vₓ = 9 m/s and v_y = −12 m/s. What is its speed?",
    value: 15,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "Speed is the magnitude regardless of sign: √(9² + (−12)²) = √(81 + 144) = √225 = 15 m/s.",
  },

  // --- Lesson 6 — projectile motion (AP-style) -------------------------------
  {
    id: "bank-6-easy-5",
    topicId: "lesson-6-projectile-motion",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "Two balls are launched horizontally from the same height at the same instant, one faster than the other. Ignoring air resistance, the faster ball lands:",
    options: [
      { id: "a", label: "Sooner, and closer" },
      { id: "b", label: "Later, and farther" },
      { id: "c", label: "At the same time, but farther away" },
      { id: "d", label: "At the same time, and the same distance away" },
    ],
    correctOptionId: "c",
    explanation:
      "Vertical and horizontal motions are independent. Both fall the same height with the same vertical motion, so they land together; the faster ball travels farther horizontally in that shared time.",
  },
  {
    id: "bank-6-medium-6",
    topicId: "lesson-6-projectile-motion",
    difficulty: "medium",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "A projectile is launched on level ground at a fixed angle. If its launch speed is doubled, its horizontal range becomes:",
    options: [
      { id: "a", label: "2 times as large" },
      { id: "b", label: "4 times as large" },
      { id: "c", label: "√2 times as large" },
      { id: "d", label: "8 times as large" },
    ],
    correctOptionId: "b",
    explanation:
      "Range R = v₀² sin(2θ)/g is proportional to v₀² at fixed angle. Doubling v₀ multiplies the range by 2² = 4.",
  },
  {
    id: "bank-6-hard-6",
    topicId: "lesson-6-projectile-motion",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A projectile is launched at 20 m/s at 60° above the horizontal (g = 9.8 m/s²). What is its speed at the highest point of its path?",
    value: 10,
    tolerance: 0.2,
    unit: "m/s",
    explanation:
      "At the peak the vertical velocity is zero, so the speed equals the (constant) horizontal component: vₓ = v₀ cos 60° = 20 × 0.5 = 10 m/s.",
  },

  // --- Lesson 7 — mastery challenge (AP-style) -------------------------------
  {
    id: "bank-7-easy-4",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "A ball is thrown straight up and later falls back to the hand. Ignoring air resistance, the magnitude of its acceleration is:",
    options: [
      { id: "a", label: "Greater on the way up" },
      { id: "b", label: "Greater on the way down" },
      { id: "c", label: "The same (9.8 m/s²) the entire time" },
      { id: "d", label: "Zero at the highest point" },
    ],
    correctOptionId: "c",
    explanation:
      "Gravity acts the same throughout the flight, so the acceleration is a constant 9.8 m/s² downward — including at the peak, where only the velocity is momentarily zero.",
  },
  {
    id: "bank-7-medium-4",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "Starting from rest, a car uniformly accelerates and covers 24 m in the first 4 s. What is its acceleration?",
    value: 3,
    tolerance: 0.1,
    unit: "m/s²",
    explanation:
      "x = ½at² → 24 = ½ a (4²) = 8a → a = 24 / 8 = 3 m/s².",
  },
  {
    id: "bank-7-hard-6",
    topicId: "lesson-7-mastery-challenge",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball thrown straight up returns to the thrower's hand 4 s later (g = 9.8 m/s²). With what speed was it thrown?",
    value: 19.6,
    tolerance: 0.2,
    unit: "m/s",
    explanation:
      "Total flight time t = 2v₀/g, so v₀ = g·t/2 = 9.8 × 4 / 2 = 19.6 m/s.",
  },

  // ===========================================================================
  // NEW LESSONS — free fall (8), relative motion (9), oscillations (10).
  // Self-contained; numeric answers hand-verified. g = 9.8 m/s².
  // ===========================================================================

  // --- Lesson 8 — free fall ---------------------------------------------------
  {
    id: "bank-8-easy-1",
    topicId: "lesson-8-free-fall",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball is dropped from rest. Using g = 9.8 m/s², what is its speed after 2 s?",
    value: 19.6,
    tolerance: 0.2,
    unit: "m/s",
    explanation: "Dropped from rest, v = g·t = 9.8 × 2 = 19.6 m/s.",
  },
  {
    id: "bank-8-easy-2",
    topicId: "lesson-8-free-fall",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "Ignoring air resistance, the acceleration of an object in free fall is:",
    options: [
      { id: "a", label: "A constant 9.8 m/s² downward" },
      { id: "b", label: "Zero" },
      { id: "c", label: "Greater for heavier objects" },
      { id: "d", label: "Zero at the highest point of a throw" },
    ],
    correctOptionId: "a",
    explanation:
      "Gravity gives every object a constant 9.8 m/s² downward, regardless of mass or where it is in the flight.",
  },
  {
    id: "bank-8-medium-1",
    topicId: "lesson-8-free-fall",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "How far does an object dropped from rest fall in 3 s? (g = 9.8 m/s²)",
    value: 44.1,
    tolerance: 0.2,
    unit: "m",
    explanation: "y = ½·g·t² = ½ × 9.8 × 3² = ½ × 9.8 × 9 = 44.1 m.",
  },
  {
    id: "bank-8-medium-2",
    topicId: "lesson-8-free-fall",
    difficulty: "medium",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "A ball is thrown straight up. At its highest point, its velocity and acceleration are:",
    options: [
      { id: "a", label: "Velocity zero; acceleration 9.8 m/s² downward" },
      { id: "b", label: "Both zero" },
      { id: "c", label: "Both 9.8 m/s² downward" },
      { id: "d", label: "Velocity maximum; acceleration zero" },
    ],
    correctOptionId: "a",
    explanation:
      "At the peak the velocity is momentarily zero, but gravity still acts, so the acceleration is 9.8 m/s² downward.",
  },
  {
    id: "bank-8-hard-1",
    topicId: "lesson-8-free-fall",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A ball is thrown straight up at 24.5 m/s (g = 9.8 m/s²). What maximum height does it reach above the launch point?",
    value: 30.6,
    tolerance: 0.3,
    unit: "m",
    explanation:
      "At the peak v = 0: h = v₀²/(2g) = 24.5² / 19.6 = 600.25 / 19.6 ≈ 30.6 m.",
  },
  {
    id: "bank-8-hard-2",
    topicId: "lesson-8-free-fall",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A stone dropped from rest strikes the ground at 28 m/s (g = 9.8 m/s²). From what height was it dropped?",
    value: 40,
    tolerance: 0.5,
    unit: "m",
    explanation: "v² = 2gh → h = v²/(2g) = 28² / 19.6 = 784 / 19.6 = 40 m.",
  },

  // --- Lesson 9 — relative motion & reference frames -------------------------
  {
    id: "bank-9-easy-1",
    topicId: "lesson-9-relative-motion",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt: "An object's velocity is always measured relative to:",
    options: [
      { id: "a", label: "A chosen reference frame" },
      { id: "b", label: "The Sun" },
      { id: "c", label: "Its own starting point only" },
      { id: "d", label: "Nothing — velocity is absolute" },
    ],
    correctOptionId: "a",
    explanation:
      "Velocity is meaningful only relative to a reference frame; different observers measure different velocities for the same motion.",
  },
  {
    id: "bank-9-easy-2",
    topicId: "lesson-9-relative-motion",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt:
      "On a straight road, car A moves at +30 m/s and car B at +20 m/s (same direction). What is the velocity of A relative to B?",
    value: 10,
    tolerance: 0.1,
    unit: "m/s",
    explanation: "v_AB = v_A − v_B = 30 − 20 = +10 m/s.",
  },
  {
    id: "bank-9-medium-1",
    topicId: "lesson-9-relative-motion",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A boat points straight across a river at 3 m/s relative to the water; the current is 4 m/s downstream. What is the boat's speed relative to the ground?",
    value: 5,
    tolerance: 0.1,
    unit: "m/s",
    explanation:
      "The across and downstream velocities are perpendicular: v = √(3² + 4²) = √25 = 5 m/s.",
  },
  {
    id: "bank-9-medium-2",
    topicId: "lesson-9-relative-motion",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A boat heads straight across a 60 m wide river at 6 m/s relative to the water (current 8 m/s downstream). How long does it take to cross?",
    value: 10,
    tolerance: 0.1,
    unit: "s",
    explanation:
      "Only the across velocity covers the width: t = 60 / 6 = 10 s. The current does not change the crossing time.",
  },
  {
    id: "bank-9-hard-1",
    topicId: "lesson-9-relative-motion",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A swimmer heads straight across a 30 m wide river at 1.5 m/s relative to the water; the current is 2 m/s downstream. How far downstream do they land?",
    value: 40,
    tolerance: 0.5,
    unit: "m",
    explanation:
      "Crossing time = 30 / 1.5 = 20 s; downstream drift = 2 × 20 = 40 m.",
  },
  {
    id: "bank-9-hard-2",
    topicId: "lesson-9-relative-motion",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "A plane flies due north at 200 m/s while a wind blows due east at 30 m/s. What is the plane's speed relative to the ground?",
    value: 202.2,
    tolerance: 0.5,
    unit: "m/s",
    explanation:
      "|v| = √(200² + 30²) = √40900 ≈ 202.2 m/s.",
  },

  // --- Lesson 10 — oscillations (simple harmonic motion) ---------------------
  {
    id: "bank-10-easy-1",
    topicId: "lesson-10-oscillations",
    difficulty: "easy",
    type: "multipleChoice",
    category: "conceptual",
    prompt: "The relationship that defines simple harmonic motion is:",
    options: [
      { id: "a", label: "a = −ω²·x" },
      { id: "b", label: "a = ω²·x" },
      { id: "c", label: "v = ω·x" },
      { id: "d", label: "a = constant" },
    ],
    correctOptionId: "a",
    explanation:
      "In SHM the acceleration is proportional to displacement and oppositely directed: a = −ω²·x (a restoring acceleration).",
  },
  {
    id: "bank-10-easy-2",
    topicId: "lesson-10-oscillations",
    difficulty: "easy",
    type: "numeric",
    category: "calculation",
    prompt: "An oscillator has angular frequency ω = 5 rad/s. What is its period?",
    value: 1.26,
    tolerance: 0.05,
    unit: "s",
    explanation: "T = 2π/ω = 2π/5 ≈ 1.26 s.",
  },
  {
    id: "bank-10-medium-1",
    topicId: "lesson-10-oscillations",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "A mass oscillates as x(t) = 0.2·cos(5t) (SI units). What is its maximum speed?",
    value: 1,
    tolerance: 0.05,
    unit: "m/s",
    explanation: "Maximum speed = Aω = 0.2 × 5 = 1.0 m/s.",
  },
  {
    id: "bank-10-medium-2",
    topicId: "lesson-10-oscillations",
    difficulty: "medium",
    type: "numeric",
    category: "calculation",
    prompt:
      "An object oscillates as x(t) = 0.1·cos(4t) (SI units). What is its maximum acceleration?",
    value: 1.6,
    tolerance: 0.05,
    unit: "m/s²",
    explanation: "Maximum acceleration = Aω² = 0.1 × 4² = 0.1 × 16 = 1.6 m/s².",
  },
  {
    id: "bank-10-hard-1",
    topicId: "lesson-10-oscillations",
    difficulty: "hard",
    type: "numeric",
    category: "calculation",
    prompt:
      "An object oscillates as x(t) = 0.05·cos(10t) (SI units). What is the magnitude of its maximum acceleration?",
    value: 5,
    tolerance: 0.1,
    unit: "m/s²",
    explanation: "Maximum acceleration = Aω² = 0.05 × 10² = 0.05 × 100 = 5 m/s².",
  },
  {
    id: "bank-10-hard-2",
    topicId: "lesson-10-oscillations",
    difficulty: "hard",
    type: "multipleChoice",
    category: "conceptual",
    prompt:
      "For a simple harmonic oscillator x = A·cos(ωt), the object moves fastest:",
    options: [
      { id: "a", label: "As it passes through the center (x = 0)" },
      { id: "b", label: "At the extremes (x = ±A)" },
      { id: "c", label: "At constant speed everywhere" },
      { id: "d", label: "Only at the very start of the motion" },
    ],
    correctOptionId: "a",
    explanation:
      "Speed |v| = Aω·|sin(ωt)| peaks at the center crossings and falls to zero at the turning points (x = ±A).",
  },
];

export function bankQuestions(): BankQuestion[] {
  return BANK;
}

export function questionsByDifficulty(d: BankDifficulty): BankQuestion[] {
  return BANK.filter((q) => q.difficulty === d);
}

/**
 * Returns a random question of the given difficulty, avoiding ids in `exclude`
 * when possible. `rng` is injectable for deterministic tests.
 */
export function getRandomQuestion(
  d: BankDifficulty,
  exclude: string[] = [],
  rng: () => number = Math.random,
): BankQuestion | undefined {
  const all = questionsByDifficulty(d);
  if (all.length === 0) return undefined;
  const pool = all.filter((q) => !exclude.includes(q.id));
  const arr = pool.length > 0 ? pool : all;
  return arr[Math.floor(rng() * arr.length)];
}
