import type { Rect } from './types';

/** Small deterministic random generator, so a level always looks the same. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Turns angle `from` towards `to` by at most `maxStep` radians. */
export function turnTowards(from: number, to: number, maxStep: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return to;
  return from + Math.sign(diff) * maxStep;
}

/**
 * Pushes a circle out of a rectangle. Returns the push direction (normal) or null
 * when they don't touch. `body` is changed in place.
 */
export function pushCircleOutOfRect(
  body: { x: number; y: number },
  radius: number,
  r: Rect,
): { nx: number; ny: number } | null {
  const cx = clamp(body.x, r.x, r.x + r.w);
  const cy = clamp(body.y, r.y, r.y + r.h);
  const dx = body.x - cx;
  const dy = body.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return null;

  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    const nx = dx / d;
    const ny = dy / d;
    body.x = cx + nx * radius;
    body.y = cy + ny * radius;
    return { nx, ny };
  }

  // Center is inside the rectangle: leave through the closest side.
  const left = body.x - r.x;
  const right = r.x + r.w - body.x;
  const top = body.y - r.y;
  const bottom = r.y + r.h - body.y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) {
    body.x = r.x - radius;
    return { nx: -1, ny: 0 };
  }
  if (m === right) {
    body.x = r.x + r.w + radius;
    return { nx: 1, ny: 0 };
  }
  if (m === top) {
    body.y = r.y - radius;
    return { nx: 0, ny: -1 };
  }
  body.y = r.y + r.h + radius;
  return { nx: 0, ny: 1 };
}

/** Pushes a circle out of another (fixed) circle. */
export function pushCircleOutOfCircle(
  body: { x: number; y: number },
  radius: number,
  cx: number,
  cy: number,
  cr: number,
): { nx: number; ny: number } | null {
  const dx = body.x - cx;
  const dy = body.y - cy;
  const min = radius + cr;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min) return null;
  const d = Math.sqrt(d2) || 0.001;
  const nx = d2 > 0 ? dx / d : 1;
  const ny = d2 > 0 ? dy / d : 0;
  body.x = cx + nx * min;
  body.y = cy + ny * min;
  return { nx, ny };
}
