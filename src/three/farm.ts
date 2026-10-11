import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { UNITS_PER_METER } from '../game/constants';
import { makeRng } from '../game/math';
import type { Circle, LevelDef, Patch, PenDef, Rect, Side, Theme } from '../game/types';
import { barnRect, bridgeIsVertical, bridgeRails, penInnerRect, penWalls } from '../game/world';
import { blobGeometry, Parts, shadowMaterial, shapes } from './kit';

// The farm: everything that does not walk around. Built once per level.
// World units are converted to meters (the 3D scene uses meters).

export const m = (units: number) => units / UNITS_PER_METER;

export const PALETTE = {
  sky: '#9ED9FF',
  grass: '#86D35A',
  grassDark: '#6DBE45',
  grassOutside: '#6AB443',
  wood: '#B97A48',
  woodDark: '#8A5A33',
  white: '#FAF6EE',
  barn: '#D9483A',
  barnDark: '#A3352A',
  roof: '#7A2E25',
  straw: '#EED68E',
  hay: '#E8C15A',
  hayDark: '#C99A3B',
  water: '#47BDF5',
  bank: '#E2CB8C',
  rock: '#A9B0B8',
  rockDark: '#8C939C',
  bush: '#3E9E45',
  bushLight: '#5DBA4E',
  berry: '#E53950',
};

/** Colors that change with the season. */
type ThemeColors = {
  sky: string;
  grass: string;
  grassDark: string;
  grassOutside: string;
  tuft: string;
  bush: string;
  bushDark: string;
  bushLight: string;
  berry: string;
  treeColors: string[];
  pineColors: string[];
  /** Flowers in spring, fallen leaves in autumn, snow lumps in winter. */
  smallColors: string[];
  /** Light bounced up from the ground. */
  groundLight: string;
  /** Snow on roofs, fences, trees and rocks. */
  snow: boolean;
};

export const THEMES: Record<Theme, ThemeColors> = {
  spring: {
    sky: '#9ED9FF',
    grass: '#86D35A',
    grassDark: '#6DBE45',
    grassOutside: '#6AB443',
    tuft: '#4FA83A',
    bush: '#3E9E45',
    bushDark: '#358C3C',
    bushLight: '#5DBA4E',
    berry: '#E53950',
    treeColors: ['#4CAF50', '#5DBB4E', '#3E9E45', '#7CC659'],
    pineColors: ['#2F7D4A', '#38905A', '#2A6E42'],
    smallColors: ['#FFFFFF', '#FFE066', '#FF9AA2', '#D7A6F0', '#9AD0FF'],
    groundLight: '#5E9E3A',
    snow: false,
  },
  autumn: {
    sky: '#B5DCF5',
    grass: '#A9CB5C',
    grassDark: '#8FB24A',
    grassOutside: '#98B04C',
    tuft: '#7E9F38',
    bush: '#C86F2C',
    bushDark: '#A65524',
    bushLight: '#E39B3A',
    berry: '#7E2424',
    treeColors: ['#E8862A', '#D9562B', '#F2B33D', '#C9452E', '#9DBB4C'],
    pineColors: ['#2F6B45', '#3A7A4F', '#2A5E3E'],
    smallColors: ['#E8862A', '#D9562B', '#F2B33D', '#B5452E', '#F5D06A'],
    groundLight: '#7E8F3A',
    snow: false,
  },
  winter: {
    sky: '#C4DFF2',
    grass: '#D9E5F0',
    grassDark: '#B6CADD',
    grassOutside: '#CFDCE9',
    tuft: '#8EA88C',
    bush: '#2F6B4E',
    bushDark: '#285C43',
    bushLight: '#F4F8FC',
    berry: '#D7263D',
    treeColors: ['#F4F8FC', '#E6EEF6'],
    pineColors: ['#2E6B4E', '#367A57', '#2A5E45'],
    smallColors: ['#FFFFFF', '#F1F6FB', '#DDE8F2'],
    groundLight: '#9DB4C8',
    snow: true,
  },
};

export const themeOf = (level: LevelDef): ThemeColors => THEMES[level.theme ?? 'spring'];

// The colors of the level being built (set at the start of buildFarm).
let TH: ThemeColors = THEMES.spring;
const SNOW = '#F7FAFD';

/** Rotation (around Y) that turns a model's +Z side to face `side` of a rectangle. */
function facing(side: Side): number {
  switch (side) {
    case 'bottom':
      return 0;
    case 'top':
      return Math.PI;
    case 'left':
      return -Math.PI / 2;
    case 'right':
      return Math.PI / 2;
  }
}

const OUTWARD: Record<Side, [number, number]> = {
  top: [0, -1],
  bottom: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export type Farm = {
  group: THREE.Group;
  /** Called every frame for things that move (windmill, water sparkles). */
  animate: (time: number, dt: number) => void;
  /** Hides small decoration (grass, flowers) to help slower phones. */
  setLowDetail: () => void;
};

export function buildFarm(level: LevelDef): Farm {
  TH = themeOf(level);
  const group = new THREE.Group();
  const rng = makeRng(level.seed * 31 + 7);
  const W = m(level.size.w);
  const H = m(level.size.h);
  const MARGIN = 26;

  const solid = new Parts(); // smooth shading
  const faceted = new Parts(); // low-poly look
  const shadows: THREE.BufferGeometry[] = [];
  const blob = blobGeometry();
  const addShadow = (x: number, z: number, rx: number, rz = rx) => {
    const g = blob.clone();
    g.applyMatrix4(new THREE.Matrix4().makeScale(rx, 1, rz).setPosition(x, 0.015, z));
    shadows.push(g);
  };

  // --- Ground with soft color patches and mowing stripes.
  const seg = 2;
  const ground = new THREE.PlaneGeometry(
    W + MARGIN * 2,
    H + MARGIN * 2,
    Math.ceil((W + MARGIN * 2) / seg),
    Math.ceil((H + MARGIN * 2) / seg),
  );
  ground.rotateX(-Math.PI / 2);
  ground.translate(W / 2, 0, H / 2);
  const gp = ground.attributes.position;
  const gColors = new Float32Array(gp.count * 3);
  const cIn = new THREE.Color(TH.grass);
  const cDark = new THREE.Color(TH.grassDark);
  const cOut = new THREE.Color(TH.grassOutside);
  const tmp = new THREE.Color();
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i);
    const z = gp.getZ(i);
    const inside = x >= 0 && x <= W && z >= 0 && z <= H;
    const noise = 0.5 + 0.25 * Math.sin(x * 0.35 + level.seed) * Math.cos(z * 0.29) + 0.25 * Math.sin((x + z) * 0.13);
    tmp.copy(inside ? cIn : cOut).lerp(cDark, noise * 0.45);
    if (inside && !TH.snow && Math.floor(z / 2.5) % 2 === 0) tmp.offsetHSL(0, 0, 0.025);
    gColors[i * 3] = tmp.r;
    gColors[i * 3 + 1] = tmp.g;
    gColors[i * 3 + 2] = tmp.b;
  }
  ground.setAttribute('color', new THREE.BufferAttribute(gColors, 3));
  group.add(new THREE.Mesh(ground, new THREE.MeshLambertMaterial({ vertexColors: true })));

  // --- Fences
  const fence = (r: Rect, post: string, rail: string, height = 0.75) => {
    const x0 = m(r.x);
    const z0 = m(r.y);
    const w = m(r.w);
    const d = m(r.h);
    const alongX = w >= d;
    const length = alongX ? w : d;
    const count = Math.max(1, Math.round(length / 1.15));
    const cx = x0 + w / 2;
    const cz = z0 + d / 2;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const px = alongX ? x0 + t * w : cx;
      const pz = alongX ? cz : z0 + t * d;
      solid.add(shapes.box, post, { pos: [px, height / 2, pz], scale: [0.13, height, 0.13] });
      solid.add(shapes.box, post, { pos: [px, height + 0.03, pz], scale: [0.17, 0.06, 0.17] });
      if (TH.snow) solid.add(shapes.ball, SNOW, { pos: [px, height + 0.07, pz], scale: [0.11, 0.06, 0.11] });
    }
    for (const y of [height * 0.38, height * 0.78]) {
      solid.add(shapes.box, rail, {
        pos: [cx, y, cz],
        scale: alongX ? [w, 0.09, 0.06] : [0.06, 0.09, d],
      });
    }
    if (TH.snow) {
      solid.add(shapes.box, SNOW, {
        pos: [cx, height * 0.78 + 0.07, cz],
        scale: alongX ? [w, 0.05, 0.09] : [0.09, 0.05, d],
      });
    }
    addShadow(cx, cz + 0.1, alongX ? w / 2 + 0.2 : 0.35, alongX ? 0.35 : d / 2 + 0.2);
  };

  // Border of the meadow
  const t = 6;
  for (const r of [
    { x: 0, y: -t, w: level.size.w, h: t },
    { x: 0, y: level.size.h, w: level.size.w, h: t },
    { x: -t, y: 0, w: t, h: level.size.h },
    { x: level.size.w, y: 0, w: t, h: level.size.h },
  ]) {
    fence(r, PALETTE.woodDark, PALETTE.wood, 0.7);
  }
  for (const f of level.fences) fence(f, PALETTE.woodDark, PALETTE.wood);

  // --- Barn yard (pen): straw floor + white fence + gate posts
  const inner = penInnerRect(level.pen);
  const floor = new THREE.PlaneGeometry(m(inner.w), m(inner.h));
  floor.rotateX(-Math.PI / 2);
  floor.translate(m(inner.x + inner.w / 2), 0.012, m(inner.y + inner.h / 2));
  group.add(new THREE.Mesh(floor, new THREE.MeshLambertMaterial({ color: PALETTE.straw })));
  for (let i = 0; i < 26; i++) {
    const x = m(inner.x) + 0.3 + rng() * (m(inner.w) - 0.6);
    const z = m(inner.y) + 0.3 + rng() * (m(inner.h) - 0.6);
    faceted.add(shapes.box, i % 2 ? '#D9BA62' : '#F5E3A6', {
      pos: [x, 0.03, z],
      rot: [0, rng() * Math.PI, 0],
      scale: [0.35, 0.03, 0.05],
    });
  }
  for (const wRect of penWalls(level.pen)) fence(wRect, PALETTE.white, PALETTE.white, 0.85);
  addGatePosts(solid, level.pen);

  // --- Barn, silo and windmill
  addBarn(solid, faceted, level.pen, addShadow);
  const windmill = addWindmill(group, solid, level, addShadow);

  // --- Water and bridges
  const waterMaterial = new THREE.MeshLambertMaterial({
    color: PALETTE.water,
    emissive: '#0A5C8F',
    emissiveIntensity: 0.25,
  });
  for (const w of level.water) {
    const bank = new THREE.PlaneGeometry(m(w.w) + 0.6, m(w.h) + 0.6);
    bank.rotateX(-Math.PI / 2);
    bank.translate(m(w.x + w.w / 2), 0.008, m(w.y + w.h / 2));
    group.add(new THREE.Mesh(bank, new THREE.MeshLambertMaterial({ color: PALETTE.bank })));
    const water = new THREE.PlaneGeometry(m(w.w), m(w.h));
    water.rotateX(-Math.PI / 2);
    water.translate(m(w.x + w.w / 2), 0.02, m(w.y + w.h / 2));
    group.add(new THREE.Mesh(water, waterMaterial));
    // Pebbles along the banks
    const alongX = w.w >= w.h;
    const len = alongX ? m(w.w) : m(w.h);
    for (let i = 0; i < len / 1.4; i++) {
      const a = i * 1.4 + rng();
      for (const side of [-1, 1]) {
        const off = side * ((alongX ? m(w.h) : m(w.w)) / 2 + 0.25);
        const px = alongX ? m(w.x) + a : m(w.x + w.w / 2) + off;
        const pz = alongX ? m(w.y + w.h / 2) + off : m(w.y) + a;
        faceted.add(shapes.rock, rng() > 0.5 ? PALETTE.rock : '#C7CCD2', {
          pos: [px, 0.04, pz],
          scale: [0.18, 0.1, 0.15],
        });
      }
    }
  }
  const sparkles = addWaterSparkles(group, level, rng);

  for (const b of level.bridges) addBridge(solid, level, b, addShadow);
  for (const r of bridgeRails(level)) {
    const alongX = r.w >= r.h;
    const cx = m(r.x + r.w / 2);
    const cz = m(r.y + r.h / 2);
    const len = alongX ? m(r.w) + 0.3 : m(r.h) + 0.3;
    solid.add(shapes.box, PALETTE.woodDark, {
      pos: [cx, 0.55, cz],
      scale: alongX ? [len, 0.1, 0.12] : [0.12, 0.1, len],
    });
    const n = Math.max(1, Math.round(len / 1));
    for (let i = 0; i <= n; i++) {
      const tt = -len / 2 + (i / n) * len;
      solid.add(shapes.box, PALETTE.woodDark, {
        pos: alongX ? [cx + tt, 0.3, cz] : [cx, 0.3, cz + tt],
        scale: [0.12, 0.6, 0.12],
      });
    }
  }

  // --- Obstacles: bushes, rocks, hay
  for (const b of level.bushes) addBush(faceted, b, rng, addShadow);
  for (const r of level.rocks) addRock(faceted, r, rng, addShadow);
  for (const h of level.hay) addHay(solid, h, addShadow);

  // --- Trees around the meadow (decoration, outside the fence)
  const barn = barnRect(level.pen);
  const keepClear = (x: number, z: number) => {
    const bx = m(barn.x + barn.w / 2);
    const bz = m(barn.y + barn.h / 2);
    return Math.hypot(x - bx, z - bz) < 9;
  };
  for (let i = 0; i < 160; i++) {
    const edge = rng() * 4;
    const out = 2.2 + rng() * 14;
    const along = rng();
    let x: number;
    let z: number;
    if (edge < 1) [x, z] = [along * (W + 8) - 4, -out];
    else if (edge < 2) [x, z] = [along * (W + 8) - 4, H + out];
    else if (edge < 3) [x, z] = [-out, along * H];
    else [x, z] = [W + out, along * H];
    if (keepClear(x, z)) continue;
    // The camera looks at the meadow from the bottom side: keep big trees far away there.
    if (edge >= 1 && edge < 2 && out < 9) {
      addBush(faceted, { x: x * UNITS_PER_METER, y: z * UNITS_PER_METER, r: 14 + rng() * 10 }, rng, addShadow);
      continue;
    }
    addTree(faceted, x, z, rng, addShadow);
  }

  // --- Mud puddles
  for (const mud of level.mud ?? []) addMud(solid, mud, rng);

  // --- Ice and snowmen
  for (const ice of level.ice ?? []) addIce(solid, ice, rng);
  for (const sm of level.snowmen ?? []) addSnowman(solid, m(sm.x), m(sm.y), m(sm.r) / 0.8, rng, addShadow);

  // --- Pumpkins in autumn, snowmen in winter (outside the meadow)
  if (level.theme === 'autumn' || level.theme === 'winter') {
    const count = level.theme === 'winter' ? 10 : 26;
    for (let i = 0; i < count; i++) {
      const edge = rng() * 4;
      const out = 0.9 + rng() * 2.5;
      const along = rng();
      let x: number;
      let z: number;
      if (edge < 1) [x, z] = [along * W, -out];
      else if (edge < 2) [x, z] = [along * W, H + out];
      else if (edge < 3) [x, z] = [-out, along * H];
      else [x, z] = [W + out, along * H];
      if (level.theme === 'winter') addSnowman(solid, x, z, 0.8 + rng() * 0.4, rng, addShadow);
      else addPumpkin(solid, x, z, 0.7 + rng() * 0.6, rng, addShadow);
    }
  }

  // --- Grass tufts and flowers (instanced = one draw call each)
  const decor = addGrassAndFlowers(group, level, rng);

  group.add(solid.mesh(false));
  group.add(faceted.mesh(true));
  const shadowGeo = mergeGeometries(shadows, false);
  if (shadowGeo) {
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMaterial);
    shadowMesh.renderOrder = 1;
    group.add(shadowMesh);
  }

  return {
    group,
    animate: (time, dt) => {
      windmill.rotation.z += dt * 0.9;
      sparkles(time);
    },
    setLowDetail: () => {
      for (const d of decor) d.visible = false;
    },
  };
}

// ------------------------------------------------------------------ pieces

function addGatePosts(solid: Parts, pen: PenDef) {
  const [ox, oz] = OUTWARD[pen.gate];
  const cx = m(pen.x + pen.w / 2) + (ox * m(pen.w)) / 2;
  const cz = m(pen.y + pen.h / 2) + (oz * m(pen.h)) / 2;
  const half = m(pen.gateSize) / 2;
  for (const s of [-1, 1]) {
    const px = cx + (oz !== 0 ? s * half : 0);
    const pz = cz + (ox !== 0 ? s * half : 0);
    solid.add(shapes.box, PALETTE.white, { pos: [px, 0.6, pz], scale: [0.22, 1.2, 0.22] });
    solid.add(shapes.ball, '#FFC531', { pos: [px, 1.32, pz], scale: 0.15 });
    // Flower pot next to the gate
    solid.add(shapes.cylinder, '#C8673E', { pos: [px + ox * 0.45, 0.17, pz + oz * 0.45], scale: [0.18, 0.34, 0.18] });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      solid.add(shapes.ball, k % 2 ? '#FF6F91' : '#FFE066', {
        pos: [px + ox * 0.45 + Math.cos(a) * 0.09, 0.42, pz + oz * 0.45 + Math.sin(a) * 0.09],
        scale: 0.08,
      });
    }
  }
}

function addBarn(
  solid: Parts,
  faceted: Parts,
  pen: PenDef,
  addShadow: (x: number, z: number, rx: number, rz?: number) => void,
) {
  const r = barnRect(pen);
  const sideways = pen.gate === 'left' || pen.gate === 'right';
  const W = sideways ? m(r.h) : m(r.w); // along the doors
  const D = sideways ? m(r.w) : m(r.h); // depth
  const cx = m(r.x + r.w / 2);
  const cz = m(r.y + r.h / 2);
  const rotY = facing(pen.gate);

  const barn = new Parts();
  const Hw = 2.4;
  barn.add(shapes.box, PALETTE.barn, { pos: [0, Hw / 2, 0], scale: [W, Hw, D] });
  barn.add(shapes.box, PALETTE.white, { pos: [0, 0.12, 0], scale: [W + 0.08, 0.24, D + 0.08] });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      barn.add(shapes.box, PALETTE.white, { pos: [(sx * W) / 2, Hw / 2, (sz * D) / 2], scale: [0.2, Hw, 0.2] });
    }
  }
  barn.add(shapes.box, PALETTE.white, { pos: [0, Hw, 0], scale: [W + 0.1, 0.16, D + 0.1] });

  // Gambrel (two-slope) roof
  const k = (W / 2) * 0.62;
  const h1 = 1.0;
  const h2 = 1.75;
  const profile: [number, number][] = [
    [-W / 2, 0],
    [-k, h1],
    [0, h2],
    [k, h1],
    [W / 2, 0],
  ];
  const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
  const gable = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false });
  gable.translate(0, Hw, -D / 2);
  barn.add(gable, PALETTE.barn);
  for (let i = 0; i < profile.length - 1; i++) {
    const [x0, y0] = profile[i];
    const [x1, y1] = profile[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    barn.add(shapes.box, PALETTE.roof, {
      pos: [(x0 + x1) / 2 + nx * 0.08, Hw + (y0 + y1) / 2 + ny * 0.08, 0],
      rot: [0, 0, ang],
      scale: [len + 0.16, 0.16, D + 0.5],
    });
    if (TH.snow) {
      barn.add(shapes.box, SNOW, {
        pos: [(x0 + x1) / 2 + nx * 0.19, Hw + (y0 + y1) / 2 + ny * 0.19, 0],
        rot: [0, 0, ang],
        scale: [len * 0.96, 0.08, D + 0.42],
      });
    }
  }
  barn.add(shapes.box, PALETTE.white, { pos: [0, Hw + h2 + 0.16, 0], scale: [0.22, 0.12, D + 0.55] });

  // Big door with a white X, facing the yard (+Z)
  const doorW = Math.min(2.0, W * 0.42);
  const doorH = 1.95;
  const fz = D / 2;
  barn.add(shapes.box, PALETTE.white, {
    pos: [0, doorH / 2 + 0.05, fz + 0.03],
    scale: [doorW + 0.24, doorH + 0.2, 0.06],
  });
  barn.add(shapes.box, PALETTE.barnDark, { pos: [0, doorH / 2 + 0.05, fz + 0.06], scale: [doorW, doorH, 0.06] });
  const diag = Math.hypot(doorW, doorH);
  const a = Math.atan2(doorH, doorW);
  for (const s of [-1, 1]) {
    barn.add(shapes.box, PALETTE.white, {
      pos: [0, doorH / 2 + 0.05, fz + 0.1],
      rot: [0, 0, s * a],
      scale: [diag - 0.1, 0.13, 0.04],
    });
  }
  barn.add(shapes.box, PALETTE.white, { pos: [0, doorH / 2 + 0.05, fz + 0.1], scale: [0.1, doorH, 0.04] });
  // Hay loft window
  barn.add(shapes.box, PALETTE.white, { pos: [0, Hw + 0.72, fz + 0.03], scale: [0.85, 0.75, 0.06] });
  barn.add(shapes.box, '#4A2F24', { pos: [0, Hw + 0.72, fz + 0.06], scale: [0.62, 0.52, 0.04] });
  barn.add(shapes.box, PALETTE.hay, { pos: [0, Hw + 0.52, fz + 0.09], scale: [0.6, 0.14, 0.06] });
  // Side windows
  for (const sx of [-1, 1]) {
    barn.add(shapes.box, PALETTE.white, { pos: [(sx * W) / 2 + sx * 0.03, 1.5, 0], scale: [0.06, 0.65, 0.65] });
    barn.add(shapes.box, '#4A2F24', { pos: [(sx * W) / 2 + sx * 0.06, 1.5, 0], scale: [0.04, 0.45, 0.45] });
  }
  // Cupola with a little roof
  barn.add(shapes.box, PALETTE.white, { pos: [0, Hw + h2 + 0.45, 0], scale: [0.55, 0.5, 0.55] });
  barn.add(shapes.cone, PALETTE.roof, {
    pos: [0, Hw + h2 + 0.95, 0],
    rot: [0, Math.PI / 4, 0],
    scale: [0.5, 0.5, 0.5],
  });
  barn.add(shapes.cylinder, '#3A3A3A', { pos: [0, Hw + h2 + 1.35, 0], scale: [0.02, 0.4, 0.02] });
  barn.add(shapes.box, '#3A3A3A', { pos: [0.05, Hw + h2 + 1.45, 0], scale: [0.32, 0.03, 0.03] });

  const geo = barn.geometry();
  geo.applyMatrix4(new THREE.Matrix4().makeRotationY(rotY).setPosition(cx, 0, cz));
  solid.addColored(geo);
  addShadow(cx, cz, (sideways ? D : W) / 2 + 0.8, (sideways ? W : D) / 2 + 0.8);

  // Silo behind the barn (outside the yard)
  const [ox, oz] = OUTWARD[pen.gate];
  const back = D / 2 + 1.3;
  const side = W / 2 - 0.4;
  const sx = cx - ox * back + (oz !== 0 ? side : 0);
  const sz = cz - oz * back + (ox !== 0 ? side : 0);
  solid.add(shapes.cylinder, '#D9DFE5', { pos: [sx, 2.2, sz], scale: [1, 4.4, 1] });
  for (const y of [0.8, 1.9, 3.0, 4.0])
    solid.add(shapes.cylinder, '#AFB8C1', { pos: [sx, y, sz], scale: [1.03, 0.12, 1.03] });
  solid.add(shapes.ball, PALETTE.barn, { pos: [sx, 4.4, sz], scale: [1.02, 0.7, 1.02] });
  addShadow(sx, sz, 1.5);
  // A few hay bales by the barn
  for (let i = 0; i < 3; i++) {
    const hx = cx - ox * (D / 2 + 0.9) - (oz !== 0 ? side - 0.2 + i * 0.9 : 0);
    const hz = cz - oz * (D / 2 + 0.9) - (ox !== 0 ? side - 0.2 + i * 0.9 : 0);
    faceted.add(shapes.lowCylinder, PALETTE.hay, {
      pos: [hx, 0.35, hz],
      rot: [Math.PI / 2, 0, i],
      scale: [0.4, 0.7, 0.4],
    });
  }
}

function addWindmill(
  group: THREE.Group,
  solid: Parts,
  level: LevelDef,
  addShadow: (x: number, z: number, rx: number, rz?: number) => void,
): THREE.Group {
  // Stand it in the corner farthest from the barn, just outside the meadow.
  const barn = barnRect(level.pen);
  const W = m(level.size.w);
  const H = m(level.size.h);
  const bx = m(barn.x + barn.w / 2);
  const bz = m(barn.y + barn.h / 2);
  const corners: [number, number][] = [
    [-4, -4],
    [W + 4, -4],
    [-4, H + 4],
    [W + 4, H + 4],
  ];
  corners.sort((p, q) => Math.hypot(q[0] - bx, q[1] - bz) - Math.hypot(p[0] - bx, p[1] - bz));
  const [x, z] = corners[1];
  const tower = new THREE.CylinderGeometry(0.75, 1.3, 5.5, 8);
  solid.add(tower, '#F4EBDD', { pos: [x, 2.75, z] });
  solid.add(shapes.cone, '#7A2E25', { pos: [x, 6.1, z], scale: [1.05, 1.3, 1.05] });
  solid.add(shapes.box, '#5A3A24', { pos: [x, 1, z + 1.25], scale: [0.7, 1.2, 0.1] });
  addShadow(x, z, 2);

  const hub = new THREE.Group();
  hub.position.set(x, 5.4, z + 0.95);
  const blades = new Parts();
  blades.add(shapes.ball, '#5A3A24', { scale: 0.25 });
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    blades.add(shapes.box, '#8A5A33', {
      pos: [Math.cos(ang) * 1.3, Math.sin(ang) * 1.3, 0],
      rot: [0, 0, ang],
      scale: [2.6, 0.1, 0.06],
    });
    blades.add(shapes.box, '#FFFFFF', {
      pos: [Math.cos(ang) * 1.6 - Math.sin(ang) * 0.22, Math.sin(ang) * 1.6 + Math.cos(ang) * 0.22, 0.02],
      rot: [0, 0, ang],
      scale: [1.9, 0.42, 0.03],
    });
  }
  hub.add(blades.mesh(true));
  group.add(hub);
  return hub;
}

function addBridge(
  solid: Parts,
  level: LevelDef,
  b: Rect,
  addShadow: (x: number, z: number, rx: number, rz?: number) => void,
) {
  const vertical = bridgeIsVertical(level, b);
  const cx = m(b.x + b.w / 2);
  const cz = m(b.y + b.h / 2);
  const span = vertical ? m(b.h) : m(b.w);
  const width = vertical ? m(b.w) : m(b.h);
  const n = Math.floor(span / 0.32);
  for (let i = 0; i < n; i++) {
    const tt = -span / 2 + (i + 0.5) * (span / n);
    solid.add(shapes.box, i % 2 ? '#B98353' : '#A8744A', {
      pos: vertical ? [cx, 0.07, cz + tt] : [cx + tt, 0.07, cz],
      scale: vertical ? [width, 0.08, span / n - 0.04] : [span / n - 0.04, 0.08, width],
    });
  }
  addShadow(cx, cz, vertical ? width / 2 + 0.2 : span / 2, vertical ? span / 2 : width / 2 + 0.2);
}

function addBush(
  faceted: Parts,
  b: Circle,
  rng: () => number,
  addShadow: (x: number, z: number, rx: number, rz?: number) => void,
) {
  const x = m(b.x);
  const z = m(b.y);
  const r = m(b.r);
  addShadow(x + 0.15, z + 0.2, r * 1.25);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng();
    const d = r * 0.45;
    faceted.add(shapes.lowBall, i % 2 ? TH.bush : TH.bushDark, {
      pos: [x + Math.cos(a) * d, r * 0.55, z + Math.sin(a) * d],
      scale: r * (0.55 + rng() * 0.15),
    });
  }
  faceted.add(shapes.lowBall, TH.bushLight, { pos: [x - r * 0.1, r * 0.95, z - r * 0.1], scale: r * 0.55 });
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2;
    faceted.add(shapes.ball, TH.berry, {
      pos: [x + Math.cos(a) * r * 0.85, r * (0.6 + rng() * 0.5), z + Math.sin(a) * r * 0.85],
      scale: 0.07,
    });
  }
}

function addRock(
  faceted: Parts,
  c: Circle,
  rng: () => number,
  addShadow: (x: number, z: number, rx: number, rz?: number) => void,
) {
  const x = m(c.x);
  const z = m(c.y);
  const r = m(c.r);
  addShadow(x + 0.1, z + 0.15, r * 1.2);
  faceted.add(shapes.rock, PALETTE.rock, {
    pos: [x, r * 0.35, z],
    rot: [rng(), rng() * 3, 0],
    scale: [r, r * 0.75, r * 0.9],
  });
  faceted.add(shapes.rock, PALETTE.rockDark, {
    pos: [x + r * 0.6, r * 0.2, z + r * 0.4],
    rot: [rng(), rng() * 3, 0],
    scale: [r * 0.45, r * 0.4, r * 0.45],
  });
  faceted.add(shapes.lowBall, TH.snow ? SNOW : '#7FBF5A', {
    pos: [x - r * 0.2, r * 0.68, z - r * 0.1],
    scale: TH.snow ? [r * 0.7, r * 0.16, r * 0.6] : [r * 0.4, r * 0.12, r * 0.35],
  });
}

function addHay(solid: Parts, c: Circle, addShadow: (x: number, z: number, rx: number, rz?: number) => void) {
  const x = m(c.x);
  const z = m(c.y);
  const r = m(c.r);
  addShadow(x + 0.1, z + 0.15, r * 1.25);
  solid.add(shapes.cylinder, PALETTE.hay, { pos: [x, 0.45, z], scale: [r, 0.9, r] });
  solid.add(shapes.cylinder, '#F2D27A', { pos: [x, 0.91, z], scale: [r * 0.75, 0.02, r * 0.75] });
  for (const y of [0.25, 0.65])
    solid.add(shapes.cylinder, PALETTE.hayDark, { pos: [x, y, z], scale: [r * 1.02, 0.06, r * 1.02] });
  if (TH.snow) solid.add(shapes.ball, SNOW, { pos: [x, 0.92, z], scale: [r * 0.95, 0.1, r * 0.95] });
}

function addTree(
  faceted: Parts,
  x: number,
  z: number,
  rng: () => number,
  addShadow: (x: number, z: number, rx: number, rz?: number) => void,
) {
  const s = 0.8 + rng() * 0.7;
  addShadow(x + 0.4, z + 0.5, 1.5 * s);
  if (rng() < (TH.snow ? 0.8 : 0.4)) {
    // Pine
    faceted.add(shapes.lowCylinder, '#7A4E2D', { pos: [x, 0.5 * s, z], scale: [0.18 * s, 1 * s, 0.18 * s] });
    for (let i = 0; i < 3; i++) {
      faceted.add(shapes.lowCone, TH.pineColors[i], {
        pos: [x, (1.2 + i * 0.85) * s, z],
        scale: [(1.3 - i * 0.32) * s, 1.4 * s, (1.3 - i * 0.32) * s],
      });
      if (TH.snow) {
        // A snowy tip on every layer
        faceted.add(shapes.lowCone, SNOW, {
          pos: [x, (1.62 + i * 0.85) * s, z],
          scale: [(0.75 - i * 0.18) * s, 0.62 * s, (0.75 - i * 0.18) * s],
        });
      }
    }
  } else {
    faceted.add(shapes.lowCylinder, '#8A5A33', { pos: [x, 0.8 * s, z], scale: [0.2 * s, 1.6 * s, 0.2 * s] });
    const g = TH.treeColors[Math.floor(rng() * TH.treeColors.length)];
    faceted.add(shapes.lowBall, g, { pos: [x, 2.2 * s, z], scale: 1.15 * s });
    faceted.add(shapes.lowBall, g, { pos: [x + 0.6 * s, 1.9 * s, z + 0.3 * s], scale: 0.75 * s });
    faceted.add(shapes.lowBall, g, { pos: [x - 0.5 * s, 2.0 * s, z - 0.4 * s], scale: 0.8 * s });
    if (rng() < 0.4) {
      for (let i = 0; i < 4; i++) {
        const a = rng() * Math.PI * 2;
        faceted.add(shapes.ball, '#E53950', {
          pos: [x + Math.cos(a) * 1.05 * s, 2.1 * s + rng() * 0.5, z + Math.sin(a) * 1.05 * s],
          scale: 0.12,
        });
      }
    }
  }
}

function addMud(solid: Parts, c: Circle, rng: () => number) {
  const x = m(c.x);
  const z = m(c.y);
  const r = m(c.r);
  solid.add(shapes.disc, '#8A6239', { pos: [x, 0.012, z], scale: [r * 1.08, 0.02, r * 1.0] });
  solid.add(shapes.disc, '#6E4A2A', { pos: [x, 0.02, z], scale: [r * 0.95, 0.02, r * 0.88] });
  for (let i = 0; i < 5; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * r * 0.6;
    solid.add(shapes.disc, i % 2 ? '#5C3D22' : '#9B7550', {
      pos: [x + Math.cos(a) * d, 0.028, z + Math.sin(a) * d],
      scale: [r * (0.12 + rng() * 0.15), 0.01, r * (0.08 + rng() * 0.1)],
    });
  }
  // Wet shine
  solid.add(shapes.ball, '#B79A7A', { pos: [x - r * 0.25, 0.03, z - r * 0.2], scale: [r * 0.3, 0.008, r * 0.12] });
}

function addIce(solid: Parts, p: Patch, rng: () => number) {
  const round = 'r' in p;
  const cx = round ? m(p.x) : m(p.x + p.w / 2);
  const cz = round ? m(p.y) : m(p.y + p.h / 2);
  const sx = round ? m(p.r) : m(p.w) / 2;
  const sz = round ? m(p.r) : m(p.h) / 2;
  if (round) {
    solid.add(shapes.disc, SNOW, { pos: [cx, 0.01, cz], scale: [sx * 1.1, 0.02, sz * 1.1] });
    solid.add(shapes.disc, '#9FD3F0', { pos: [cx, 0.018, cz], scale: [sx, 0.02, sz] });
    solid.add(shapes.disc, '#B9E2F7', {
      pos: [cx - sx * 0.08, 0.024, cz - sz * 0.08],
      scale: [sx * 0.8, 0.02, sz * 0.75],
    });
  } else {
    solid.add(shapes.box, SNOW, { pos: [cx, 0.005, cz], scale: [sx * 2 + 0.4, 0.01, sz * 2 + 0.4] });
    solid.add(shapes.box, '#9FD3F0', { pos: [cx, 0.012, cz], scale: [sx * 2, 0.012, sz * 2] });
    solid.add(shapes.box, '#B9E2F7', { pos: [cx, 0.02, cz], scale: [sx * 2 - 0.5, 0.01, sz * 2 - 0.5] });
  }
  // Shiny scratches
  const n = Math.max(3, Math.round((sx * sz) / 2.5));
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const d = round ? Math.sqrt(rng()) * 0.7 : 0;
    const px = round ? cx + Math.cos(a) * d * sx : cx + (rng() - 0.5) * (sx * 2 - 1);
    const pz = round ? cz + Math.sin(a) * d * sz : cz + (rng() - 0.5) * (sz * 2 - 1);
    solid.add(shapes.box, '#FFFFFF', {
      pos: [px, 0.03, pz],
      rot: [0, 0.6 + rng() * 0.3, 0],
      scale: [0.5 + rng() * 0.6, 0.008, 0.05],
    });
  }
}

function addSnowman(
  solid: Parts,
  x: number,
  z: number,
  size: number,
  rng: () => number,
  addShadow: (x: number, z: number, rx: number, rz?: number) => void,
) {
  const s = size;
  addShadow(x + 0.1, z + 0.15, 0.85 * s);
  solid.add(shapes.ball, SNOW, { pos: [x, 0.55 * s, z], scale: [0.72 * s, 0.62 * s, 0.72 * s] });
  solid.add(shapes.ball, SNOW, { pos: [x, 1.38 * s, z], scale: 0.5 * s });
  solid.add(shapes.ball, SNOW, { pos: [x, 2.0 * s, z], scale: 0.35 * s });
  // The face looks towards the camera (+Z)
  for (const side of [-1, 1]) {
    solid.add(shapes.ball, '#26222A', { pos: [x + side * 0.12 * s, 2.08 * s, z + 0.3 * s], scale: 0.045 * s });
    // Stick arms
    solid.add(shapes.cylinder, '#6B4429', {
      pos: [x + side * 0.72 * s, 1.55 * s, z],
      rot: [0, 0, side * -1.0],
      scale: [0.03 * s, 0.6 * s, 0.03 * s],
    });
  }
  solid.add(shapes.cone, '#F28C28', {
    pos: [x, 1.98 * s, z + 0.43 * s],
    rot: [Math.PI / 2, 0, 0],
    scale: [0.06 * s, 0.24 * s, 0.06 * s],
  });
  for (const y of [1.25, 1.45]) {
    solid.add(shapes.ball, '#26222A', { pos: [x, y * s, z + 0.48 * s], scale: 0.05 * s });
  }
  const scarf = rng() < 0.5 ? '#E53935' : '#2F80ED';
  solid.add(shapes.torus, scarf, {
    pos: [x, 1.74 * s, z],
    rot: [Math.PI / 2, 0, 0],
    scale: [0.33 * s, 0.33 * s, 0.4 * s],
  });
  solid.add(shapes.box, scarf, {
    pos: [x + 0.18 * s, 1.55 * s, z + 0.3 * s],
    rot: [0.2, 0, 0.15],
    scale: [0.12 * s, 0.34 * s, 0.05 * s],
  });
  if (rng() < 0.6) {
    solid.add(shapes.cylinder, '#26222A', { pos: [x, 2.31 * s, z], scale: [0.36 * s, 0.03 * s, 0.36 * s] });
    solid.add(shapes.cylinder, '#26222A', { pos: [x, 2.47 * s, z], scale: [0.22 * s, 0.3 * s, 0.22 * s] });
  }
}

function addPumpkin(
  solid: Parts,
  x: number,
  z: number,
  size: number,
  rng: () => number,
  addShadow: (x: number, z: number, rx: number, rz?: number) => void,
) {
  const r = 0.32 * size;
  addShadow(x, z + 0.05, r * 1.4);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    solid.add(shapes.ball, i % 2 ? '#F08A24' : '#E2771B', {
      pos: [x + Math.cos(a) * r * 0.35, r * 0.75, z + Math.sin(a) * r * 0.35],
      scale: [r * 0.7, r * 0.75, r * 0.7],
    });
  }
  solid.add(shapes.cylinder, '#5E7A2E', {
    pos: [x, r * 1.55, z],
    rot: [rng() * 0.4, 0, 0.2],
    scale: [0.04 * size, 0.2 * size, 0.04 * size],
  });
  solid.add(shapes.ball, '#6F9A35', {
    pos: [x + 0.08 * size, r * 1.45, z],
    scale: [0.12 * size, 0.02 * size, 0.07 * size],
  });
}

function addWaterSparkles(group: THREE.Group, level: LevelDef, rng: () => number) {
  if (level.water.length === 0) return () => {};
  const geo = new THREE.CapsuleGeometry(0.06, 0.4, 2, 6);
  geo.rotateZ(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.75 });
  const items: { mesh: THREE.Mesh; w: Rect; along: number; across: number; speed: number }[] = [];
  for (const w of level.water) {
    const alongX = w.w >= w.h;
    const count = Math.ceil((alongX ? w.w : w.h) / 45);
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      if (!alongX) mesh.rotation.y = Math.PI / 2;
      group.add(mesh);
      items.push({ mesh, w, along: rng(), across: 0.15 + rng() * 0.7, speed: 0.02 + rng() * 0.03 });
    }
  }
  return (time: number) => {
    for (const it of items) {
      const alongX = it.w.w >= it.w.h;
      const p = (it.along + time * it.speed) % 1;
      const x = alongX ? it.w.x + p * it.w.w : it.w.x + it.across * it.w.w;
      const z = alongX ? it.w.y + it.across * it.w.h : it.w.y + p * it.w.h;
      it.mesh.position.set(m(x), 0.035, m(z));
      const fade = Math.sin(p * Math.PI);
      it.mesh.scale.setScalar(0.4 + fade * 0.8);
    }
  };
}

function addGrassAndFlowers(group: THREE.Group, level: LevelDef, rng: () => number) {
  const W = m(level.size.w);
  const H = m(level.size.h);
  const blocked = (x: number, z: number) => {
    const wx = x * UNITS_PER_METER;
    const wy = z * UNITS_PER_METER;
    const inRect = (r: Rect, pad: number) =>
      wx > r.x - pad && wx < r.x + r.w + pad && wy > r.y - pad && wy < r.y + r.h + pad;
    if (level.water.some((r) => inRect(r, 8))) return true;
    if (inRect(level.pen, 4) || inRect(barnRect(level.pen), 10)) return true;
    return false;
  };

  const tuft = new Parts();
  for (const [a, tilt] of [
    [0, 0.25],
    [2.1, 0.3],
    [4.2, 0.2],
  ]) {
    tuft.add(shapes.lowCone, TH.tuft, {
      pos: [Math.cos(a) * 0.04, 0.11, Math.sin(a) * 0.04],
      rot: [Math.sin(a) * tilt, 0, Math.cos(a) * tilt],
      scale: [0.035, 0.24, 0.035],
    });
  }
  const tuftCount = Math.round((W * H) / (TH.snow ? 14 : 3.2)) + 260;
  const tufts = new THREE.InstancedMesh(
    tuft.geometry(),
    new THREE.MeshLambertMaterial({ vertexColors: true }),
    tuftCount,
  );
  const flower = new Parts();
  const autumn = level.theme === 'autumn';
  const winter = level.theme === 'winter';
  if (winter) {
    // A little lump of snow
    flower.add(shapes.lowBall, '#FFFFFF', { pos: [0, 0, 0], scale: [0.16, 0.06, 0.12] });
  } else if (autumn) {
    // A fallen leaf
    flower.add(shapes.ball, '#FFFFFF', { pos: [0, 0.02, 0], rot: [0.15, 0, 0.1], scale: [0.11, 0.012, 0.06] });
  } else {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      flower.add(shapes.ball, '#FFFFFF', {
        pos: [Math.cos(a) * 0.06, 0.06, Math.sin(a) * 0.06],
        scale: [0.05, 0.025, 0.05],
      });
    }
    flower.add(shapes.ball, '#FFD23F', { pos: [0, 0.075, 0], scale: [0.035, 0.025, 0.035] });
  }
  const flowerCount = Math.round((W * H) / (autumn ? 3 : winter ? 6 : 9)) + 80;
  const flowers = new THREE.InstancedMesh(
    flower.geometry(),
    new THREE.MeshLambertMaterial({ vertexColors: true }),
    flowerCount,
  );
  const colors = TH.smallColors.map((c) => new THREE.Color(c));

  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const place = (mesh: THREE.InstancedMesh, count: number, scaleMin: number, scaleMax: number, color?: boolean) => {
    let n = 0;
    for (let tries = 0; n < count && tries < count * 4; tries++) {
      const x = -10 + rng() * (W + 20);
      const z = -10 + rng() * (H + 20);
      if (blocked(x, z)) continue;
      const s = scaleMin + rng() * (scaleMax - scaleMin);
      q.setFromAxisAngle(up, rng() * Math.PI * 2);
      matrix.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s));
      mesh.setMatrixAt(n, matrix);
      if (color) mesh.setColorAt(n, colors[Math.floor(rng() * colors.length)]);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  place(tufts, tuftCount, 0.7, 1.5);
  place(flowers, flowerCount, 0.8, 1.4, true);
  group.add(tufts, flowers);
  return [tufts, flowers];
}
