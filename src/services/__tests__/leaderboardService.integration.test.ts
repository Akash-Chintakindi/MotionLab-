import { beforeAll, describe, expect, it } from "vitest";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getLeaderboard,
  recordLeaderboardScore,
} from "../leaderboardService";

let fdb: Firestore;
let auth: Auth;

beforeAll(() => {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId: "demo-motionlab" },
    "leaderboard-integration",
  );
  auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  fdb = getFirestore(app);
  connectFirestoreEmulator(fdb, "127.0.0.1", 8080);
});

/** Creates and signs in a fresh user, returning their real auth uid. */
async function freshUser(): Promise<string> {
  const email = `lb_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
  const cred = await createUserWithEmailAndPassword(auth, email, "password123");
  return cred.user.uid;
}

/** Unique game id per test so runs don't collide on shared leaderboards. */
function freshGameId(): string {
  return `game_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

describe("leaderboardService (emulator)", () => {
  it("upserts only the max score for a user", async () => {
    const uid = await freshUser();
    const gameId = freshGameId();

    await recordLeaderboardScore(uid, "Ada", gameId, 30, fdb);
    await recordLeaderboardScore(uid, "Ada", gameId, 10, fdb); // weaker — ignored

    const rows = await getLeaderboard(gameId, 20, fdb);
    expect(rows).toHaveLength(1);
    expect(rows[0].uid).toBe(uid);
    expect(rows[0].score).toBe(30);
    expect(rows[0].name).toBe("Ada");
  });

  it("raises the stored score when a better run arrives", async () => {
    const uid = await freshUser();
    const gameId = freshGameId();

    await recordLeaderboardScore(uid, "Ada", gameId, 10, fdb);
    await recordLeaderboardScore(uid, "Ada", gameId, 42, fdb);

    const rows = await getLeaderboard(gameId, 20, fdb);
    expect(rows[0].score).toBe(42);
  });

  it("returns entries sorted by score descending and respects topN", async () => {
    const gameId = freshGameId();
    const a = await freshUser();
    const b = await freshUser();
    const c = await freshUser();

    await recordLeaderboardScore(a, "A", gameId, 50, fdb);
    await recordLeaderboardScore(b, "B", gameId, 90, fdb);
    await recordLeaderboardScore(c, "C", gameId, 70, fdb);

    const top2 = await getLeaderboard(gameId, 2, fdb);
    expect(top2.map((r) => r.score)).toEqual([90, 70]);
    expect(top2.map((r) => r.name)).toEqual(["B", "C"]);
  });

  it("caps long names and falls back to Anonymous when blank", async () => {
    const uid = await freshUser();
    const gameId = freshGameId();

    await recordLeaderboardScore(uid, "   ", gameId, 5, fdb);
    let rows = await getLeaderboard(gameId, 20, fdb);
    expect(rows[0].name).toBe("Anonymous");

    const longName = "x".repeat(40);
    await recordLeaderboardScore(uid, longName, gameId, 6, fdb);
    rows = await getLeaderboard(gameId, 20, fdb);
    expect(rows[0].name).toHaveLength(24);
  });
});
