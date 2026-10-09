import {
  DOG_MAX_SPEED,
  DOG_R,
  DOG_RESPONSE,
  FEAR_FORCE,
  FEAR_RADIUS,
  NEIGHBOR_RADIUS,
  SEPARATION_RADIUS,
  SHEEP_CALM_SPEED,
  SHEEP_PANIC_SPEED,
  SHEEP_R,
  WORLD_H,
  WORLD_W,
} from './constants';
import { clamp, pointInRect, pushCircleOutOfCircle, pushCircleOutOfRect, turnTowards } from './math';
import type { GameEvent, Sheep, World } from './types';
import { starsForTime } from './world';

const EFFECT_LIFETIME = 0.9;

/** Advances the game by `dt` seconds. Returns what happened (for sounds, vibration, end screen). */
export function stepWorld(world: World, dt: number): GameEvent[] {
  const events: GameEvent[] = [];
  world.clock += dt;
  if (world.started && world.status === 'playing') world.elapsed += dt;

  updateDog(world, dt);
  for (const s of world.sheep) {
    if (s.penned) updatePennedSheep(world, s, dt);
    else updateFreeSheep(world, s, dt);
  }
  separateSheep(world);
  for (const s of world.sheep) {
    if (!s.penned) {
      collide(world, s, SHEEP_R);
    } else {
      clampInPen(world, s);
    }
    s.x = clamp(s.x, SHEEP_R, WORLD_W - SHEEP_R);
    s.y = clamp(s.y, SHEEP_R, WORLD_H - SHEEP_R);
  }

  // Did any sheep just walk into the pen?
  const inner = world.penInner;
  const inset = { x: inner.x + 2, y: inner.y + 2, w: inner.w - 4, h: inner.h - 4 };
  for (const s of world.sheep) {
    if (!s.penned && pointInRect(s.x, s.y, inset)) {
      s.penned = true;
      s.panic = 0;
      s.goal = randomPenPoint(world);
      world.effects.push({ x: s.x, y: s.y, age: 0 });
      events.push({ type: 'penned' });
    }
  }

  for (const e of world.effects) e.age += dt;
  world.effects = world.effects.filter((e) => e.age < EFFECT_LIFETIME);

  if (world.status === 'playing') {
    if (world.sheep.every((s) => s.penned)) {
      world.status = 'won';
      events.push({ type: 'won' });
    } else if (world.elapsed >= world.level.timeLimit) {
      world.elapsed = world.level.timeLimit;
      world.status = 'lost';
      events.push({ type: 'lost' });
    }
  }
  return events;
}

export function resultStars(world: World): number {
  return world.status === 'won' ? starsForTime(world.level, world.elapsed) : 0;
}

function updateDog(world: World, dt: number) {
  const dog = world.dog;
  let wantX = 0;
  let wantY = 0;
  if (world.target && world.status === 'playing') {
    const dx = world.target.x - dog.x;
    const dy = world.target.y - dog.y;
    const d = Math.hypot(dx, dy);
    if (d > 3) {
      // Slow down when close to the finger, so the dog doesn't overshoot.
      const speed = DOG_MAX_SPEED * Math.min(1, d / 45);
      wantX = (dx / d) * speed;
      wantY = (dy / d) * speed;
    }
  }
  const k = Math.min(1, dt * DOG_RESPONSE);
  dog.vx += (wantX - dog.vx) * k;
  dog.vy += (wantY - dog.vy) * k;
  dog.x += dog.vx * dt;
  dog.y += dog.vy * dt;
  collide(world, dog, DOG_R);
  dog.x = clamp(dog.x, DOG_R, WORLD_W - DOG_R);
  dog.y = clamp(dog.y, DOG_R, WORLD_H - DOG_R);

  const speed = Math.hypot(dog.vx, dog.vy);
  if (speed > 12) dog.heading = turnTowards(dog.heading, Math.atan2(dog.vy, dog.vx), dt * 12);
  dog.phase += speed * dt * 0.09;
}

function updateFreeSheep(world: World, s: Sheep, dt: number) {
  let ax = 0;
  let ay = 0;

  // 1. Run away from the dog.
  const dx = s.x - world.dog.x;
  const dy = s.y - world.dog.y;
  const dDog = Math.hypot(dx, dy) || 0.001;
  let fear = 0;
  if (dDog < FEAR_RADIUS) {
    fear = 1 - dDog / FEAR_RADIUS;
    ax += (dx / dDog) * fear * FEAR_FORCE;
    ay += (dy / dDog) * fear * FEAR_FORCE;
  }

  // 2. Flocking: stay together, match direction, don't bump.
  let count = 0;
  let cx = 0;
  let cy = 0;
  let avx = 0;
  let avy = 0;
  let sepX = 0;
  let sepY = 0;
  let neighborPanic = 0;
  for (const o of world.sheep) {
    if (o === s || o.penned) continue;
    const ox = s.x - o.x;
    const oy = s.y - o.y;
    const d = Math.hypot(ox, oy);
    if (d > NEIGHBOR_RADIUS || d < 0.001) continue;
    count++;
    cx += o.x;
    cy += o.y;
    avx += o.vx;
    avy += o.vy;
    if (o.panic > neighborPanic) neighborPanic = o.panic;
    if (d < SEPARATION_RADIUS) {
      const push = (SEPARATION_RADIUS - d) / SEPARATION_RADIUS;
      sepX += (ox / d) * push;
      sepY += (oy / d) * push;
    }
  }

  // Panic spreads through the flock, so they run together.
  s.panic = Math.max(s.panic - dt * 0.7, fear, neighborPanic * 0.55);

  if (count > 0) {
    const cohesion = 0.8 + s.panic * 2.2;
    ax += (cx / count - s.x) * cohesion;
    ay += (cy / count - s.y) * cohesion;
    const align = 0.6 + s.panic * 1.8;
    ax += (avx / count - s.vx) * align;
    ay += (avy / count - s.vy) * align;
  }
  ax += sepX * 520;
  ay += sepY * 520;

  // 3. Wander slowly while calm (grazing).
  s.wander += (world.rng() - 0.5) * dt * 5;
  const graze = (1 - s.panic) * (0.5 + 0.5 * Math.sin(world.clock * 0.7 + s.phase * 3));
  ax += Math.cos(s.wander) * 26 * graze;
  ay += Math.sin(s.wander) * 26 * graze;

  // 4. Keep away from the edges of the meadow.
  const m = 28;
  if (s.x < m) ax += (m - s.x) * 14;
  if (s.x > WORLD_W - m) ax -= (s.x - (WORLD_W - m)) * 14;
  if (s.y < m) ay += (m - s.y) * 14;
  if (s.y > WORLD_H - m) ay -= (s.y - (WORLD_H - m)) * 14;

  s.vx += ax * dt;
  s.vy += ay * dt;
  const damping = Math.exp(-dt * (1.4 + 1.8 * (1 - s.panic)));
  s.vx *= damping;
  s.vy *= damping;

  const maxSpeed = SHEEP_CALM_SPEED + (SHEEP_PANIC_SPEED - SHEEP_CALM_SPEED) * s.panic;
  const speed = Math.hypot(s.vx, s.vy);
  if (speed > maxSpeed) {
    s.vx = (s.vx / speed) * maxSpeed;
    s.vy = (s.vy / speed) * maxSpeed;
  }

  s.x += s.vx * dt;
  s.y += s.vy * dt;
  animateSheep(s, dt);
}

function updatePennedSheep(world: World, s: Sheep, dt: number) {
  const dx = s.goal.x - s.x;
  const dy = s.goal.y - s.y;
  const d = Math.hypot(dx, dy);
  if (d < 4 || world.rng() < dt * 0.15) {
    s.goal = randomPenPoint(world);
  }
  const speed = d > 4 ? 18 : 0;
  const k = Math.min(1, dt * 3);
  s.vx += ((d > 0 ? dx / d : 0) * speed - s.vx) * k;
  s.vy += ((d > 0 ? dy / d : 0) * speed - s.vy) * k;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  animateSheep(s, dt);
}

function animateSheep(s: Sheep, dt: number) {
  const speed = Math.hypot(s.vx, s.vy);
  if (speed > 6) s.heading = turnTowards(s.heading, Math.atan2(s.vy, s.vx), dt * 7);
  s.phase += speed * dt * 0.12;
}

function randomPenPoint(world: World) {
  const r = world.penInner;
  const pad = SHEEP_R + 3;
  return {
    x: r.x + pad + world.rng() * Math.max(1, r.w - pad * 2),
    y: r.y + pad + world.rng() * Math.max(1, r.h - pad * 2),
  };
}

function clampInPen(world: World, s: Sheep) {
  const r = world.penInner;
  s.x = clamp(s.x, r.x + SHEEP_R, r.x + r.w - SHEEP_R);
  s.y = clamp(s.y, r.y + SHEEP_R, r.y + r.h - SHEEP_R);
}

/** Sheep don't overlap each other. */
function separateSheep(world: World) {
  const list = world.sheep;
  const min = SHEEP_R * 2;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.penned !== b.penned) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.01;
      const push = (min - d) / 2;
      const nx = d2 > 0 ? dx / d : 1;
      const ny = d2 > 0 ? dy / d : 0;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
    }
  }
}

/** Keeps a body out of fences, bushes and water. Velocity slides along walls. */
function collide(world: World, body: { x: number; y: number; vx: number; vy: number }, radius: number) {
  const level = world.level;
  const slide = (n: { nx: number; ny: number } | null) => {
    if (!n) return;
    const vn = body.vx * n.nx + body.vy * n.ny;
    if (vn < 0) {
      body.vx -= vn * n.nx;
      body.vy -= vn * n.ny;
    }
  };

  for (const b of level.bushes) slide(pushCircleOutOfCircle(body, radius, b.x, b.y, b.r));

  for (const w of world.water) slide(pushCircleOutOfRect(body, radius, w));
  for (const w of world.walls) slide(pushCircleOutOfRect(body, radius, w));
}
