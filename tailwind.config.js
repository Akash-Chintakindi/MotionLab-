/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
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
      },
      animation: {
        "pop-in": "pop-in 150ms ease-out",
      },
    },
  },
  plugins: [],
};
