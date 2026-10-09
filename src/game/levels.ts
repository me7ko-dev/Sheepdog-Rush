import type { LevelDef } from './types';

// All levels. The field is 360 x 600 units: x grows to the right, y grows downwards.
// To add a level: copy one block, change the id and the numbers, and add its name in i18n.
// Tip: keep gaps between the pen/fences and the edge either tiny (< 18) or wide (> 40),
// otherwise sheep can hide in a corridor where the dog can't follow.
export const LEVELS: LevelDef[] = [
  {
    id: 1,
    nameKey: 'level_1',
    sheepCount: 3,
    sheepArea: { x: 110, y: 290, w: 140, h: 70 },
    dogStart: { x: 180, y: 530 },
    pen: { x: 120, y: 8, w: 120, h: 100, gate: 'bottom', gateSize: 60 },
    fences: [],
    bushes: [
      { x: 60, y: 200, r: 18 },
      { x: 305, y: 420, r: 20 },
    ],
    water: [],
    bridges: [],
    timeLimit: 60,
    starTimes: [18, 35],
    seed: 11,
  },
  {
    id: 2,
    nameKey: 'level_2',
    sheepCount: 5,
    sheepArea: { x: 80, y: 420, w: 200, h: 80 },
    dogStart: { x: 180, y: 565 },
    pen: { x: 242, y: 8, w: 110, h: 110, gate: 'left', gateSize: 60 },
    fences: [{ x: 200, y: 200, w: 160, h: 6 }],
    bushes: [
      { x: 80, y: 170, r: 24 },
      { x: 165, y: 290, r: 20 },
      { x: 300, y: 340, r: 26 },
      { x: 60, y: 330, r: 18 },
    ],
    water: [],
    bridges: [],
    timeLimit: 90,
    starTimes: [35, 55],
    seed: 23,
  },
  {
    id: 3,
    nameKey: 'level_3',
    sheepCount: 7,
    sheepArea: { x: 35, y: 400, w: 115, h: 120 },
    dogStart: { x: 300, y: 560 },
    pen: { x: 8, y: 8, w: 125, h: 110, gate: 'right', gateSize: 60 },
    fences: [{ x: 172, y: 360, w: 6, h: 110 }],
    bushes: [
      { x: 75, y: 560, r: 18 },
      { x: 300, y: 450, r: 20 },
      { x: 220, y: 190, r: 20 },
    ],
    water: [{ x: 0, y: 262, w: 360, h: 50 }],
    bridges: [{ x: 215, y: 250, w: 80, h: 74 }],
    timeLimit: 110,
    starTimes: [50, 80],
    seed: 37,
  },
];

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}
