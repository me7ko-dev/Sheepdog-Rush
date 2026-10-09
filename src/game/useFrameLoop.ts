import { useEffect, useRef } from 'react';

/** Calls `onFrame(dt)` on every screen refresh while `active` is true. dt is in seconds. */
export function useFrameLoop(onFrame: (dt: number) => void, active: boolean) {
  const callback = useRef(onFrame);
  useEffect(() => {
    callback.current = onFrame;
  });

  useEffect(() => {
    if (!active) return;
    let id = 0;
    let last = 0;
    const tick = (now: number) => {
      // Cap the step so a hiccup doesn't make sheep jump through fences.
      const dt = last ? Math.min(0.033, (now - last) / 1000) : 0;
      last = now;
      if (dt > 0) callback.current(dt);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [active]);
}
