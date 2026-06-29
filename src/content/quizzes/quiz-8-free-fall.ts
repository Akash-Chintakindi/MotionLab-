import type { Quiz } from "../../types/content";

// Original questions answerable from the Lesson 8 "Learn" sequence: free fall
// as constant-acceleration motion with a = −g, the dropped-from-rest results
// (v = g·t, y = ½·g·t²), the throw-up symmetry, and the peak misconception
// (v = 0 but a ≠ 0). g = 9.8 m/s² throughout.
export const quiz8: Quiz = {
  lessonId: "lesson-8-free-fall",
  questions: [
    {
      id: "q1",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "Ignoring air resistance, the acceleration of an object in free fall is:",
      options: [
        { id: "a", label: "A constant 9.8 m/s² directed downward" },
        { id: "b", label: "Zero" },
        { id: "c", label: "Larger for heavier objects" },
        { id: "d", label: "Larger the faster the object moves" },
      ],
      correctOptionId: "a",
      explanation:
        "Free fall is constant-acceleration motion: gravity gives every object the same 9.8 m/s² downward, regardless of mass or speed.",
    },
    {
      id: "q2",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "A ball is thrown straight up. At the highest point of its flight, its velocity and acceleration are:",
      options: [
        { id: "a", label: "Velocity 0; acceleration 9.8 m/s² downward" },
        { id: "b", label: "Both zero" },
        { id: "c", label: "Both 9.8 m/s² downward" },
        { id: "d", label: "Velocity maximum; acceleration zero" },
      ],
      correctOptionId: "a",
      explanation:
        "At the peak the velocity is momentarily zero, but gravity never stops, so the acceleration is still 9.8 m/s² downward.",
    },
    {
      id: "q3",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "Two balls of different mass are dropped from rest from the same height at the same instant (ignore air resistance). Which lands first?",
      options: [
        { id: "a", label: "The heavier ball" },
        { id: "b", label: "The lighter ball" },
        { id: "c", label: "They land at the same time" },
        { id: "d", label: "It depends on their shapes" },
      ],
      correctOptionId: "c",
      explanation:
        "Free-fall acceleration is independent of mass, so both fall identically and land together.",
    },
    {
      id: "q4",
      type: "numeric",
      category: "calculation",
      prompt:
        "A ball is dropped from rest. Using g = 9.8 m/s², what is its speed after 4 s? (m/s)",
      value: 39.2,
      tolerance: 0.2,
      unit: "m/s",
      placeholder: "m/s",
      explanation: "Dropped from rest, v = g·t = 9.8 × 4 = 39.2 m/s.",
    },
    {
      id: "q5",
      type: "numeric",
      category: "calculation",
      prompt:
        "How far does an object dropped from rest fall in 3 s? (g = 9.8 m/s²) (m)",
      value: 44.1,
      tolerance: 0.2,
      unit: "m",
      placeholder: "m",
      explanation: "y = ½·g·t² = ½ × 9.8 × 3² = ½ × 9.8 × 9 = 44.1 m.",
    },
    {
      id: "q6",
      type: "numeric",
      category: "calculation",
      prompt:
        "A ball is thrown straight up at 19.6 m/s (g = 9.8 m/s²). How long does it take to reach its highest point? (s)",
      value: 2,
      tolerance: 0.05,
      unit: "s",
      placeholder: "s",
      explanation: "At the peak v = 0: t = v₀/g = 19.6 / 9.8 = 2 s.",
    },
    {
      id: "q7",
      type: "numeric",
      category: "calculation",
      prompt:
        "A ball is thrown straight up at 24.5 m/s (g = 9.8 m/s²). What maximum height does it reach above the launch point? (m)",
      value: 30.6,
      tolerance: 0.3,
      unit: "m",
      placeholder: "m",
      explanation:
        "At the peak v = 0, so 0 = v₀² − 2gh → h = v₀²/(2g) = 24.5² / 19.6 = 600.25 / 19.6 ≈ 30.6 m.",
    },
    {
      id: "q8",
      type: "numeric",
      category: "calculation",
      prompt:
        "A stone dropped from rest strikes the ground at 28 m/s (g = 9.8 m/s²). From what height was it dropped? (m)",
      value: 40,
      tolerance: 0.5,
      unit: "m",
      placeholder: "m",
      explanation: "v² = 2gh → h = v²/(2g) = 28² / 19.6 = 784 / 19.6 = 40 m.",
    },
    {
      id: "q9",
      type: "multipleChoice",
      category: "conceptual",
      prompt:
        "A ball thrown straight up returns to its launch height. Ignoring air resistance, the time to rise compared with the time to fall is:",
      options: [
        { id: "a", label: "Equal" },
        { id: "b", label: "Longer going up" },
        { id: "c", label: "Longer coming down" },
        { id: "d", label: "Impossible to compare" },
      ],
      correctOptionId: "a",
      explanation:
        "The same constant gravity acts on both halves, so free fall is symmetric: rise time equals fall time and the return speed equals the launch speed.",
    },
  ],
};
