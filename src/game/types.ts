import type { StringKey } from '../i18n/en';

export type Vec = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Circle = { x: number; y: number; r: number };
export type Side = 'top' | 'bottom' | 'left' | 'right';

/** The barn yard (кошара): a fenced rectangle with an opening (gate) on one side.
 *  The barn itself stands right behind the side opposite the gate. */
export type PenDef = Rect & { gate: Side; gateSize: number };

/** Everything that describes one level. Levels live in levels.ts. */
export type LevelDef = {
  id: number;
  nameKey: StringKey;
  /** Size of the meadow in world units (20 units = 1 meter). */
  size: { w: number; h: number };
  sheepCount: number;
  /** How many of the sheep are black. Black sheep are stubborn loners. */
  blackSheep: number;
  /** Area where sheep appear at the start. */
  sheepArea: Rect;
  dogStart: Vec;
  pen: PenDef;
  fences: Rect[];
  bushes: Circle[];
  rocks: Circle[];
  hay: Circle[];
  /** Water blocks everyone. Bridges are walkable rectangles placed across the water. */
  water: Rect[];
  bridges: Rect[];
  /** A wolf runs in from (x, y) `delay` seconds after the start. */
  wolf?: { x: number; y: number; delay: number };
  /** Seconds before the level is lost. */
  timeLimit: number;
  /** Finish within [3-star time, 2-star time] seconds. Slower = 1 star. */
  starTimes: [number, number];
  /** Seed for the random sheep positions and decoration. */
  seed: number;
};

export type Sheep = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  /** 0 = calm, 1 = running in panic. */
  panic: number;
  wander: number;
  /** Walk animation phase. */
  phase: number;
  penned: boolean;
  black: boolean;
  goal: Vec;
};

export type Dog = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  phase: number;
};

export type Wolf = Dog & {
  active: boolean;
  /** Seconds left running away from the dog. */
  fleeing: number;
  appearAt: number;
};

export type Effect = { x: number; y: number; age: number };

export type GameStatus = 'playing' | 'won' | 'lost';
export type LoseReason = 'time' | 'wolf';

export type World = {
  level: LevelDef;
  size: { w: number; h: number };
  sheep: Sheep[];
  dog: Dog;
  wolf: Wolf | null;
  /** Where the finger is (or was last). The dog runs there. */
  target: Vec | null;
  touching: boolean;
  /** Solid rectangles: fences, pen walls, the barn and bridge rails. */
  walls: Rect[];
  /** Solid circles: bushes, rocks and hay bales. */
  circles: Circle[];
  /** Water that blocks (bridges already cut out). */
  water: Rect[];
  penInner: Rect;
  /** Timer starts on the first touch. */
  started: boolean;
  elapsed: number;
  /** Total time including before start, used for animations. */
  clock: number;
  status: GameStatus;
  loseReason: LoseReason | null;
  effects: Effect[];
  rng: () => number;
};

export type GameEvent =
  | { type: 'penned'; x: number; y: number; black: boolean }
  | { type: 'scared'; black: boolean }
  | { type: 'wolfScared' }
  | { type: 'wolf' }
  | { type: 'won' }
  | { type: 'lost'; reason: LoseReason };
