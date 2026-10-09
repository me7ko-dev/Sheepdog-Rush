import { createPicture, Skia, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';

import type { Side, World } from '../types';
import { fill, heart, stroke } from './paint';
import type { ViewTransform } from './scene';
import { dogSprite, drawDogTail, sheepSprite, WALK_FRAMES } from './sprites';

const RAD_TO_DEG = 180 / Math.PI;

/** Draws one frame of the game: background + everything that moves. */
export function renderFrame(world: World, view: ViewTransform, background: SkPicture): SkPicture {
  return createPicture((c) => {
    c.drawPicture(background);
    c.save();
    c.translate(view.offsetX, view.offsetY);
    c.scale(view.scale, view.scale);

    if (world.status === 'playing') drawGateArrow(c, world);
    if (world.touching && world.target) drawTarget(c, world.target.x, world.target.y, world.clock);

    // Draw from top to bottom so lower sheep overlap the ones behind them.
    const sheep = [...world.sheep].sort((a, b) => a.y - b.y);
    for (const s of sheep) {
      const speed = Math.hypot(s.vx, s.vy);
      const moving = speed > 6;
      const bob = moving ? 1 + Math.abs(Math.sin(s.phase * Math.PI)) * 0.05 : 1;
      c.save();
      c.translate(s.x, s.y);
      c.rotate(s.heading * RAD_TO_DEG, 0, 0);
      c.scale(bob, bob);
      c.drawPicture(sheepSprite(moving ? Math.floor(s.phase * WALK_FRAMES) : null));
      c.restore();
    }

    const dog = world.dog;
    const dogSpeed = Math.hypot(dog.vx, dog.vy);
    const running = dogSpeed > 10;
    c.save();
    c.translate(dog.x, dog.y);
    c.rotate(dog.heading * RAD_TO_DEG, 0, 0);
    drawDogTail(c, world.clock * (running ? 22 : 9));
    c.drawPicture(dogSprite(running ? Math.floor(dog.phase * WALK_FRAMES) : null));
    c.restore();

    for (const e of world.effects) drawPop(c, e.x, e.y, e.age);

    c.restore();
  }, Skia.XYWHRect(0, 0, view.width, view.height));
}

function drawTarget(c: SkCanvas, x: number, y: number, clock: number) {
  const pulse = 1 + Math.sin(clock * 10) * 0.12;
  c.drawCircle(x, y, 13 * pulse, stroke('#FFFFFF', 2.5, 0.8));
  c.drawCircle(x, y, 3, fill('#FFFFFF', 0.9));
}

const OUTWARD: Record<Side, [number, number]> = {
  top: [0, -1],
  bottom: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/** A friendly bouncing arrow in front of the pen gate. */
function drawGateArrow(c: SkCanvas, world: World) {
  const pen = world.level.pen;
  const [ox, oy] = OUTWARD[pen.gate];
  const gx = pen.x + pen.w / 2 + (ox * pen.w) / 2;
  const gy = pen.y + pen.h / 2 + (oy * pen.h) / 2;
  const dist = 20 + Math.sin(world.clock * 4) * 4;
  const ax = gx + ox * dist;
  const ay = gy + oy * dist;
  // Chevron pointing into the pen (direction -ox, -oy).
  const px = -oy;
  const py = ox;
  const p = Skia.PathBuilder.Make();
  p.moveTo(ax + ox * 6 + px * 9, ay + oy * 6 + py * 9);
  p.lineTo(ax - ox * 4, ay - oy * 4);
  p.lineTo(ax + ox * 6 - px * 9, ay + oy * 6 - py * 9);
  c.drawPath(p.detach(), stroke('#FFFFFF', 4.5, 0.85));
}

function drawPop(c: SkCanvas, x: number, y: number, age: number) {
  const t = age / 0.9;
  // Rounded values, so only a few paints get created (see paint.ts cache).
  const a = Math.round(Math.max(0, 1 - t) * 10) / 10;
  if (a <= 0) return;
  const width = Math.round((3 * (1 - t) + 0.5) * 2) / 2;
  c.drawCircle(x, y, 8 + t * 22, stroke('#FFFFFF', width, a));
  for (let i = 0; i < 3; i++) {
    const hx = x + (i - 1) * 10;
    const hy = y - 8 - t * 26 - (i === 1 ? 6 : 0);
    heart(c, hx, hy, 7, fill('#FF5C8A', a));
  }
}
