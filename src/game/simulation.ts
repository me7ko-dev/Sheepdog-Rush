import {
  BARK_COOLDOWN,
  BARK_RADIUS,
  BARK_WOLF_RADIUS,
  DOG_MAX_SPEED,
  DOG_R,
  DOG_RESPONSE,
  FEAR_FORCE,
  FEAR_RADIUS,
  MUD_SPEED,
  NEIGHBOR_RADIUS,
  SEPARATION_RADIUS,
  SHEEP_CALM_SPEED,
  SHEEP_PANIC_SPEED,
  SHEEP_R,
  SHEEP_WOLF_FEAR_RADIUS,
  WOLF_FLEE_SPEED,
  WOLF_FLEE_TIME,
  WOLF_R,
  WOLF_SCARED_RADIUS,
  WOLF_SPEED,
} from './constants';
import { clamp, pointInRect, pushCircleOutOfCircle, pushCircleOutOfRect, turnTowards } from './math';
import type { GameEvent, Sheep, Wolf, World } from './types';
import { starsForTime } from './world';

const EFFECT_LIFETIME = 1;

type Body = { x: number; y: number; vx: number; vy: number };

/** Advances the game by `dt` seconds. Returns what happened (for sounds, vibration, end screen). */
export function stepWorld(world: World, dt: number): GameEvent[] {
  const events: GameEvent[] = [];
  world.clock += dt;
  if (world.started && world.status === 'playing') world.elapsed += dt;
  world.barkCooldown = Math.max(0, world.barkCooldown - dt);
  for (const b of world.barks) b.age += dt;
  world.barks = world.barks.filter((b) => b.age < 0.8);

  updateDog(world, dt);
  if (world.wolf) updateWolf(world, world.wolf, dt, events);
  for (const s of world.sheep) {
    if (s.penned) {
      updatePennedSheep(world, s, dt);
    } else {
      const before = s.panic;
      updateFreeSheep(world, s, dt);
      if (before < 0.5 && s.panic >= 0.5) events.push({ type: 'scared', black: s.black });
    }
  }
  separateSheep(world);
  const { w, h } = world.size;
  for (const s of world.sheep) {
    if (!s.penned) collide(world, s, SHEEP_R);
    else clampInPen(world, s);
    s.x = clamp(s.x, SHEEP_R, w - SHEEP_R);
    s.y = clamp(s.y, SHEEP_R, h - SHEEP_R);
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
      events.push({ type: 'penned', x: s.x, y: s.y, black: s.black });
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
      lose(world, 'time', events);
    }
  }
  return events;
}

function lose(world: World, reason: 'time' | 'wolf', events: GameEvent[]) {
  if (world.status !== 'playing') return;
  world.status = 'lost';
  world.loseReason = reason;
  events.push({ type: 'lost', reason });
}

/** The finger is down at `p`: the dog runs there, and the timer starts. */
export function aimDog(world: World, p: { x: number; y: number }) {
  if (world.status !== 'playing') return;
  world.target = p;
  world.touching = true;
  world.started = true;
}

/**
 * The dog barks: every sheep nearby runs away at full speed and the wolf flees.
 * Returns false while the bark is still recharging.
 */
export function bark(world: World): boolean {
  if (world.status !== 'playing' || world.barkCooldown > 0) return false;
  world.barkCooldown = BARK_COOLDOWN;
  world.started = true;
  const dog = world.dog;
  world.barks.push({ x: dog.x, y: dog.y, age: 0 });
  for (const s of world.sheep) {
    if (s.penned) continue;
    const dx = s.x - dog.x;
    const dy = s.y - dog.y;
    const d = Math.hypot(dx, dy) || 0.001;
    if (d > BARK_RADIUS) continue;
    const push = SHEEP_PANIC_SPEED * (1 - (d / BARK_RADIUS) * 0.4);
    s.vx += (dx / d) * push;
    s.vy += (dy / d) * push;
    s.panic = 1;
  }
  const wolf = world.wolf;
  if (wolf?.active && Math.hypot(wolf.x - dog.x, wolf.y - dog.y) < BARK_WOLF_RADIUS) {
    wolf.fleeing = WOLF_FLEE_TIME * 1.5;
  }
  return true;
}

/** Everyone is slower in mud. */
function mudFactor(world: World, x: number, y: number): number {
  for (const m of world.mud) {
    if (Math.hypot(x - m.x, y - m.y) < m.r) return MUD_SPEED;
  }
  return 1;
}

/** The finger was lifted: the dog finishes running to the last point. */
export function releaseDog(world: World) {
  world.touching = false;
}

export function resultStars(world: World): number {
  return world.status === 'won' ? starsForTime(world.level, world.elapsed) : 0;
}

function steer(body: Body, wantX: number, wantY: number, response: number, dt: number) {
  const k = Math.min(1, dt * response);
  body.vx += (wantX - body.vx) * k;
  body.vy += (wantY - body.vy) * k;
  body.x += body.vx * dt;
  body.y += body.vy * dt;
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
      const speed = DOG_MAX_SPEED * Math.min(1, d / 45) * mudFactor(world, dog.x, dog.y);
      wantX = (dx / d) * speed;
      wantY = (dy / d) * speed;
    }
  }
  steer(dog, wantX, wantY, DOG_RESPONSE, dt);
  collide(world, dog, DOG_R);
  dog.x = clamp(dog.x, DOG_R, world.size.w - DOG_R);
  dog.y = clamp(dog.y, DOG_R, world.size.h - DOG_R);

  const speed = Math.hypot(dog.vx, dog.vy);
  if (speed > 12) dog.heading = turnTowards(dog.heading, Math.atan2(dog.vy, dog.vx), dt * 12);
  dog.phase += speed * dt * 0.09;
}

function updateWolf(world: World, wolf: Wolf, dt: number, events: GameEvent[]) {
  if (!wolf.active) {
    if (world.started && world.elapsed >= wolf.appearAt && world.status === 'playing') {
      wolf.active = true;
      events.push({ type: 'wolf' });
    }
    return;
  }

  const dog = world.dog;
  const ddx = wolf.x - dog.x;
  const ddy = wolf.y - dog.y;
  const dDog = Math.hypot(ddx, ddy) || 0.001;
  if (dDog < WOLF_SCARED_RADIUS) {
    if (wolf.fleeing <= 0) events.push({ type: 'wolfScared' });
    wolf.fleeing = WOLF_FLEE_TIME;
  }

  let wantX = 0;
  let wantY = 0;
  if (wolf.fleeing > 0) {
    wolf.fleeing -= dt;
    wantX = (ddx / dDog) * WOLF_FLEE_SPEED;
    wantY = (ddy / dDog) * WOLF_FLEE_SPEED;
  } else if (world.status === 'playing') {
    // Hunt the closest sheep that is still outside.
    let best: Sheep | null = null;
    let bestD = Infinity;
    for (const s of world.sheep) {
      if (s.penned) continue;
      const d = Math.hypot(s.x - wolf.x, s.y - wolf.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best) {
      wantX = ((best.x - wolf.x) / bestD) * WOLF_SPEED;
      wantY = ((best.y - wolf.y) / bestD) * WOLF_SPEED;
      if (bestD < SHEEP_R + WOLF_R - 1) lose(world, 'wolf', events);
    }
  }

  const wolfMud = mudFactor(world, wolf.x, wolf.y);
  steer(wolf, wantX * wolfMud, wantY * wolfMud, 5, dt);
  collide(world, wolf, WOLF_R);
  // The wolf never goes into the barn yard.
  const pen = world.level.pen;
  pushCircleOutOfRect(wolf, WOLF_R, pen);
  wolf.x = clamp(wolf.x, WOLF_R, world.size.w - WOLF_R);
  wolf.y = clamp(wolf.y, WOLF_R, world.size.h - WOLF_R);

  const speed = Math.hypot(wolf.vx, wolf.vy);
  if (speed > 10) wolf.heading = turnTowards(wolf.heading, Math.atan2(wolf.vy, wolf.vx), dt * 9);
  wolf.phase += speed * dt * 0.09;
}

function updateFreeSheep(world: World, s: Sheep, dt: number) {
  let ax = 0;
  let ay = 0;

  // 0. A scared sheep pinned in a corner dashes out sideways past the dog.
  const moved = Math.hypot(s.x - s.px, s.y - s.py) / Math.max(dt, 0.001);
  s.px = s.x;
  s.py = s.y;
  if (s.escape) {
    s.escape.t -= dt;
    if (s.escape.t <= 0) s.escape = null;
  } else if (s.panic > 0.4 && moved < 18) {
    s.stuck += dt;
    if (s.stuck > 0.7) {
      s.escape = findEscape(world, s);
      s.stuck = 0;
    }
  } else {
    s.stuck = Math.max(0, s.stuck - dt * 2);
  }

  // 1. Run away from the dog (and even more from the wolf).
  let fear = 0;
  const flee = (fx: number, fy: number, radius: number, force: number) => {
    const dx = s.x - fx;
    const dy = s.y - fy;
    const d = Math.hypot(dx, dy) || 0.001;
    if (d >= radius) return;
    const f = 1 - d / radius;
    ax += (dx / d) * f * force;
    ay += (dy / d) * f * force;
    if (f > fear) fear = f;
  };
  flee(world.dog.x, world.dog.y, FEAR_RADIUS, s.escape ? FEAR_FORCE * 0.15 : FEAR_FORCE);
  if (s.escape) {
    ax += s.escape.x * 900;
    ay += s.escape.y * 900;
  }
  const wolf = world.wolf;
  if (wolf && wolf.active) flee(wolf.x, wolf.y, SHEEP_WOLF_FEAR_RADIUS, FEAR_FORCE * 1.2);

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

  // Panic spreads through the flock, so they run together. Black sheep care less.
  const social = s.black ? 0.4 : 1;
  s.panic = Math.max(s.panic - dt * 0.7, fear, neighborPanic * 0.55 * social);

  if (count > 0) {
    const cohesion = (0.8 + s.panic * 2.2) * social;
    ax += (cx / count - s.x) * cohesion;
    ay += (cy / count - s.y) * cohesion;
    const align = (0.6 + s.panic * 1.8) * social;
    ax += (avx / count - s.vx) * align;
    ay += (avy / count - s.vy) * align;
  }
  ax += sepX * 520;
  ay += sepY * 520;

  // 3. Wander slowly while calm (grazing). Black sheep wander more.
  s.wander += (world.rng() - 0.5) * dt * 5;
  const graze = (1 - s.panic) * (0.5 + 0.5 * Math.sin(world.clock * 0.7 + s.phase * 3)) * (s.black ? 1.6 : 1);
  ax += Math.cos(s.wander) * 26 * graze;
  ay += Math.sin(s.wander) * 26 * graze;

  // 4. Don't push into fences, water and the meadow edge: slide along them instead
  //    (towards the rest of the flock when there is a choice).
  const towards = count > 0 ? { x: cx / count, y: cy / count } : null;
  [ax, ay] = slideAlongObstacles(world, s, ax, ay, towards);

  s.vx += ax * dt;
  s.vy += ay * dt;
  const damping = Math.exp(-dt * (1.4 + 1.8 * (1 - s.panic)));
  s.vx *= damping;
  s.vy *= damping;

  const maxSpeed = (SHEEP_CALM_SPEED + (SHEEP_PANIC_SPEED - SHEEP_CALM_SPEED) * s.panic) * mudFactor(world, s.x, s.y);
  const speed = Math.hypot(s.vx, s.vy);
  if (speed > maxSpeed) {
    s.vx = (s.vx / speed) * maxSpeed;
    s.vy = (s.vy / speed) * maxSpeed;
  }

  s.x += s.vx * dt;
  s.y += s.vy * dt;
  animateSheep(s, dt);
}

/** True if a sheep standing at (x, y) would bump into something. */
function blockedAt(world: World, x: number, y: number): boolean {
  const r = SHEEP_R + 2;
  if (x < r || y < r || x > world.size.w - r || y > world.size.h - r) return true;
  const inRect = (q: { x: number; y: number; w: number; h: number }) =>
    x > q.x - r && x < q.x + q.w + r && y > q.y - r && y < q.y + q.h + r;
  if (world.walls.some(inRect) || world.water.some(inRect)) return true;
  return world.circles.some((c) => Math.hypot(x - c.x, y - c.y) < c.r + r);
}

/** Picks the free direction that leads most away from the dog. */
function findEscape(world: World, s: Sheep): { x: number; y: number; t: number } | null {
  let awayX = s.x - world.dog.x;
  let awayY = s.y - world.dog.y;
  const d = Math.hypot(awayX, awayY) || 1;
  awayX /= d;
  awayY /= d;
  let best: { x: number; y: number; t: number } | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    if (blockedAt(world, s.x + dx * 16, s.y + dy * 16) || blockedAt(world, s.x + dx * 34, s.y + dy * 34)) continue;
    // Prefer going away from the dog, but never straight into it.
    const score = dx * awayX + dy * awayY;
    if (score > bestScore) {
      bestScore = score;
      best = { x: dx, y: dy, t: 0.7 };
    }
  }
  return best;
}

const AVOID_DIST = 18;

/**
 * Sheep feel walls before they touch them. When running into one, the part of the push that
 * goes into the wall is turned sideways, so sheep slide along fences instead of getting stuck.
 */
function slideAlongObstacles(
  world: World,
  s: Sheep,
  ax: number,
  ay: number,
  towards: { x: number; y: number } | null,
): [number, number] {
  const apply = (nx: number, ny: number, gap: number) => {
    if (gap >= AVOID_DIST) return;
    const closeness = 1 - Math.max(0, gap) / AVOID_DIST;
    const into = ax * nx + ay * ny;
    if (into < 0) {
      // Turn the "into the wall" part into a sideways push.
      const tx = -ny;
      const ty = nx;
      const side = ax * tx + ay * ty;
      let dir = s.id % 2 === 0 ? 1 : -1;
      if (Math.abs(side) > Math.abs(into) * 0.25) dir = Math.sign(side);
      else if (towards) {
        const flock = (towards.x - s.x) * tx + (towards.y - s.y) * ty;
        if (Math.abs(flock) > 3) dir = Math.sign(flock);
      }
      const amount = -into * closeness;
      ax += nx * amount + tx * dir * amount;
      ay += ny * amount + ty * dir * amount;
    }
    ax += nx * closeness * 120;
    ay += ny * closeness * 120;
  };

  const rectGap = (r: { x: number; y: number; w: number; h: number }) => {
    const cx = clamp(s.x, r.x, r.x + r.w);
    const cy = clamp(s.y, r.y, r.y + r.h);
    const dx = s.x - cx;
    const dy = s.y - cy;
    const d = Math.hypot(dx, dy);
    if (d < 0.001 || d - SHEEP_R >= AVOID_DIST) return;
    apply(dx / d, dy / d, d - SHEEP_R);
  };
  for (const r of world.walls) rectGap(r);
  for (const r of world.water) rectGap(r);
  for (const c of world.circles) {
    const dx = s.x - c.x;
    const dy = s.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) continue;
    apply(dx / d, dy / d, d - c.r - SHEEP_R);
  }
  const { w, h } = world.size;
  apply(1, 0, s.x - SHEEP_R);
  apply(-1, 0, w - s.x - SHEEP_R);
  apply(0, 1, s.y - SHEEP_R);
  apply(0, -1, h - s.y - SHEEP_R);
  return [ax, ay];
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

/** Keeps a body out of fences, bushes, rocks, the barn and water. Velocity slides along walls. */
function collide(world: World, body: Body, radius: number) {
  const slide = (n: { nx: number; ny: number } | null) => {
    if (!n) return;
    const vn = body.vx * n.nx + body.vy * n.ny;
    if (vn < 0) {
      body.vx -= vn * n.nx;
      body.vy -= vn * n.ny;
    }
  };
  for (const c of world.circles) slide(pushCircleOutOfCircle(body, radius, c.x, c.y, c.r));
  for (const w of world.water) slide(pushCircleOutOfRect(body, radius, w));
  for (const w of world.walls) slide(pushCircleOutOfRect(body, radius, w));
}
