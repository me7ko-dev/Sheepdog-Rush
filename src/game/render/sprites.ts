import { createPicture, Skia, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';

import { fill, oval } from './paint';

// A flat 2D sheep, drawn once into small "pictures" (one per walk frame).
// Used for the little sheep icon in the HUD. It faces right (+x), centred on (0, 0).

export const WALK_FRAMES = 4;
const bounds = () => Skia.XYWHRect(-32, -32, 64, 64);

const WOOL = '#FFFFFF';
const WOOL_EDGE = '#D8CFC0';
const SHEEP_FACE = '#4A4248';

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

let sheepFrames: SkPicture[] | null = null;
let sheepIdle: SkPicture | null = null;

function frames(draw: (c: SkCanvas, f: number | null) => void): SkPicture[] {
  return Array.from({ length: WALK_FRAMES }, (_, f) => createPicture((c) => draw(c, f), bounds()));
}

export function sheepSprite(frame: number | null): SkPicture {
  if (!sheepFrames) sheepFrames = frames(drawSheep);
  if (!sheepIdle) sheepIdle = createPicture((c) => drawSheep(c, null), bounds());
  return frame === null ? sheepIdle : sheepFrames[frame % WALK_FRAMES];
}
