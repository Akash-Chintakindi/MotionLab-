// Procedural Web Audio engine for the arcade games: original music loops + SFX,
// no audio files (zero licensing concerns). Everything is synthesized live.
//
// Usage: call `resumeAudio()` from a user gesture (e.g. a "Start" click), then
// `startMusic(POOL_TRACK)` / `playSfx("ballClack")`. `stopMusic()` on unmount.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let muted = false;
let musicTimer: ReturnType<typeof setInterval> | null = null;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.16; // music sits under the SFX
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);
  }
  return ctx;
}

/** Must be called from a user gesture before any sound will play. */
export function resumeAudio(): void {
  const c = ensure();
  if (c && c.state === "suspended") void c.resume();
}

export function setMuted(m: boolean): void {
  muted = m;
  if (master) master.gain.value = m ? 0 : 1;
}

export function isMuted(): boolean {
  return muted;
}

// ---- SFX -----------------------------------------------------------------

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  glideTo?: number,
): void {
  const c = ensure();
  if (!c || !sfxBus) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(sfxBus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain: number, filterFreq: number, hp = false): void {
  const c = ensure();
  if (!c || !sfxBus) return;
  const t0 = c.currentTime;
  const frames = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = hp ? "highpass" : "lowpass";
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(sfxBus);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export type SfxName =
  // pool
  | "cueHit"
  | "ballClack"
  | "pocket"
  | "rail"
  | "rackBreak"
  // basketball
  | "shoot"
  | "swish"
  | "rim"
  | "buzzer"
  | "cheer"
  // cannon
  | "cannonFire"
  | "explosion"
  | "shieldBreak"
  | "shieldUp"
  | "victory"
  | "defeat"
  // shared / UI
  | "click"
  | "correct"
  | "wrong"
  | "countdown";

export function playSfx(name: SfxName): void {
  if (muted) return;
  switch (name) {
    case "cueHit":
      noise(0.05, 0.5, 2600, true);
      tone(180, 0.08, "square", 0.25, 90);
      break;
    case "ballClack":
      noise(0.04, 0.4, 4000, true);
      tone(420, 0.05, "triangle", 0.25, 300);
      break;
    case "pocket":
      tone(300, 0.18, "sine", 0.35, 120);
      noise(0.12, 0.2, 800);
      break;
    case "rail":
      noise(0.05, 0.25, 1500);
      break;
    case "rackBreak":
      // The cue smashing the rack: a punchy thud plus a scatter of clacks.
      noise(0.09, 0.6, 3200, true);
      tone(150, 0.12, "square", 0.3, 70);
      noise(0.22, 0.35, 5200, true);
      break;
    case "shoot":
      tone(300, 0.18, "triangle", 0.3, 600);
      break;
    case "swish":
      noise(0.22, 0.3, 5000, true);
      break;
    case "rim":
      tone(220, 0.06, "square", 0.3, 180);
      tone(330, 0.05, "square", 0.2, 280);
      break;
    case "buzzer":
      tone(160, 0.6, "sawtooth", 0.4);
      break;
    case "cheer":
      noise(0.5, 0.18, 3000, true);
      tone(660, 0.4, "sine", 0.12, 990);
      break;
    case "cannonFire":
      noise(0.16, 0.6, 900);
      tone(140, 0.22, "sawtooth", 0.4, 50);
      break;
    case "explosion":
      noise(0.4, 0.7, 1400);
      tone(90, 0.4, "sawtooth", 0.45, 40);
      tone(200, 0.18, "square", 0.2, 60);
      break;
    case "shieldBreak":
      noise(0.18, 0.4, 6000, true);
      tone(900, 0.12, "triangle", 0.3, 300);
      tone(500, 0.16, "square", 0.2, 180);
      break;
    case "shieldUp":
      tone(420, 0.18, "sine", 0.3, 840);
      tone(660, 0.2, "sine", 0.2, 990);
      break;
    case "victory":
      tone(523.25, 0.16, "square", 0.3);
      tone(659.25, 0.16, "square", 0.3);
      tone(783.99, 0.32, "square", 0.32);
      break;
    case "defeat":
      tone(330, 0.3, "sawtooth", 0.3, 160);
      tone(220, 0.45, "sawtooth", 0.3, 90);
      break;
    case "click":
      tone(700, 0.04, "square", 0.2);
      break;
    case "correct":
      tone(660, 0.1, "sine", 0.3);
      tone(880, 0.14, "sine", 0.3);
      break;
    case "wrong":
      tone(200, 0.22, "sawtooth", 0.3, 120);
      break;
    case "countdown":
      tone(520, 0.1, "square", 0.25);
      break;
  }
}

// ---- Music ---------------------------------------------------------------

export interface MusicNote {
  /** Step index within the loop (16ths). */
  step: number;
  freq: number;
  /** Duration in steps. */
  len: number;
  type: OscillatorType;
  gain?: number;
}

export interface MusicTrack {
  name: string;
  bpm: number;
  /** Total steps in the loop (16th notes). */
  steps: number;
  notes: MusicNote[];
}

function scheduleNote(n: MusicNote, time: number, stepDur: number): void {
  const c = ensure();
  if (!c || !musicBus) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  const dur = n.len * stepDur;
  const peak = n.gain ?? 0.3;
  osc.type = n.type;
  osc.frequency.setValueAtTime(n.freq, time);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(peak, time + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.95);
  osc.connect(g).connect(musicBus);
  osc.start(time);
  osc.stop(time + dur + 0.02);
}

export function startMusic(track: MusicTrack): void {
  const c = ensure();
  if (!c || !musicBus) return;
  stopMusic();
  const stepDur = 60 / track.bpm / 4; // 16th notes
  let nextStep = 0;
  let nextTime = c.currentTime + 0.12;
  const lookahead = 0.12;
  musicTimer = setInterval(() => {
    if (!c) return;
    while (nextTime < c.currentTime + lookahead) {
      const s = nextStep % track.steps;
      for (const n of track.notes) {
        if (n.step === s) scheduleNote(n, nextTime, stepDur);
      }
      nextTime += stepDur;
      nextStep += 1;
    }
  }, 25);
}

export function stopMusic(): void {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

// Note frequencies (Hz)
const N = {
  C2: 65.41, E2: 82.41, G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25,
};

/** Pool: cool, loungey walking-bass groove. */
export const POOL_TRACK: MusicTrack = {
  name: "pool",
  bpm: 96,
  steps: 32,
  notes: [
    // walking bass (A minor feel)
    { step: 0, freq: N.A2, len: 2, type: "triangle", gain: 0.34 },
    { step: 4, freq: N.C3, len: 2, type: "triangle", gain: 0.32 },
    { step: 8, freq: N.E3, len: 2, type: "triangle", gain: 0.32 },
    { step: 12, freq: N.D3, len: 2, type: "triangle", gain: 0.32 },
    { step: 16, freq: N.G2, len: 2, type: "triangle", gain: 0.34 },
    { step: 20, freq: N.B2, len: 2, type: "triangle", gain: 0.32 },
    { step: 24, freq: N.D3, len: 2, type: "triangle", gain: 0.32 },
    { step: 28, freq: N.E3, len: 2, type: "triangle", gain: 0.32 },
    // soft lead stabs
    { step: 2, freq: N.E4, len: 1, type: "sine", gain: 0.18 },
    { step: 10, freq: N.G4, len: 1, type: "sine", gain: 0.18 },
    { step: 18, freq: N.D4, len: 1, type: "sine", gain: 0.18 },
    { step: 26, freq: N.B4, len: 1, type: "sine", gain: 0.16 },
  ],
};

/** Basketball: energetic, driving arcade pulse. */
export const BASKETBALL_TRACK: MusicTrack = {
  name: "basketball",
  bpm: 140,
  steps: 16,
  notes: [
    // pumping bass on every beat
    { step: 0, freq: N.C3, len: 1, type: "sawtooth", gain: 0.3 },
    { step: 4, freq: N.C3, len: 1, type: "sawtooth", gain: 0.3 },
    { step: 8, freq: N.G2, len: 1, type: "sawtooth", gain: 0.3 },
    { step: 12, freq: N.A2, len: 1, type: "sawtooth", gain: 0.3 },
    // off-beat bass
    { step: 2, freq: N.C3, len: 1, type: "sawtooth", gain: 0.18 },
    { step: 10, freq: N.G2, len: 1, type: "sawtooth", gain: 0.18 },
    // bright arpeggio lead
    { step: 0, freq: N.C5, len: 1, type: "square", gain: 0.14 },
    { step: 2, freq: N.E5, len: 1, type: "square", gain: 0.14 },
    { step: 4, freq: N.G4, len: 1, type: "square", gain: 0.14 },
    { step: 6, freq: N.C5, len: 1, type: "square", gain: 0.14 },
    { step: 8, freq: N.D5, len: 1, type: "square", gain: 0.14 },
    { step: 10, freq: N.G4, len: 1, type: "square", gain: 0.14 },
    { step: 12, freq: N.E5, len: 1, type: "square", gain: 0.14 },
    { step: 14, freq: N.C5, len: 1, type: "square", gain: 0.14 },
  ],
};

/** Cannon: a tense, martial duel march (D-minor feel). */
export const CANNON_TRACK: MusicTrack = {
  name: "cannon",
  bpm: 124,
  steps: 32,
  notes: [
    // marching low brass on the downbeats
    { step: 0, freq: N.D3, len: 2, type: "sawtooth", gain: 0.32 },
    { step: 8, freq: N.A2, len: 2, type: "sawtooth", gain: 0.3 },
    { step: 16, freq: N.B2, len: 2, type: "sawtooth", gain: 0.3 },
    { step: 24, freq: N.G2, len: 2, type: "sawtooth", gain: 0.32 },
    // snare-ish off-beat stabs
    { step: 4, freq: N.D3, len: 1, type: "square", gain: 0.16 },
    { step: 12, freq: N.A2, len: 1, type: "square", gain: 0.16 },
    { step: 20, freq: N.B2, len: 1, type: "square", gain: 0.16 },
    { step: 28, freq: N.G2, len: 1, type: "square", gain: 0.16 },
    // somber bugle lead
    { step: 0, freq: N.D4, len: 3, type: "triangle", gain: 0.18 },
    { step: 6, freq: N.F4, len: 2, type: "triangle", gain: 0.16 },
    { step: 10, freq: N.A4, len: 3, type: "triangle", gain: 0.18 },
    { step: 16, freq: N.G4, len: 3, type: "triangle", gain: 0.16 },
    { step: 22, freq: N.F4, len: 2, type: "triangle", gain: 0.16 },
    { step: 26, freq: N.D4, len: 4, type: "triangle", gain: 0.18 },
  ],
};
