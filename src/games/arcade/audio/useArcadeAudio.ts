import { useCallback, useEffect, useState } from "react";
import {
  isMuted,
  playSfx,
  resumeAudio,
  setMuted,
  startMusic,
  stopMusic,
  type MusicTrack,
  type SfxName,
} from "./audioEngine";

/**
 * React wrapper around the arcade audio engine. Stops music on unmount and
 * exposes a mute toggle. Call `start(track)` from a user gesture.
 */
export function useArcadeAudio() {
  const [muted, setMutedState] = useState<boolean>(isMuted());

  useEffect(() => () => stopMusic(), []);

  const start = useCallback((track: MusicTrack) => {
    resumeAudio();
    if (!isMuted()) startMusic(track);
  }, []);

  const stop = useCallback(() => stopMusic(), []);

  const sfx = useCallback((name: SfxName) => playSfx(name), []);

  const toggleMute = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    setMutedState(next);
    if (next) stopMusic();
  }, []);

  return { muted, toggleMute, start, stop, sfx, resumeAudio };
}
