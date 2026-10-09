import { ClipOp, createPicture, Skia, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';

import { FENCE_THICKNESS, WORLD_H, WORLD_W } from '../constants';
import { makeRng } from '../math';
import type { Circle, LevelDef, Rect } from '../types';
import { bridgeIsVertical, bridgeRails, penInnerRect, penWalls } from '../world';
import { fill, oval, roundRect, stroke } from './paint';

export const COLORS = {
  outside: '#5DAE45',
  grass: '#8CD867',
  grassLight: '#9BE077',
  tuft: '#5FB548',
  border: '#4E9A3A',
  bank: '#DCC789',
  water: '#4FC3F7',
  waterLight: '#9BE0FB',
  wood: '#C98A4B',
  woodDark: '#7A4A1F',
  post: '#8B5A2B',
  straw: '#F2DFA0',
  strawDark: '#DDBF68',
  bush: '#2E8B3A',
  bushMid: '#43A84B',
  bushLight: '#6CC56A',
};

/** How the 360x600 world is placed on the actual screen. */
export type ViewTransform = { width: number; height: number; scale: number; offsetX: number; offsetY: number };

export function computeView(width: number, height: number): ViewTransform {
  const scale = Math.min(width / WORLD_W, height / WORLD_H);
  return {
    width,
    height,
    scale,
    offsetX: (width - WORLD_W * scale) / 2,
    offsetY: (height - WORLD_H * scale) / 2,
  };
}

/** Draws everything that never moves: grass, flowers, river, pen, bushes, fences. */
export function createBackground(level: LevelDef, view: ViewTransform): SkPicture {
  return createPicture((c) => {
    c.drawRect(Skia.XYWHRect(0, 0, view.width, view.height), fill(COLORS.outside));
    c.save();
    c.translate(view.offsetX, view.offsetY);
    c.scale(view.scale, view.scale);

    const field = Skia.RRectXY(Skia.XYWHRect(0, 0, WORLD_W, WORLD_H), 18, 18);
    c.save();
    c.clipRRect(field, ClipOp.Intersect, true);
    c.drawRect(Skia.XYWHRect(0, 0, WORLD_W, WORLD_H), fill(COLORS.grass));
    drawGrassDecor(c, level.seed);
    for (const w of level.water) drawWater(c, w, level.seed);
    for (const b of level.bridges) drawBridge(c, b, bridgeIsVertical(level, b));
    for (const r of bridgeRails(level)) drawRail(c, r);
    drawPenFloor(c, penInnerRect(level.pen));
    for (const b of level.bushes) drawBush(c, b);
    for (const f of level.fences) drawFence(c, f);
    for (const f of penWalls(level.pen)) drawFence(c, f);
    c.restore();
    c.drawRRect(field, stroke(COLORS.border, 4));

    c.restore();
  }, Skia.XYWHRect(0, 0, view.width, view.height));
}

function drawGrassDecor(c: SkCanvas, seed: number) {
  const rng = makeRng(seed * 7 + 1);
  for (let i = 0; i < 14; i++) {
    oval(c, rng() * WORLD_W, rng() * WORLD_H, 60 + rng() * 80, 30 + rng() * 40, fill(COLORS.grassLight, 0.7));
  }
  const tuft = stroke(COLORS.tuft, 1.6);
  for (let i = 0; i < 90; i++) {
    const x = rng() * WORLD_W;
    const y = rng() * WORLD_H;
    const p = Skia.PathBuilder.Make();
    p.moveTo(x - 3, y - 4);
    p.lineTo(x - 1, y + 1);
    p.moveTo(x, y - 6);
    p.lineTo(x, y + 1);
    p.moveTo(x + 3, y - 4);
    p.lineTo(x + 1, y + 1);
    c.drawPath(p.detach(), tuft);
  }
  const petals = ['#FFFFFF', '#FFE066', '#FF9AA2', '#D7A6F0'];
  for (let i = 0; i < 28; i++) {
    const x = rng() * WORLD_W;
    const y = rng() * WORLD_H;
    const color = petals[Math.floor(rng() * petals.length)];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      c.drawCircle(x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4, 1.9, fill(color));
    }
    c.drawCircle(x, y, 1.4, fill('#FFB300'));
  }
}

function drawWater(c: SkCanvas, w: Rect, seed: number) {
  roundRect(c, w.x - 5, w.y - 5, w.w + 10, w.h + 10, 8, fill(COLORS.bank));
  roundRect(c, w.x, w.y, w.w, w.h, 6, fill(COLORS.water));
  roundRect(c, w.x + 4, w.y + w.h * 0.3, w.w - 8, w.h * 0.4, 6, fill(COLORS.waterLight, 0.35));
  const rng = makeRng(seed * 13 + 5);
  const wave = stroke('#FFFFFF', 1.6, 0.75);
  const count = Math.max(3, Math.floor((w.w * w.h) / 900));
  for (let i = 0; i < count; i++) {
    const x = w.x + 8 + rng() * (w.w - 16);
    const y = w.y + 8 + rng() * (w.h - 16);
    const p = Skia.PathBuilder.Make();
    p.moveTo(x - 6, y);
    p.quadTo(x - 3, y - 3, x, y);
    p.quadTo(x + 3, y + 3, x + 6, y);
    c.drawPath(p.detach(), wave);
  }
}

function drawRail(c: SkCanvas, r: Rect) {
  const vertical = r.h >= r.w;
  const x = vertical ? r.x - 1 : r.x - 4;
  const y = vertical ? r.y - 4 : r.y - 1;
  const w = vertical ? r.w + 2 : r.w + 8;
  const h = vertical ? r.h + 8 : r.h + 2;
  roundRect(c, x, y, w, h, 2, fill(COLORS.woodDark));
}

function drawBridge(c: SkCanvas, b: Rect, vertical: boolean) {
  roundRect(c, b.x + 2, b.y + 3, b.w, b.h, 4, fill('#000000', 0.15));
  roundRect(c, b.x, b.y, b.w, b.h, 4, fill(COLORS.wood));
  const plank = stroke(COLORS.woodDark, 1.2, 0.7);
  if (vertical) {
    for (let y = b.y + 7; y < b.y + b.h - 2; y += 7) c.drawLine(b.x + 2, y, b.x + b.w - 2, y, plank);
  } else {
    for (let x = b.x + 7; x < b.x + b.w - 2; x += 7) c.drawLine(x, b.y + 2, x, b.y + b.h - 2, plank);
  }
}

function drawPenFloor(c: SkCanvas, r: Rect) {
  c.drawRect(Skia.XYWHRect(r.x, r.y, r.w, r.h), fill(COLORS.straw));
  const rng = makeRng(99);
  const straw = stroke(COLORS.strawDark, 1.2);
  for (let i = 0; i < 30; i++) {
    const x = r.x + 4 + rng() * (r.w - 8);
    const y = r.y + 4 + rng() * (r.h - 8);
    const a = rng() * Math.PI;
    c.drawLine(x, y, x + Math.cos(a) * 5, y + Math.sin(a) * 5, straw);
  }
}

function drawBush(c: SkCanvas, b: Circle) {
  c.drawCircle(b.x + 3, b.y + 4, b.r, fill('#000000', 0.15));
  const puffs: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + b.x;
    puffs.push([b.x + Math.cos(a) * b.r * 0.45, b.y + Math.sin(a) * b.r * 0.45]);
  }
  for (const [x, y] of puffs) c.drawCircle(x, y, b.r * 0.6, fill(COLORS.bush));
  c.drawCircle(b.x, b.y, b.r * 0.62, fill(COLORS.bush));
  for (const [x, y] of puffs) c.drawCircle(x - b.r * 0.08, y - b.r * 0.1, b.r * 0.42, fill(COLORS.bushMid));
  c.drawCircle(b.x - b.r * 0.25, b.y - b.r * 0.3, b.r * 0.3, fill(COLORS.bushLight));
  const rng = makeRng(Math.floor(b.x * 31 + b.y));
  for (let k = 0; k < 4; k++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * b.r * 0.7;
    c.drawCircle(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 1.8, fill('#E53950'));
  }
}

function drawFence(c: SkCanvas, r: Rect) {
  const horizontal = r.w >= r.h;
  roundRect(c, r.x + 1.5, r.y + 2.5, r.w, r.h, 3, fill('#000000', 0.15));
  roundRect(c, r.x, r.y, r.w, r.h, 3, fill(COLORS.wood));
  roundRect(c, r.x, r.y, r.w, r.h, 3, stroke(COLORS.woodDark, 1.2));
  const size = FENCE_THICKNESS + 3;
  const length = horizontal ? r.w : r.h;
  const count = Math.max(1, Math.round(length / 20));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const cx = horizontal ? r.x + t * r.w : r.x + r.w / 2;
    const cy = horizontal ? r.y + r.h / 2 : r.y + t * r.h;
    const x = Math.min(Math.max(cx - size / 2, r.x - 1.5), r.x + r.w - size + 1.5);
    const y = Math.min(Math.max(cy - size / 2, r.y - 1.5), r.y + r.h - size + 1.5);
    roundRect(c, x, y, size, size, 2, fill(COLORS.post));
    roundRect(c, x + 1.5, y + 1.5, size - 3, size - 3, 1.5, fill('#A06A36'));
  }
}
