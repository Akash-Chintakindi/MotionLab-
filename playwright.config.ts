import { defineConfig, devices } from "@playwright/test";

// Emulators are started by the `npm run e2e` script via `firebase emulators:exec`.
// Playwright itself only needs to boot the Vite dev server.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "line" : [["html", { open: "never" }], ["list"]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    // Force emulator config for e2e. Vite normally lets `.env.local` override
    // `.env`, and this repo sometimes uses `.env.local` for live Firebase dev.
    // Inline env vars have higher priority and keep test users out of prod Auth.
    command:
      "VITE_FIREBASE_API_KEY=demo-api-key VITE_FIREBASE_AUTH_DOMAIN=demo-motionlab.firebaseapp.com VITE_FIREBASE_PROJECT_ID=demo-motionlab VITE_FIREBASE_STORAGE_BUCKET=demo-motionlab.appspot.com VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000 VITE_FIREBASE_APP_ID=1:000000000000:web:demomotionlab VITE_USE_FIREBASE_EMULATORS=true npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
