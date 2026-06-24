import { defineConfig, devices } from "@playwright/test";

// Smoke-tests the production build (dist/) served by `vite preview`.
// Emulators are started by the `npm run smoke` script via `emulators:exec`.
export default defineConfig({
  testDir: "./e2e-smoke",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
