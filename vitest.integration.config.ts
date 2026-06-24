import { defineConfig } from "vitest/config";

// Integration tests talk to the Firebase emulators (started via
// `firebase emulators:exec`). Run with: npm run test:integration
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
  },
});
