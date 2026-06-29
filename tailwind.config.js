/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#0b1220",
        brand: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#b8dbff",
          300: "#85c2ff",
          400: "#4a9fff",
          500: "#1f7aff",
          600: "#0a5fe6",
          700: "#0a4cb4",
          800: "#0e418f",
          900: "#123a73",
        },
        // "Velocity-trail" violet, paired with brand blue for the motion gradient.
        accent: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "rise-in": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        flicker: {
          "0%, 100%": { transform: "scale(1) rotate(-2deg)" },
          "50%": { transform: "scale(1.08) rotate(2deg)" },
        },
        "podium-rise": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "score-pop": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "pop-in": "pop-in 150ms ease-out",
        "rise-in": "rise-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both",
        flicker: "flicker 1.8s ease-in-out infinite",
        "podium-rise": "podium-rise 600ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "score-pop": "score-pop 400ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
