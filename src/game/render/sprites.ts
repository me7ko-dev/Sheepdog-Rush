import { createPicture, Skia, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';

import { fill, oval, roundRect, stroke } from './paint';

// Sheep and dog are drawn once into small "pictures" (one per animation frame),
// then stamped many times per frame. This keeps the game smooth.
// Every sprite faces to the right (+x) and is centred on (0, 0).

export const WALK_FRAMES = 4;
const bounds = () => Skia.XYWHRect(-32, -32, 64, 64);

const WOOL = '#FFFFFF';
const WOOL_EDGE = '#D8CFC0';
const SHEEP_FACE = '#4A4248';
const DOG_BLACK = '#2A2A2E';

function legOffset(frame: number | null, i: number): number {
  if (frame === null) return 0;
  const diagonal = i === 0 || i === 3 ? 0 : Math.PI;
  return Math.sin((frame / WALK_FRAMES) * Math.PI * 2 + diagonal) * 2.6;
}

function drawSheep(c: SkCanvas, frame: number | null) {
  oval(c, 1, 3, 28, 21, fill('#000000', 0.16));

  const legs: [number, number][] = [
    [6, -7.5],
    [6, 7.5],
    [-6, -7.5],
    [-6, 7.5],
  ];
  legs.forEach(([x, y], i) => oval(c, x + legOffset(frame, i), y, 5, 3.6, fill(SHEEP_FACE)));

  const puffs: [number, number, number][] = [
    [-1, 0, 8.5],
    [5, -4, 4.6],
    [5, 4, 4.6],
    [-1, -6, 4.8],
    [-1, 6, 4.8],
    [-7, -4, 4.6],
    [-7, 4, 4.6],
    [-9.5, 0, 4.2],
    [2, 0, 6],
  ];
  for (const [x, y, r] of puffs) c.drawCircle(x, y, r + 1.2, fill(WOOL_EDGE));
  for (const [x, y, r] of puffs) c.drawCircle(x, y, r, fill(WOOL));
  oval(c, -3, 3, 10, 6, fill('#EFE8DC'));
  c.drawCircle(-3, -3, 2.2, fill('#FFFFFF'));

  // Head
  oval(c, 10, -6.2, 6, 3.6, fill(SHEEP_FACE));
  oval(c, 10, 6.2, 6, 3.6, fill(SHEEP_FACE));
  oval(c, 10.5, -6.2, 3, 1.8, fill('#F4A7B9'));
  oval(c, 10.5, 6.2, 3, 1.8, fill('#F4A7B9'));
  oval(c, 13, 0, 11.5, 9.6, fill(SHEEP_FACE));
  c.drawCircle(9, 0, 3.4, fill(WOOL));
  for (const side of [-1, 1]) {
    c.drawCircle(14.6, side * 2.4, 1.8, fill('#FFFFFF'));
    c.drawCircle(15.2, side * 2.4, 0.95, fill('#111111'));
  }
  oval(c, 17.6, 0, 2.2, 3.4, fill('#F4A7B9', 0.9));
}

function drawDog(c: SkCanvas, frame: number | null) {
  oval(c, 0, 3, 34, 20, fill('#000000', 0.16));

  const legs: [number, number][] = [
    [7, -6.5],
    [7, 6.5],
    [-7, -6.5],
    [-7, 6.5],
  ];
  legs.forEach(([x, y], i) => oval(c, x + legOffset(frame, i) * 1.3, y, 6, 3.6, fill(DOG_BLACK)));
  legs.forEach(([x, y], i) => c.drawCircle(x + legOffset(frame, i) * 1.3 + 2.4, y, 1.4, fill('#FFFFFF')));

  oval(c, -2, 0, 25, 14.5, fill(DOG_BLACK));
  oval(c, -5, -2, 10, 4, fill('#45454C'));
  oval(c, 6.5, 0, 8, 15.5, fill('#FFFFFF'));
  roundRect(c, 7.4, -6, 3, 12, 1.5, fill('#E53935'));
  c.drawCircle(10.5, 4.2, 1.3, fill('#FFC107'));

  // Head
  oval(c, 10.5, -6.3, 5.5, 4.4, fill(DOG_BLACK));
  oval(c, 10.5, 6.3, 5.5, 4.4, fill(DOG_BLACK));
  c.drawCircle(13, 0, 6.6, fill(DOG_BLACK));
  oval(c, 15, 0, 9, 3.2, fill('#FFFFFF'));
  oval(c, 18.5, 0, 6.5, 6, fill('#FFFFFF'));
  c.drawCircle(21.4, 0, 1.7, fill('#1A1A1A'));
  if (frame !== null) oval(c, 20.5, 3.4, 4, 2.8, fill('#FF7FA0'));
  for (const side of [-1, 1]) {
    c.drawCircle(14.6, side * 3.1, 1.5, fill('#FFFFFF'));
    c.drawCircle(15.1, side * 3.1, 0.85, fill('#111111'));
  }
}

let sheepFrames: SkPicture[] | null = null;
let sheepIdle: SkPicture | null = null;
let dogFrames: SkPicture[] | null = null;
let dogIdle: SkPicture | null = null;

function frames(draw: (c: SkCanvas, f: number | null) => void): SkPicture[] {
  return Array.from({ length: WALK_FRAMES }, (_, f) => createPicture((c) => draw(c, f), bounds()));
}

export function sheepSprite(frame: number | null): SkPicture {
  if (!sheepFrames) sheepFrames = frames(drawSheep);
  if (!sheepIdle) sheepIdle = createPicture((c) => drawSheep(c, null), bounds());
  return frame === null ? sheepIdle : sheepFrames[frame % WALK_FRAMES];
}

export function dogSprite(frame: number | null): SkPicture {
  if (!dogFrames) dogFrames = frames(drawDog);
  if (!dogIdle) dogIdle = createPicture((c) => drawDog(c, null), bounds());
  return frame === null ? dogIdle : dogFrames[frame % WALK_FRAMES];
}

/** The dog's tail is drawn live so it can wag smoothly. */
export function drawDogTail(c: SkCanvas, wag: number) {
  const tipY = Math.sin(wag) * 6;
  const p = Skia.PathBuilder.Make();
  p.moveTo(-12, 0);
  p.quadTo(-17, tipY * 0.3, -22, tipY);
  c.drawPath(p.detach(), stroke(DOG_BLACK, 4.5));
  c.drawCircle(-22, tipY, 2.4, fill('#FFFFFF'));
}
