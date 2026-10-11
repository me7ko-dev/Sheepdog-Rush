import * as THREE from 'three';

import { BARK_RADIUS, UNITS_PER_METER } from '../game/constants';
import type { Effect, LevelDef, Side, Vec, World } from '../game/types';
import { kennel } from '../storage/kennel';
import { createCanine, createSheep, dogStyleFor, WOLF_STYLE, type CanineCritter, type Critter } from './characters';
import { buildFarm, m, themeOf, type Farm } from './farm';
import { blobGeometry, shadowMaterial } from './kit';

export type CameraMode = 'follow' | 'orbit';

/** How many meters of meadow fit across the screen while playing. */
const VIEW_WIDTH = 11.5;
const PITCH = (52 * Math.PI) / 180;
const SNOW_BOX = 26;
const SNOW_HEIGHT = 14;

const FACING: Record<Side, number> = { bottom: 0, top: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
const OUTWARD: Record<Side, [number, number]> = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

type Pop = { hearts: THREE.Mesh[]; ring: THREE.Mesh; age: number; x: number; z: number };

/** The whole 3D world for one level: farm, animals, camera and little effects. */
export class FarmScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.5, 260);
  private farm: Farm;
  private world: World | null = null;
  private sheep: Critter[] = [];
  private dog: CanineCritter | null = null;
  private wolf: CanineCritter | null = null;
  private actors = new THREE.Group();
  private shadows: THREE.InstancedMesh | null = null;
  private arrow: THREE.Mesh;
  private ring: THREE.Mesh;
  private pops: Pop[] = [];
  private seenEffects = new WeakSet<Effect>();
  private camTarget = new THREE.Vector3();
  private camReady = false;
  private distance = 30;
  private time = 0;
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private width = 1;
  private height = 1;

  constructor(
    private level: LevelDef,
    private mode: CameraMode,
  ) {
    const theme = themeOf(level);
    this.scene.background = new THREE.Color(theme.sky);
    this.scene.fog = new THREE.Fog(theme.sky, 55, 120);
    this.scene.add(new THREE.HemisphereLight('#EAF7FF', theme.groundLight, theme.snow ? 1.9 : 2.2));
    const sun = new THREE.DirectionalLight(theme.snow ? '#FFF6E8' : '#FFF0D2', theme.snow ? 1.8 : 2.1);
    sun.position.set(-12, 30, 18);
    this.scene.add(sun);

    this.farm = buildFarm(level);
    this.scene.add(this.farm.group);
    if (theme.snow) this.snow = this.makeSnowfall();
    this.scene.add(this.actors);

    // Bouncing arrow in front of the barn yard gate.
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.55);
    shape.lineTo(0.5, 0);
    shape.lineTo(0.22, 0);
    shape.lineTo(0.22, -0.5);
    shape.lineTo(-0.22, -0.5);
    shape.lineTo(-0.22, 0);
    shape.lineTo(-0.5, 0);
    shape.closePath();
    const arrowGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.04,
      bevelSegments: 2,
    });
    arrowGeo.center();
    arrowGeo.rotateX(-Math.PI / 2); // lie flat, tip towards -Z
    this.arrow = new THREE.Mesh(
      arrowGeo,
      new THREE.MeshLambertMaterial({ color: '#FFD23F', emissive: '#FF9F1C', emissiveIntensity: 0.35 }),
    );
    this.scene.add(this.arrow);

    // Ring under the finger.
    const ringGeo = new THREE.RingGeometry(0.42, 0.58, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.85, depthWrite: false }),
    );
    this.ring.visible = false;
    this.scene.add(this.ring);
  }

  /** Puts the animals of `world` into the scene (call again after a restart). */
  setWorld(world: World) {
    this.world = world;
    this.actors.clear();
    for (const p of this.pops) {
      for (const h of p.hearts) this.scene.remove(h);
      this.scene.remove(p.ring);
    }
    this.pops = [];
    this.seenEffects = new WeakSet();
    for (const wave of this.barkWaves) this.scene.remove(wave.mesh);
    this.barkWaves = [];
    this.seenBarks = new WeakSet();
    this.sheep = world.sheep.map((s) => {
      const c = createSheep(s.black, s.id);
      this.actors.add(c.root);
      return c;
    });
    this.dog = createCanine(dogStyleFor(kennel.get()));
    this.actors.add(this.dog.root);
    this.wolf = world.wolf ? createCanine(WOLF_STYLE) : null;
    if (this.wolf) this.actors.add(this.wolf.root);

    const count = world.sheep.length + 2;
    this.shadows = new THREE.InstancedMesh(blobGeometry(), shadowMaterial, count);
    this.shadows.renderOrder = 1;
    this.shadows.frustumCulled = false;
    this.actors.add(this.shadows);
    this.camReady = false;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 50 : 40;
    this.camera.updateProjectionMatrix();
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * aspect);
    this.distance = THREE.MathUtils.clamp(VIEW_WIDTH / (2 * Math.tan(hfov / 2)), 16, 40);
  }

  /** Turns a touch on the screen into a point on the meadow (world units). */
  pick(x: number, y: number): Vec | null {
    const ndc = new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return null;
    return { x: hit.x * UNITS_PER_METER, y: hit.z * UNITS_PER_METER };
  }

  update(dt: number) {
    this.time += dt;
    const world = this.world;
    this.farm.animate(this.time, dt);
    this.updateSnow(dt);
    if (!world) return;
    const time = this.time;
    const matrix = new THREE.Matrix4();

    world.sheep.forEach((s, i) => {
      const c = this.sheep[i];
      c.root.position.set(m(s.x), 0, m(s.y));
      c.root.rotation.y = -s.heading;
      c.animate({ speed: m(Math.hypot(s.vx, s.vy)), dt, time, panic: s.panic, happy: s.penned });
      matrix.makeScale(0.75, 1, 0.55).setPosition(m(s.x), 0.02, m(s.y));
      this.shadows?.setMatrixAt(i, matrix);
    });

    const d = world.dog;
    if (this.dog) {
      this.dog.root.position.set(m(d.x), 0, m(d.y));
      this.dog.root.rotation.y = -d.heading;
      this.dog.animate({ speed: m(Math.hypot(d.vx, d.vy)), dt, time });
      matrix.makeScale(0.7, 1, 0.45).setPosition(m(d.x), 0.02, m(d.y));
      this.shadows?.setMatrixAt(world.sheep.length, matrix);
    }

    const w = world.wolf;
    if (this.wolf && w) {
      this.wolf.root.visible = w.active;
      this.wolf.root.position.set(m(w.x), 0, m(w.y));
      this.wolf.root.rotation.y = -w.heading;
      this.wolf.animate({ speed: m(Math.hypot(w.vx, w.vy)), dt, time });
      matrix.makeScale(w.active ? 0.8 : 0, 1, w.active ? 0.5 : 0).setPosition(m(w.x), 0.02, m(w.y));
      this.shadows?.setMatrixAt(world.sheep.length + 1, matrix);
    } else {
      this.shadows?.setMatrixAt(world.sheep.length + 1, matrix.makeScale(0, 0, 0));
    }
    if (this.shadows) this.shadows.instanceMatrix.needsUpdate = true;

    this.updateArrow(world);
    this.updateRing(world);
    this.updatePops(world, dt);
    this.updateBarks(world, dt);
    this.updateCamera(world, dt);
  }

  // Bark shock waves: a big ring growing around the dog, and a little hop.
  private barkWaves: { mesh: THREE.Mesh; age: number }[] = [];
  private seenBarks = new WeakSet<Effect>();
  private dogHop = 0;

  private updateBarks(world: World, dt: number) {
    for (const b of world.barks) {
      if (this.seenBarks.has(b)) continue;
      this.seenBarks.add(b);
      const mesh = new THREE.Mesh(
        this.popRingGeometry,
        new THREE.MeshBasicMaterial({ color: '#FFF3C4', transparent: true, opacity: 0.85, depthWrite: false }),
      );
      mesh.position.set(m(b.x), 0.06, m(b.y));
      this.scene.add(mesh);
      this.barkWaves.push({ mesh, age: 0 });
      this.dogHop = 0.3;
    }
    for (const wave of this.barkWaves) {
      wave.age += dt;
      const t = Math.min(1, wave.age / 0.6);
      wave.mesh.scale.setScalar(0.6 + t * m(BARK_RADIUS));
      (wave.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - t);
    }
    for (const wave of this.barkWaves.filter((w) => w.age >= 0.6)) {
      this.scene.remove(wave.mesh);
      (wave.mesh.material as THREE.Material).dispose();
    }
    this.barkWaves = this.barkWaves.filter((w) => w.age < 0.6);
    if (this.dog) {
      this.dogHop = Math.max(0, this.dogHop - dt);
      this.dog.root.position.y = Math.sin((this.dogHop / 0.3) * Math.PI) * 0.35;
    }
  }

  private updateArrow(world: World) {
    const pen = world.level.pen;
    const [ox, oz] = OUTWARD[pen.gate];
    const gx = m(pen.x + pen.w / 2) + (ox * m(pen.w)) / 2;
    const gz = m(pen.y + pen.h / 2) + (oz * m(pen.h)) / 2;
    const bob = Math.sin(this.time * 4) * 0.25;
    this.arrow.visible = world.status === 'playing' && this.mode === 'follow';
    this.arrow.position.set(
      gx + ox * (1.6 + bob),
      0.9 + Math.abs(Math.sin(this.time * 4)) * 0.3,
      gz + oz * (1.6 + bob),
    );
    this.arrow.rotation.set(0, FACING[pen.gate], 0);
    this.arrow.rotateX(0.35);
  }

  private updateRing(world: World) {
    const show = world.touching && world.target !== null && this.mode === 'follow';
    this.ring.visible = show;
    if (show && world.target) {
      const s = 1 + Math.sin(this.time * 10) * 0.12;
      this.ring.position.set(m(world.target.x), 0.04, m(world.target.y));
      this.ring.scale.setScalar(s);
    }
  }

  private updatePops(world: World, dt: number) {
    for (const e of world.effects) {
      if (this.seenEffects.has(e)) continue;
      this.seenEffects.add(e);
      this.pops.push(this.makePop(m(e.x), m(e.y)));
    }
    for (const p of this.pops) {
      p.age += dt;
      const t = Math.min(1, p.age / 1.2);
      p.hearts.forEach((h, i) => {
        const pop = Math.min(1, p.age * 6);
        h.position.set(p.x + (i - 1) * 0.45 * t, 1.2 + t * 1.6 + (i === 1 ? 0.3 : 0), p.z);
        h.scale.setScalar(0.32 * pop * (1 - t * 0.4));
        h.rotation.y = this.time * 3 + i;
      });
      p.ring.scale.setScalar(0.5 + t * 2.2);
      (p.ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
    }
    const done = this.pops.filter((p) => p.age >= 1.2);
    for (const p of done) {
      for (const h of p.hearts) this.scene.remove(h);
      this.scene.remove(p.ring);
      (p.ring.material as THREE.Material).dispose();
    }
    this.pops = this.pops.filter((p) => p.age < 1.2);
  }

  private heartGeometry: THREE.BufferGeometry | null = null;
  private heartMaterial = new THREE.MeshLambertMaterial({
    color: '#FF4F7E',
    emissive: '#C2185B',
    emissiveIntensity: 0.3,
  });
  private popRingGeometry = new THREE.RingGeometry(0.85, 1, 32).rotateX(-Math.PI / 2);

  private makePop(x: number, z: number): Pop {
    if (!this.heartGeometry) {
      const s = new THREE.Shape();
      s.moveTo(0, -0.9);
      s.bezierCurveTo(-1.6, 0.1, -0.7, 1.3, 0, 0.5);
      s.bezierCurveTo(0.7, 1.3, 1.6, 0.1, 0, -0.9);
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.35,
        bevelEnabled: true,
        bevelSize: 0.12,
        bevelThickness: 0.12,
        bevelSegments: 2,
      });
      g.center();
      this.heartGeometry = g;
    }
    const hearts = [0, 1, 2].map(() => {
      const h = new THREE.Mesh(this.heartGeometry!, this.heartMaterial);
      this.scene.add(h);
      return h;
    });
    const ring = new THREE.Mesh(
      this.popRingGeometry,
      new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.9, depthWrite: false }),
    );
    ring.position.set(x, 0.05, z);
    this.scene.add(ring);
    return { hearts, ring, age: 0, x, z };
  }

  private updateCamera(world: World, dt: number) {
    const W = m(world.size.w);
    const H = m(world.size.h);
    const desired = new THREE.Vector3();

    if (this.mode === 'orbit') {
      const pen = world.level.pen;
      const cx = m(pen.x + pen.w / 2);
      const cz = m(pen.y + pen.h / 2) + 7;
      const a = this.time * 0.07 + 0.4;
      const r = 24;
      this.camera.position.set(cx + Math.sin(a) * r, 13, cz + Math.cos(a) * r);
      this.camera.lookAt(cx, 0, cz);
      return;
    }

    // Follow the dog, leaning a bit towards the flock so both stay in view.
    const free = world.sheep.filter((s) => !s.penned);
    let fx = world.dog.x;
    let fy = world.dog.y;
    if (free.length) {
      const sx = free.reduce((a, s) => a + s.x, 0) / free.length;
      const sy = free.reduce((a, s) => a + s.y, 0) / free.length;
      fx = world.dog.x * 0.7 + sx * 0.3;
      fy = world.dog.y * 0.7 + sy * 0.3;
    }
    if (!world.started && this.time < 2.2) {
      // Intro: start by showing the barn, then glide to the dog.
      const pen = world.level.pen;
      fx = pen.x + pen.w / 2;
      fy = pen.y + pen.h / 2;
    }
    desired.set(m(fx), 0, m(fy));

    const halfW =
      this.distance * Math.tan(Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * this.camera.aspect));
    const clampAxis = (v: number, size: number, half: number) =>
      size <= half * 2 ? size / 2 : THREE.MathUtils.clamp(v, half - 1.5, size - half + 1.5);
    desired.x = clampAxis(desired.x, W, halfW);
    desired.z = clampAxis(desired.z, H, halfW * 1.1);

    if (!this.camReady) {
      this.camTarget.copy(desired);
      this.camReady = true;
    } else {
      this.camTarget.lerp(desired, 1 - Math.exp(-dt * (this.time < 2.2 ? 1.5 : 3)));
    }
    const t = this.camTarget;
    this.camera.position.set(t.x, Math.sin(PITCH) * this.distance, t.z + Math.cos(PITCH) * this.distance);
    this.camera.lookAt(t.x, 0, t.z);
  }

  // Falling snow: flakes in a box around the camera target. When one lands, it starts again on top.
  private snow: { mesh: THREE.InstancedMesh; flakes: Float32Array } | null = null;

  private makeSnowfall() {
    const count = 260;
    const mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.06, 0),
      new THREE.MeshBasicMaterial({ color: '#FFFFFF', fog: false }),
      count,
    );
    mesh.frustumCulled = false;
    // x, y, z offset from the camera target + a little sway phase for each flake.
    const flakes = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      flakes[i * 4] = (Math.random() - 0.5) * SNOW_BOX;
      flakes[i * 4 + 1] = Math.random() * SNOW_HEIGHT;
      flakes[i * 4 + 2] = (Math.random() - 0.5) * SNOW_BOX;
      flakes[i * 4 + 3] = Math.random() * Math.PI * 2;
    }
    this.scene.add(mesh);
    return { mesh, flakes };
  }

  private updateSnow(dt: number) {
    const snow = this.snow;
    if (!snow) return;
    const { mesh, flakes } = snow;
    const matrix = new THREE.Matrix4();
    const c = this.camTarget;
    const n = flakes.length / 4;
    for (let i = 0; i < n; i++) {
      let y = flakes[i * 4 + 1] - dt * 1.4;
      if (y < 0) y += SNOW_HEIGHT;
      flakes[i * 4 + 1] = y;
      const sway = Math.sin(this.time * 1.3 + flakes[i * 4 + 3]) * 0.4;
      // Wrap around the camera target, so the snow is always where you look.
      const wrap = (v: number) => ((((v + SNOW_BOX / 2) % SNOW_BOX) + SNOW_BOX) % SNOW_BOX) - SNOW_BOX / 2;
      const x = c.x + wrap(flakes[i * 4] + sway - c.x);
      const z = c.z + wrap(flakes[i * 4 + 2] - c.z);
      matrix.makeTranslation(x, y, z);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  /** Less decoration, for phones that can't keep up. */
  setLowDetail() {
    this.farm.setLowDetail();
    if (this.snow) this.snow.mesh.count = 90;
  }

  dispose() {
    this.farm.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
