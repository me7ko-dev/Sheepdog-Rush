import { BARN_DEPTH, FENCE_THICKNESS, SHEEP_R } from './constants';
import { makeRng, pointInRect } from './math';
import type { LevelDef, PenDef, Rect, Sheep, World } from './types';

/** The pen walls: four sides, with a gap (the gate) in one of them. */
export function penWalls(pen: PenDef): Rect[] {
  const T = FENCE_THICKNESS;
  const sides: Record<string, Rect> = {
    top: { x: pen.x, y: pen.y, w: pen.w, h: T },
    bottom: { x: pen.x, y: pen.y + pen.h - T, w: pen.w, h: T },
    left: { x: pen.x, y: pen.y, w: T, h: pen.h },
    right: { x: pen.x + pen.w - T, y: pen.y, w: T, h: pen.h },
  };
  const walls: Rect[] = [];
  for (const [side, r] of Object.entries(sides)) {
    if (side !== pen.gate) {
      walls.push(r);
      continue;
    }
    if (r.w > r.h) {
      const piece = (r.w - pen.gateSize) / 2;
      walls.push({ x: r.x, y: r.y, w: piece, h: r.h });
      walls.push({ x: r.x + r.w - piece, y: r.y, w: piece, h: r.h });
    } else {
      const piece = (r.h - pen.gateSize) / 2;
      walls.push({ x: r.x, y: r.y, w: r.w, h: piece });
      walls.push({ x: r.x, y: r.y + r.h - piece, w: r.w, h: piece });
    }
  }
  return walls;
}

export const RAIL = 4;

function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}

/** Rectangle `a` with rectangle `b` cut out of it (up to 4 pieces). */
function subtract(a: Rect, b: Rect): Rect[] {
  const i = intersect(a, b);
  if (!i) return [a];
  const pieces: Rect[] = [
    { x: a.x, y: a.y, w: a.w, h: i.y - a.y },
    { x: a.x, y: i.y + i.h, w: a.w, h: a.y + a.h - (i.y + i.h) },
    { x: a.x, y: i.y, w: i.x - a.x, h: i.h },
    { x: i.x + i.w, y: i.y, w: a.x + a.w - (i.x + i.w), h: i.h },
  ];
  return pieces.filter((r) => r.w > 0.5 && r.h > 0.5);
}

/** Water with the bridges cut out: this is what blocks sheep and the dog. */
export function solidWater(level: LevelDef): Rect[] {
  let pieces = level.water;
  for (const b of level.bridges) pieces = pieces.flatMap((w) => subtract(w, b));
  return pieces;
}

/** True when the bridge is crossed up/down (the river it spans runs left-right). */
export function bridgeIsVertical(level: LevelDef, b: Rect): boolean {
  const river = level.water.find((w) => intersect(w, b));
  return river ? river.w >= river.h : b.h >= b.w;
}

/** Side rails of a bridge (only over the water), so nobody falls in from the side. */
export function bridgeRails(level: LevelDef): Rect[] {
  const rails: Rect[] = [];
  for (const b of level.bridges) {
    const sides: Rect[] = bridgeIsVertical(level, b)
      ? [
          { x: b.x, y: b.y, w: RAIL, h: b.h },
          { x: b.x + b.w - RAIL, y: b.y, w: RAIL, h: b.h },
        ]
      : [
          { x: b.x, y: b.y, w: b.w, h: RAIL },
          { x: b.x, y: b.y + b.h - RAIL, w: b.w, h: RAIL },
        ];
    for (const side of sides) {
      for (const w of level.water) {
        const part = intersect(side, w);
        if (part) rails.push(part);
      }
    }
  }
  return rails;
}

/** The barn stands right behind the pen wall opposite the gate, doors facing the yard. */
export function barnRect(pen: PenDef): Rect {
  const D = BARN_DEPTH;
  switch (pen.gate) {
    case 'bottom': {
      const w = pen.w * 0.86;
      return { x: pen.x + (pen.w - w) / 2, y: pen.y - D, w, h: D };
    }
    case 'top': {
      const w = pen.w * 0.86;
      return { x: pen.x + (pen.w - w) / 2, y: pen.y + pen.h, w, h: D };
    }
    case 'left': {
      const h = pen.h * 0.86;
      return { x: pen.x + pen.w, y: pen.y + (pen.h - h) / 2, w: D, h };
    }
    case 'right': {
      const h = pen.h * 0.86;
      return { x: pen.x - D, y: pen.y + (pen.h - h) / 2, w: D, h };
    }
  }
}

export function penInnerRect(pen: PenDef): Rect {
  const T = FENCE_THICKNESS;
  return { x: pen.x + T, y: pen.y + T, w: pen.w - 2 * T, h: pen.h - 2 * T };
}

export function createWorld(level: LevelDef): World {
  const rng = makeRng(level.seed);
  const walls = [...level.fences, ...penWalls(level.pen), barnRect(level.pen), ...bridgeRails(level)];
  const water = solidWater(level);
  const circles = [...level.bushes, ...level.rocks, ...level.hay];

  const blocked = (x: number, y: number) => {
    const pad = SHEEP_R + 4;
    const near = (r: Rect) => pointInRect(x, y, { x: r.x - pad, y: r.y - pad, w: r.w + 2 * pad, h: r.h + 2 * pad });
    return walls.some(near) || water.some(near) || circles.some((b) => Math.hypot(x - b.x, y - b.y) < b.r + pad);
  };

  const sheep: Sheep[] = [];
  const area = level.sheepArea;
  for (let i = 0; i < level.sheepCount; i++) {
    let x = area.x + area.w / 2;
    let y = area.y + area.h / 2;
    for (let tries = 0; tries < 200; tries++) {
      const cx = area.x + rng() * area.w;
      const cy = area.y + rng() * area.h;
      const tooClose = sheep.some((s) => Math.hypot(s.x - cx, s.y - cy) < SHEEP_R * 2 + 6);
      if (!tooClose && !blocked(cx, cy)) {
        x = cx;
        y = cy;
        break;
      }
    }
    sheep.push({
      id: i,
      black: false,
      x,
      y,
      vx: 0,
      vy: 0,
      heading: rng() * Math.PI * 2,
      panic: 0,
      wander: rng() * Math.PI * 2,
      phase: rng() * 4,
      penned: false,
      goal: { x, y },
    });
  }

  // Pick which sheep are black (spread through the flock).
  const order = sheep.map((_, i) => i).sort(() => rng() - 0.5);
  for (let i = 0; i < Math.min(level.blackSheep, sheep.length); i++) sheep[order[i]].black = true;

  const wolf = level.wolf
    ? {
        x: level.wolf.x,
        y: level.wolf.y,
        vx: 0,
        vy: 0,
        heading: 0,
        phase: 0,
        active: false,
        fleeing: 0,
        appearAt: level.wolf.delay,
      }
    : null;

  return {
    level,
    size: level.size,
    sheep,
    wolf,
    dog: {
      x: level.dogStart.x,
      y: level.dogStart.y,
      vx: 0,
      vy: 0,
      heading: -Math.PI / 2,
      phase: 0,
    },
    target: null,
    touching: false,
    walls,
    circles,
    water,
    penInner: penInnerRect(level.pen),
    started: false,
    elapsed: 0,
    clock: 0,
    status: 'playing',
    loseReason: null,
    effects: [],
    rng,
  };
}

export function starsForTime(level: LevelDef, seconds: number): number {
  if (seconds <= level.starTimes[0]) return 3;
  if (seconds <= level.starTimes[1]) return 2;
  return 1;
}
