# MotionLab — AP Physics C Kinematics: Motion Through Calculus

A Brilliant-inspired, learn-by-doing web app that teaches AP Physics C
kinematics through interactive graphs, simulations, and instant feedback.

- **Frontend:** Vite + React + TypeScript + Tailwind CSS
- **Backend:** Firebase Authentication + Cloud Firestore
- **Graphs:** custom SVG primitives (touch-first, real-time)
- **Testing:** Vitest + React Testing Library (unit/component), Firebase
  emulator integration tests, Playwright (mobile e2e)

Lesson content is hand-authored and version-controlled in
[`src/content`](src/content). Firestore stores only user progress.

## Prerequisites

- Node 20+ (developed on Node 24)
- A Java runtime for the Firestore emulator. A portable JDK is auto-installed
  to `.tools/` during setup; the emulator scripts point `JAVA_HOME` at it.

## Install

```bash
npm install
```

## Local development

Everything runs against the local Firebase Emulator Suite using the demo
project `demo-motionlab`, so **no `firebase login` is required**.

Run the app and emulators together:

```bash
npm run dev:all
```

- App: http://localhost:5173
- Emulator UI (inspect Auth users + Firestore data): http://localhost:4000

Or run them separately in two terminals:

```bash
npm run emulators
npm run dev
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run emulators` | Firebase Auth + Firestore + Hosting emulators |
| `npm run dev:all` | Both of the above, together |
| `npm test` | Unit + component tests (Vitest) |
| `npm run test:integration` | Service tests against the Firestore emulator |
| `npm run e2e` | Playwright mobile e2e (boots emulators + dev server) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run smoke` | Build, then Playwright-test the built bundle via `vite preview` |
| `npm run deploy` | Build + deploy Hosting, Firestore rules & indexes (needs auth) |

For e2e the first time, install the browser: `npx playwright install chromium`.

## Phase 1 manual test checklist

1. `npm run dev:all`, open http://localhost:5173.
2. Create an account (display name + email + password). You land on the
   course dashboard greeting you by name.
3. Lesson 1 is unlocked; Lessons 2–7 are locked with a prerequisite note.
4. Open **Lesson 1**:
   - Drag the dot on the position-time graph and watch the tangent line and
     velocity readout update live.
   - Answer the hook question wrong to see specific feedback, then correct it.
   - Tap the region of greatest velocity, shrink Δt on the secant step, sort
     points by velocity sign, and finish the application question.
5. Refresh the page mid-lesson — you resume on the same step.
6. Finish the lesson — you see a mastery result, your streak, and Lesson 2
   unlocks.
7. Open the Emulator UI (http://localhost:4000) and confirm the documents
   under `users/{uid}` reflect your progress.
8. Try it at a phone width (DevTools device toolbar) — layout and touch
   interactions are first-class.

## Deploying to production (Phase 6)

All development uses emulators, so this is the only step that needs a real
Firebase project. Because `firebase login` is misbehaving on this machine, do
the project creation in the **web Console** and use a CLI token only for the
final deploy.

### 1. Create the project + enable services (web Console)

1. Go to https://console.firebase.google.com and click **Add project**. Name it
   (e.g. `motionlab`) and finish the wizard.
2. **Build -> Authentication -> Get started -> Sign-in method ->** enable
   **Email/Password**.
3. **Build -> Firestore Database -> Create database ->** start in **production
   mode**, pick a region. (Our `firestore.rules` will be deployed over the
   default.)
4. **Project settings (gear icon) -> General -> Your apps -> Web (</>)**:
   register an app (no Hosting checkbox needed) and copy the `firebaseConfig`
   values.

### 2. Wire the config locally

```bash
cp .env.production.example .env.production
# paste your real values into .env.production (VITE_USE_FIREBASE_EMULATORS=false)
```

Point the CLI at your project (replace the id):

```bash
npx firebase-tools use --add   # choose your project, or:
# edit .firebaserc and set "default" to your real project id
```

### 3. Get a CLI token (works around the broken `firebase login`)

The normal `firebase login` fails because of its localhost callback. Use either:

```bash
# Option A: paste-a-code login (no localhost callback)
npx firebase-tools login --no-localhost

# Option B: mint a CI token for non-interactive deploys
npx firebase-tools login:ci
```

Both open a browser where you approve access and paste a code back. `login:ci`
prints a token you can reuse: `export FIREBASE_TOKEN=...`.

### 4. Deploy

```bash
npm run deploy
# or, with a token:
npm run build && npx firebase-tools deploy \
  --only hosting,firestore:rules,firestore:indexes --token "$FIREBASE_TOKEN"
```

The CLI prints your public Hosting URL. Verify with the Phase 6 checklist:
open the URL on a phone, create 2-3 accounts, complete a lesson, and confirm it
loads quickly and stays smooth. (`npm run smoke` validates the built bundle
locally beforehand.)

## Project structure

```
src/
  content/        hand-authored course + lessons (canonical)
  types/          content + Firestore progress types
  lib/            firebase init, curve math, streak logic
  services/       Firestore progress read/write
  auth/           AuthProvider, auth page, route guard
  hooks/          useProgress
  components/      app shell, course UI, graph, steps, feedback
  pages/          dashboard + lesson player
e2e/              Playwright specs
```
