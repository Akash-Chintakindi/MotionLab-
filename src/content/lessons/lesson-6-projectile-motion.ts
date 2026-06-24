import type { Lesson } from "../../types/content";

export const lesson6: Lesson = {
  id: "lesson-6-projectile-motion",
  title: "Projectile Motion",
  subtitle: "Horizontal and vertical motion are independent.",
  order: 6,
  estimatedMinutes: 11,
  coreIdea: "Horizontal and vertical motion are independent.",
  steps: [
    {
      id: "l6-concept",
      type: "concept",
      prompt: "Two motions at once",
      interactionConfig: {
        formula: "x = (v cosθ) t    y = (v sinθ) t − ½ g t²",
        body: [
          "A projectile has constant horizontal velocity and constant vertical acceleration (gravity).",
          "The two motions are independent: horizontal distance grows steadily while vertical motion rises, slows, and falls.",
          "Splitting the launch velocity into components is the key first step.",
        ],
      },
      correctAnswer: null,
      feedback: { correct: "", incorrect: "" },
    },
    {
      id: "l6-sim",
      type: "sliderSimulation",
      prompt:
        "Launch projectiles. Change the angle and speed and watch the trajectory, time of flight, peak height, and range.",
      interactionConfig: {
        scenario: "projectile",
        a: 45,
        v0: 20,
      },
      correctAnswer: null,
      feedback: {
        correct:
          "Range is largest near 45°. Steeper launches go higher but not as far.",
        incorrect: "",
      },
    },
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
        correct: "Right — there is no horizontal force, so vx never changes.",
        incorrect:
          "Gravity acts only vertically, so it cannot change the horizontal velocity.",
        hint: "Which direction does gravity pull?",
      },
    },
    {
      id: "l6-component",
      type: "numeric",
      prompt:
        "A projectile is launched at 20 m/s at 30° above the horizontal. What is the initial VERTICAL velocity component?",
      interactionConfig: { unit: "m/s", tolerance: 0.3, placeholder: "m/s" },
      correctAnswer: { value: 10 },
      feedback: {
        correct: "Correct — vy = v·sinθ = 20·sin30° = 10 m/s.",
        incorrect: "Use vy = v·sinθ.",
        hint: "sin30° = 0.5.",
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
          "Yes — the object stops rising for an instant, so vy = 0 at the peak (horizontal velocity continues).",
        incorrect:
          "At the very top the object is momentarily not moving up or down, so vy = 0.",
        hint: "What must vy be the instant the object switches from rising to falling?",
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
        hint: "Range ∝ sin(2θ), which is largest when 2θ = 90°.",
      },
    },
  ],
};
