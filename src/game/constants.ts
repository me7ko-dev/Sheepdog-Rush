// Distances are in "world units": 20 units = 1 meter in the 3D scene.
export const UNITS_PER_METER = 20;

export const SHEEP_R = 9;
export const DOG_R = 10;
export const WOLF_R = 11;

export const DOG_MAX_SPEED = 210;
/** How quickly the dog reaches its wanted speed (bigger = snappier). */
export const DOG_RESPONSE = 9;

export const SHEEP_CALM_SPEED = 22;
export const SHEEP_PANIC_SPEED = 118;
/** Sheep start running when the dog is closer than this. */
export const FEAR_RADIUS = 95;
export const FEAR_FORCE = 950;
export const NEIGHBOR_RADIUS = 52;
export const SEPARATION_RADIUS = 22;

export const WOLF_SPEED = 82;
export const WOLF_FLEE_SPEED = 170;
/** The wolf runs away when the dog comes this close. */
export const WOLF_SCARED_RADIUS = 130;
export const WOLF_FLEE_TIME = 5;
export const SHEEP_WOLF_FEAR_RADIUS = 125;

export const FENCE_THICKNESS = 6;
/** How deep the barn is (it stands behind the pen). */
export const BARN_DEPTH = 84;

/** Bark: scares every sheep this close and chases the wolf away. */
export const BARK_RADIUS = 150;
export const BARK_WOLF_RADIUS = 240;
export const BARK_COOLDOWN = 3.5;
/** Speed in mud (1 = normal). */
export const MUD_SPEED = 0.5;
/** On ice: how much grip is left for steering (1 = normal) and how slowly sliding stops. */
export const ICE_GRIP = 0.22;
export const ICE_FRICTION = 0.35;
