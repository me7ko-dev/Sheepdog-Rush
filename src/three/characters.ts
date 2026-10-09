import * as THREE from 'three';

import { Parts, shapes } from './kit';

// The animals, built from simple shapes. All of them face +X and stand on y = 0.
// Sizes are in meters. Each one has an `animate` function called every frame.

export type Pose = {
  /** Speed in meters per second. */
  speed: number;
  dt: number;
  time: number;
  /** 0..1, sheep only: how scared it is. */
  panic?: number;
  /** Sheep only: it is safe in the barn yard. */
  happy?: boolean;
};

export type Critter = {
  root: THREE.Group;
  animate: (pose: Pose) => void;
};

// ---------------------------------------------------------------- sheep

const SHEEP_COLORS = {
  white: { wool: '#FFFCF4', face: '#4B4049', inner: '#F6A9BC' },
  black: { wool: '#3B3742', face: '#1F1B23', inner: '#C98A9E' },
};

const sheepGeometry = new Map<string, { body: THREE.BufferGeometry; head: THREE.BufferGeometry; leg: THREE.BufferGeometry }>();

function buildSheepGeometry(kind: 'white' | 'black') {
  const cached = sheepGeometry.get(kind);
  if (cached) return cached;
  const c = SHEEP_COLORS[kind];
  const { ball } = shapes;

  const body = new Parts();
  body.add(ball, c.wool, { pos: [0, 0.64, 0], scale: [0.52, 0.38, 0.4] });
  const puffs: [number, number, number, number][] = [
    [0.18, 0.95, 0.0, 0.22],
    [-0.16, 0.96, 0.0, 0.23],
    [0.24, 0.88, 0.2, 0.2],
    [0.24, 0.88, -0.2, 0.2],
    [-0.22, 0.88, 0.2, 0.21],
    [-0.22, 0.88, -0.2, 0.21],
    [0.02, 0.64, 0.34, 0.22],
    [0.02, 0.64, -0.34, 0.22],
    [0.28, 0.66, 0.28, 0.19],
    [0.28, 0.66, -0.28, 0.19],
    [-0.28, 0.66, 0.28, 0.2],
    [-0.28, 0.66, -0.28, 0.2],
    [-0.46, 0.72, 0.0, 0.22],
    [0.42, 0.78, 0.0, 0.21],
    [0.0, 0.48, 0.2, 0.18],
    [0.0, 0.48, -0.2, 0.18],
  ];
  for (const [x, y, z, r] of puffs) body.add(ball, c.wool, { pos: [x, y, z], scale: r });
  body.add(ball, c.wool, { pos: [-0.6, 0.8, 0], scale: 0.11 }); // tail

  const head = new Parts();
  head.add(ball, c.face, { scale: [0.2, 0.18, 0.165] });
  head.add(ball, c.face, { pos: [0.1, -0.04, 0], scale: [0.14, 0.12, 0.13] });
  head.add(ball, c.wool, { pos: [-0.04, 0.15, 0], scale: [0.13, 0.1, 0.13] });
  for (const s of [-1, 1]) {
    head.add(ball, c.face, { pos: [-0.04, 0.07, s * 0.19], rot: [s * 0.5, 0, 0], scale: [0.065, 0.035, 0.14] });
    head.add(ball, c.inner, { pos: [-0.03, 0.085, s * 0.2], rot: [s * 0.5, 0, 0], scale: [0.04, 0.02, 0.1] });
    head.add(ball, '#FFFFFF', { pos: [0.12, 0.06, s * 0.085], scale: 0.055 });
    head.add(ball, '#151217', { pos: [0.165, 0.065, s * 0.09], scale: 0.032 });
    head.add(ball, '#FFFFFF', { pos: [0.18, 0.08, s * 0.08], scale: 0.01 });
    head.add(ball, '#FF8FA8', { pos: [0.16, -0.05, s * 0.12], scale: [0.03, 0.02, 0.03] });
  }
  head.add(ball, '#E87E95', { pos: [0.235, -0.03, 0], scale: [0.02, 0.025, 0.04] });

  const legParts = new Parts();
  legParts.add(shapes.cylinder, c.face, { pos: [0, -0.2, 0], scale: [0.055, 0.42, 0.055] });
  legParts.add(shapes.cylinder, '#2A2229', { pos: [0, -0.39, 0], scale: [0.065, 0.05, 0.065] });

  const result = { body: body.geometry(), head: head.geometry(), leg: legParts.geometry() };
  sheepGeometry.set(kind, result);
  return result;
}

const lambert = new THREE.MeshLambertMaterial({ vertexColors: true });

export function createSheep(black: boolean, seed: number): Critter {
  const geo = buildSheepGeometry(black ? 'black' : 'white');
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(new THREE.Mesh(geo.body, lambert));
  const head = new THREE.Group();
  head.position.set(0.58, 0.74, 0);
  head.add(new THREE.Mesh(geo.head, lambert));
  body.add(head);

  const legs: THREE.Group[] = [];
  for (const [x, z] of [
    [0.22, 0.16],
    [0.22, -0.16],
    [-0.22, 0.16],
    [-0.22, -0.16],
  ]) {
    const g = new THREE.Group();
    g.position.set(x, 0.42, z);
    g.add(new THREE.Mesh(geo.leg, lambert));
    root.add(g);
    legs.push(g);
  }

  let phase = seed * 1.7;
  let graze = 0;
  let hop = 0;
  const animate = ({ speed, dt, time, panic = 0, happy = false }: Pose) => {
    phase += (speed / 0.75) * Math.PI * 2 * dt;
    const amount = Math.min(1, speed / 1.0);
    const swing = Math.sin(phase) * 0.6 * amount;
    legs[0].rotation.z = swing;
    legs[3].rotation.z = swing;
    legs[1].rotation.z = -swing;
    legs[2].rotation.z = -swing;

    // Calm sheep lower their heads to nibble grass now and then.
    const wantsGraze = speed < 0.35 && panic < 0.1 && Math.sin(time * 0.45 + seed * 3.1) > 0.15 ? 1 : 0;
    graze += (wantsGraze - graze) * Math.min(1, dt * 3);
    const chew = wantsGraze ? Math.sin(time * 9 + seed) * 0.04 : 0;
    head.rotation.z = -0.75 * graze + chew + Math.sin(phase * 2) * 0.05 * amount;
    head.position.y = 0.74 - 0.16 * graze;

    // Happy little hops once inside the yard.
    if (happy && hop <= 0 && Math.sin(time * 1.3 + seed * 5) > 0.97) hop = 0.45;
    if (hop > 0) hop -= dt;
    const hopY = hop > 0 ? Math.sin((hop / 0.45) * Math.PI) * 0.22 : 0;

    body.position.y = Math.abs(Math.sin(phase)) * 0.07 * amount + hopY;
    body.rotation.z = Math.sin(phase * 2) * 0.04 * amount;
    root.position.y = hopY * 0.3;
  };

  return { root, animate };
}

// ---------------------------------------------------------------- dog & wolf

type CanineStyle = {
  fur: string;
  light: string;
  eye: string;
  pupil: string;
  collar: string | null;
  earTall: number;
  tailFluff: number;
  angry: boolean;
  scale: number;
};

export const DOG_STYLE: CanineStyle = {
  fur: '#24232A',
  light: '#FFFFFF',
  eye: '#FFFFFF',
  pupil: '#3A2414',
  collar: '#E53935',
  earTall: 0.15,
  tailFluff: 0.07,
  angry: false,
  scale: 1.3,
};

export const WOLF_STYLE: CanineStyle = {
  fur: '#7A8291',
  light: '#D3D8E0',
  eye: '#FFD54A',
  pupil: '#1A1A1A',
  collar: null,
  earTall: 0.22,
  tailFluff: 0.1,
  angry: true,
  scale: 1.4,
};

export type CanineCritter = Critter & { setTongue: (on: boolean) => void };

export function createCanine(style: CanineStyle): CanineCritter {
  const { ball, cylinder, cone, capsule, torus } = shapes;
  const root = new THREE.Group();
  root.scale.setScalar(style.scale);
  const body = new THREE.Group();
  root.add(body);

  const torso = new Parts();
  torso.add(capsule, style.fur, { pos: [0, 0.54, 0], rot: [0, 0, Math.PI / 2], scale: [0.17, 0.25, 0.16] });
  torso.add(ball, style.light, { pos: [0.27, 0.5, 0], scale: [0.16, 0.2, 0.15] });
  torso.add(ball, style.light, { pos: [0.33, 0.63, 0], scale: [0.14, 0.17, 0.165] });
  torso.add(ball, style.fur, { pos: [-0.05, 0.66, 0], scale: [0.3, 0.1, 0.14] });
  if (style.collar) {
    torso.add(torus, style.collar, { pos: [0.37, 0.66, 0], rot: [0, Math.PI / 2, -0.45], scale: [0.15, 0.15, 0.14] });
    torso.add(ball, '#FFC531', { pos: [0.45, 0.56, 0], scale: 0.035 });
  }
  body.add(new THREE.Mesh(torso.geometry(), lambert));

  const head = new THREE.Group();
  head.position.set(0.44, 0.8, 0);
  const headParts = new Parts();
  headParts.add(ball, style.fur, { scale: [0.17, 0.16, 0.155] });
  headParts.add(ball, style.light, { pos: [0.08, 0.09, 0], scale: [0.12, 0.045, 0.045] });
  headParts.add(ball, style.light, { pos: [0.15, -0.04, 0], scale: [0.13, 0.085, 0.095] });
  headParts.add(ball, '#141316', { pos: [0.28, -0.01, 0], scale: [0.04, 0.035, 0.045] });
  for (const s of [-1, 1]) {
    headParts.add(cone, style.fur, {
      pos: [-0.03, 0.15, s * 0.09],
      rot: [-s * 0.35, 0, 0],
      scale: [0.065, style.earTall, 0.04],
    });
    headParts.add(ball, style.eye, { pos: [0.1, 0.05, s * 0.085], scale: 0.045 });
    headParts.add(ball, style.pupil, { pos: [0.135, 0.055, s * 0.09], scale: 0.027 });
    headParts.add(ball, '#FFFFFF', { pos: [0.15, 0.07, s * 0.085], scale: 0.009 });
    if (style.angry) {
      headParts.add(shapes.box, '#3B3F48', {
        pos: [0.12, 0.11, s * 0.08],
        rot: [s * 0.45, 0, 0],
        scale: [0.03, 0.02, 0.09],
      });
    }
  }
  head.add(new THREE.Mesh(headParts.geometry(), lambert));
  const tongueParts = new Parts().add(ball, '#FF6F91', { pos: [0.2, -0.11, 0.025], scale: [0.06, 0.02, 0.04] });
  const tongue = new THREE.Mesh(tongueParts.geometry(), lambert);
  head.add(tongue);
  body.add(head);

  const tail = new THREE.Group();
  tail.position.set(-0.4, 0.62, 0);
  const tailParts = new Parts();
  tailParts.add(capsule, style.fur, { pos: [-0.17, 0, 0], rot: [0, 0, Math.PI / 2], scale: [style.tailFluff * 0.8, 0.12, style.tailFluff * 0.8] });
  tailParts.add(ball, style.light, { pos: [-0.36, 0, 0], scale: style.tailFluff });
  tail.add(new THREE.Mesh(tailParts.geometry(), lambert));
  body.add(tail);

  const legParts = new Parts();
  legParts.add(cylinder, style.fur, { pos: [0, -0.12, 0], scale: [0.05, 0.24, 0.05] });
  legParts.add(cylinder, style.light, { pos: [0, -0.31, 0], scale: [0.045, 0.2, 0.045] });
  legParts.add(ball, style.light, { pos: [0.025, -0.41, 0], scale: [0.06, 0.035, 0.05] });
  const legGeometry = legParts.geometry();
  const legs: THREE.Group[] = [];
  for (const [x, z] of [
    [0.24, 0.11],
    [0.24, -0.11],
    [-0.24, 0.11],
    [-0.24, -0.11],
  ]) {
    const g = new THREE.Group();
    g.position.set(x, 0.42, z);
    g.add(new THREE.Mesh(legGeometry, lambert));
    root.add(g);
    legs.push(g);
  }

  let phase = 0;
  let tongueOn = false;
  const animate = ({ speed, dt, time }: Pose) => {
    phase += (speed / 1.3) * Math.PI * 2 * dt;
    const amount = Math.min(1, speed / 1.5);
    // Gallop: front legs together, back legs together.
    const front = Math.sin(phase) * 0.8 * amount;
    const back = Math.sin(phase + 1.6) * 0.8 * amount;
    legs[0].rotation.z = front;
    legs[1].rotation.z = front * 0.85;
    legs[2].rotation.z = back;
    legs[3].rotation.z = back * 0.85;
    body.position.y = Math.abs(Math.sin(phase)) * 0.08 * amount;
    body.rotation.z = Math.sin(phase) * 0.07 * amount;
    tail.rotation.y = Math.sin(time * (style.angry ? 5 : 16)) * (style.angry ? 0.25 : 0.6);
    tail.rotation.z = style.angry ? -0.2 : 0.55;
    head.rotation.z = Math.sin(phase + 0.5) * 0.06 * amount;
    tongue.visible = tongueOn || amount > 0.6;
  };

  return { root, animate, setTongue: (on) => (tongueOn = on) };
}
