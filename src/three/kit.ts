import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Small helpers to build cute low-poly models out of simple shapes.
// Every model is merged into as few meshes as possible (one per moving part),
// with the colors stored per vertex. Fewer meshes = smoother game on phones.

const smoothMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
const flatMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

export type PartOptions = {
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: number | [number, number, number];
};

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const tmpColor = new THREE.Color();

/** Collects colored shapes and merges them into one mesh. */
export class Parts {
  private list: THREE.BufferGeometry[] = [];

  add(geometry: THREE.BufferGeometry, color: string, o: PartOptions = {}): this {
    const g = (geometry.index ? geometry.toNonIndexed() : geometry.clone()) as THREE.BufferGeometry;
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    const s = o.scale ?? 1;
    tmpPos.set(...(o.pos ?? [0, 0, 0]));
    tmpQuat.setFromEuler(tmpEuler.set(...(o.rot ?? [0, 0, 0])));
    if (typeof s === 'number') tmpScale.set(s, s, s);
    else tmpScale.set(...s);
    g.applyMatrix4(tmpMatrix.compose(tmpPos, tmpQuat, tmpScale));
    tmpColor.set(color);
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.list.push(g);
    return this;
  }

  /** Adds a geometry that already has its own vertex colors (e.g. a finished sub-model). */
  addColored(geometry: THREE.BufferGeometry): this {
    this.list.push(geometry);
    return this;
  }

  get empty() {
    return this.list.length === 0;
  }

  geometry(): THREE.BufferGeometry {
    const merged = mergeGeometries(this.list, false);
    if (!merged) throw new Error('Could not merge model parts');
    merged.computeBoundingSphere();
    return merged;
  }

  /** `flat` gives the faceted low-poly look (good for scenery). */
  mesh(flat = false): THREE.Mesh {
    return new THREE.Mesh(this.geometry(), flat ? flatMaterial : smoothMaterial);
  }
}

// Shared basic shapes (all 1 unit in size; scale them with PartOptions).
export const shapes = {
  ball: new THREE.SphereGeometry(1, 12, 9),
  lowBall: new THREE.IcosahedronGeometry(1, 1),
  rock: new THREE.DodecahedronGeometry(1, 0),
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
  lowCylinder: new THREE.CylinderGeometry(1, 1, 1, 7),
  cone: new THREE.ConeGeometry(1, 1, 10),
  lowCone: new THREE.ConeGeometry(1, 1, 7),
  torus: new THREE.TorusGeometry(1, 0.25, 8, 20),
  capsule: new THREE.CapsuleGeometry(1, 1, 6, 12),
};

/** A soft dark blob used as a cheap shadow under things. */
export function blobGeometry(): THREE.BufferGeometry {
  const segments = 24;
  const positions: number[] = [];
  const colors: number[] = [];
  const ring = (r: number) => (i: number) => [
    Math.cos((i / segments) * Math.PI * 2) * r,
    0,
    Math.sin((i / segments) * Math.PI * 2) * r,
  ];
  const inner = ring(0.55);
  const outer = ring(1);
  for (let i = 0; i < segments; i++) {
    // Center fan (fully dark) + outer ring (fading out).
    positions.push(0, 0, 0, ...inner(i + 1), ...inner(i));
    colors.push(0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1);
    positions.push(...inner(i), ...inner(i + 1), ...outer(i + 1));
    colors.push(0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0);
    positions.push(...inner(i), ...outer(i + 1), ...outer(i));
    colors.push(0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  return g;
}

export const shadowMaterial = new THREE.MeshBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.28,
  depthWrite: false,
  side: THREE.DoubleSide,
});
