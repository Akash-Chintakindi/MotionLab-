import type { Lesson } from "../../types/content";

export const lesson5: Lesson = {
  id: "lesson-5-two-dimensions",
  title: "Motion in Two Dimensions",
  subtitle: "2D motion is two linked 1D motions.",
  order: 5,
  estimatedMinutes: 10,
  coreIdea: "2D motion is two linked 1D motions along x and y.",
  steps: [
    {
      id: "l5-concept",
      type: "concept",
      prompt: "Vectors in two dimensions",
      interactionConfig: {
        formula: "r = (x, y)   v = dr/dt   a = dv/dt",
        body: [
          "In 2D, position, velocity, and acceleration are vectors with x and y components.",
          "Each component behaves like its own 1D motion. The same calculus applies to x and y separately.",
          "The velocity vector is always tangent to the path; the acceleration vector points toward how the velocity is changing.",
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
      id: "l5-independent",
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
        correct: "Right — split the motion into independent x and y problems.",
        incorrect:
          "Each component is its own 1D motion; you solve x and y separately and combine.",
        hint: "Think about how we treat horizontal and vertical motion separately.",
      },
    },
    {
      id: "l5-speed",
      type: "numeric",
      prompt:
        "An object's velocity has a horizontal component of 3 m/s and a vertical component of 4 m/s. (These are v_x and v_y — the x- and y-parts of the velocity.) What is its speed, the magnitude of v?",
      interactionConfig: { unit: "m/s", tolerance: 0.1, placeholder: "m/s" },
      correctAnswer: { value: 5 },
      feedback: {
        correct:
          "Correct — speed = √(horizontal² + vertical²) = √(3² + 4²) = 5 m/s.",
        incorrect: "Combine the components with the Pythagorean theorem.",
        hint: "speed = √(horizontal² + vertical²) = √(v_x² + v_y²).",
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
        hint: "Watch the red acceleration arrow in the simulation.",
      },
    },
    {
      id: "l5-apply",
      type: "multipleChoice",
      prompt:
        "If the horizontal velocity component (v_x) stays constant while the vertical component (v_y) changes over time, the acceleration is…",
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
        hint: "a_x = d(v_x)/dt and a_y = d(v_y)/dt. Which one is nonzero?",
      },
    },
  ],
};
