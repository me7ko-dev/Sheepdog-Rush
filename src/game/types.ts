import type { StringKey } from '../i18n/en';

export type Vec = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Circle = { x: number; y: number; r: number };
export type Side = 'top' | 'bottom' | 'left' | 'right';

/** The pen (кошара): a fenced rectangle with an opening (gate) on one side. */
export type PenDef = Rect & { gate: Side; gateSize: number };

/** Everything that describes one level. Levels live in levels.ts. */
export type LevelDef = {
  id: number;
  nameKey: StringKey;
  sheepCount: number;
  /** Area where sheep appear at the start. */
  sheepArea: Rect;
  dogStart: Vec;
  pen: PenDef;
  fences: Rect[];
  bushes: Circle[];
  /** Water blocks everyone. Bridges are walkable rectangles placed across the water. */
  water: Rect[];
  bridges: Rect[];
  /** Seconds before the level is lost. */
  timeLimit: number;
  /** Finish within [3-star time, 2-star time] seconds. Slower = 1 star. */
  starTimes: [number, number];
  /** Seed for the random sheep positions and grass decoration. */
  seed: number;
};

export type Sheep = {
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

export type Effect = { x: number; y: number; age: number };

export type GameStatus = 'playing' | 'won' | 'lost';

export type World = {
  level: LevelDef;
  sheep: Sheep[];
  dog: Dog;
  /** Where the finger is (or was last). The dog runs there. */
  target: Vec | null;
  touching: boolean;
  /** Solid rectangles: level fences, pen walls and bridge rails. */
  walls: Rect[];
  /** Water that blocks (bridges already cut out). */
  water: Rect[];
  penInner: Rect;
  /** Timer starts on the first touch. */
  started: boolean;
  elapsed: number;
  /** Total time including before start, used for animations. */
  clock: number;
  status: GameStatus;
  effects: Effect[];
  rng: () => number;
};

export type GameEvent = { type: 'penned' } | { type: 'won' } | { type: 'lost' };
