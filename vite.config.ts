/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("firebase") || id.includes("@firebase")) {
              return "firebase";
            }
            if (
              id.includes("react") ||
              id.includes("scheduler") ||
              id.includes("react-router")
            ) {
              return "react";
            }
          }
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    exclude: [
      "e2e/**",
      "e2e-smoke/**",
      "**/node_modules/**",
      "functions/**",
      ".tools/**",
      "src/**/*.integration.test.ts",
    ],
  },
});
