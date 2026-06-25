import { useEffect, useRef } from "react";

/**
 * Runs `callback(dtSeconds)` on every animation frame while `running` is true.
 * `dt` is clamped so a backgrounded tab doesn't produce a huge jump.
 */
export function useGameLoop(
  callback: (dtSeconds: number) => void,
  running: boolean,
): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cbRef.current(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}
