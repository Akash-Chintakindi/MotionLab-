import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { todayISO } from "../lib/streak";
import {
  dailyBoardScore,
  generateSquadCode,
  normalizeSquadCode,
} from "../lib/squad";

export interface Squad {
  code: string;
  name: string;
  ownerUid?: string;
  createdAt?: number;
}

export interface SquadMember {
  uid: string;
  name: string;
  joinedAt: number;
}

export interface DailyBoardEntry {
  uid: string;
  name: string;
  correct: boolean;
  timeMs: number;
  score: number;
  answeredAt: number;
}

const MAX_NAME_LENGTH = 24;
function sanitizeName(name: string): string {
  const trimmed = (name ?? "").trim();
  return trimmed ? trimmed.slice(0, MAX_NAME_LENGTH) : "Anonymous";
}

const squadDoc = (code: string, fdb?: Firestore) =>
  doc(fdb ?? db, "squads", code);
const memberDoc = (code: string, uid: string, fdb?: Firestore) =>
  doc(fdb ?? db, "squads", code, "members", uid);
const membersCol = (code: string, fdb?: Firestore) =>
  collection(fdb ?? db, "squads", code, "members");
const mirrorDoc = (uid: string, code: string, fdb?: Firestore) =>
  doc(fdb ?? db, "users", uid, "squads", code);
const mirrorCol = (uid: string, fdb?: Firestore) =>
  collection(fdb ?? db, "users", uid, "squads");
const boardEntryDoc = (code: string, date: string, uid: string, fdb?: Firestore) =>
  doc(fdb ?? db, "squads", code, "dailyBoards", date, "entries", uid);
const boardEntriesCol = (code: string, date: string, fdb?: Firestore) =>
  collection(fdb ?? db, "squads", code, "dailyBoards", date, "entries");

/** Lists the signed-in user's squads (from the per-user mirror subcollection). */
export async function getMySquads(uid: string, fdb?: Firestore): Promise<Squad[]> {
  const snap = await getDocs(mirrorCol(uid, fdb));
  return snap.docs
    .map((d) => d.data() as Squad & { joinedAt?: number })
    .sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0));
}

/** Creates a new squad with a unique code; the creator joins it automatically. */
export async function createSquad(
  uid: string,
  displayName: string,
  squadName: string,
  fdb?: Firestore,
): Promise<Squad> {
  const name = squadName.trim().slice(0, 40) || "My Squad";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateSquadCode();
    const snap = await getDoc(squadDoc(code, fdb));
    if (snap.exists()) continue;
    const squad: Squad = { code, name, ownerUid: uid, createdAt: Date.now() };
    await setDoc(squadDoc(code, fdb), squad);
    await addMembership(uid, displayName, squad, fdb);
    return squad;
  }
  throw new Error("Couldn't generate a unique squad code. Please try again.");
}

/** Joins an existing squad by code. Throws if the code doesn't exist. */
export async function joinSquad(
  uid: string,
  displayName: string,
  rawCode: string,
  fdb?: Firestore,
): Promise<Squad> {
  const code = normalizeSquadCode(rawCode);
  const snap = await getDoc(squadDoc(code, fdb));
  if (!snap.exists()) {
    throw new Error("No squad found with that code.");
  }
  const squad = snap.data() as Squad;
  await addMembership(uid, displayName, squad, fdb);
  return squad;
}

async function addMembership(
  uid: string,
  displayName: string,
  squad: Squad,
  fdb?: Firestore,
): Promise<void> {
  const name = sanitizeName(displayName);
  await setDoc(memberDoc(squad.code, uid, fdb), {
    uid,
    name,
    joinedAt: Date.now(),
  });
  await setDoc(mirrorDoc(uid, squad.code, fdb), {
    code: squad.code,
    name: squad.name,
    joinedAt: Date.now(),
  });
}

/** Leaves a squad: removes the membership doc and the per-user mirror. */
export async function leaveSquad(
  uid: string,
  code: string,
  fdb?: Firestore,
): Promise<void> {
  await deleteDoc(memberDoc(code, uid, fdb));
  await deleteDoc(mirrorDoc(uid, code, fdb));
}

/** All members of a squad (for the roster / member count). */
export async function getSquadMembers(
  code: string,
  fdb?: Firestore,
): Promise<SquadMember[]> {
  const snap = await getDocs(membersCol(code, fdb));
  return snap.docs.map((d) => d.data() as SquadMember);
}

/**
 * Records the user's daily-question result onto every squad they belong to, so
 * each squad's board for `date` ranks members by correctness then speed. Called
 * (best-effort) when the daily question is answered.
 */
export async function recordDailyResultToSquads(
  uid: string,
  displayName: string,
  correct: boolean,
  timeMs: number,
  date: string = todayISO(),
  fdb?: Firestore,
): Promise<void> {
  const squads = await getMySquads(uid, fdb);
  if (squads.length === 0) return;
  const entry: DailyBoardEntry = {
    uid,
    name: sanitizeName(displayName),
    correct,
    timeMs: Math.max(0, Math.floor(timeMs)),
    score: dailyBoardScore(correct, timeMs),
    answeredAt: Date.now(),
  };
  await Promise.all(
    squads.map((s) => setDoc(boardEntryDoc(s.code, date, uid, fdb), entry)),
  );
}

/** Today's (or a given date's) daily-question board for a squad, best first. */
export async function getSquadDailyBoard(
  code: string,
  date: string = todayISO(),
  topN = 50,
  fdb?: Firestore,
): Promise<DailyBoardEntry[]> {
  const q = query(
    boardEntriesCol(code, date, fdb),
    orderBy("score", "desc"),
    limit(topN),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as DailyBoardEntry);
}
