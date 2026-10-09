// Renders artwork (app icon, splash image, store banner) from the game's own 3D models.
// Used by tools/art/render.js. Opened in a browser page with ?mode=icon|sheep|banner.
import * as THREE from 'three';

import { LEVELS } from '../../src/game/levels';
import { stepWorld } from '../../src/game/simulation';
import { createWorld } from '../../src/game/world';
import { createCanine, createSheep, DOG_STYLE } from '../../src/three/characters';
import { FarmScene } from '../../src/three/FarmScene';

const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'icon';
const width = Number(params.get('w') ?? 1024);
const height = Number(params.get('h') ?? 1024);

const canvas = document.getElementById('c') as HTMLCanvasElement;
canvas.width = width;
canvas.height = height;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(width, height, false);
renderer.setClearColor(0x000000, 0);

function lights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight('#EAF7FF', '#5E9E3A', 2.3));
  const sun = new THREE.DirectionalLight('#FFF0D2', 2.4);
  sun.position.set(6, 8, 5);
  scene.add(sun);
}

if (mode === 'banner') {
  // A wide shot of the farm for the store banner.
  const level = LEVELS[3];
  const world = createWorld(level);
  const farm = new FarmScene(level, 'orbit');
  farm.setWorld(world);
  farm.resize(width, height);
  for (let i = 0; i < 90; i++) {
    world.target = { x: 260 + Math.sin(i / 10) * 120, y: 800 };
    stepWorld(world, 1 / 30);
    farm.update(1 / 30);
  }
  renderer.render(farm.scene, farm.camera);
} else {
  const scene = new THREE.Scene();
  lights(scene);
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 50);

  const sheep = createSheep(false, 2);
  sheep.animate({ speed: 0, dt: 0.016, time: 0, panic: 1 });
  scene.add(sheep.root);

  if (mode === 'icon') {
    // Close-up: the sheep looks at you, the border collie pops in next to it.
    sheep.root.rotation.y = 0.45;
    sheep.root.position.set(0, 0, 0.25);
    const dog = createCanine(DOG_STYLE);
    dog.root.position.set(0.55, -0.12, -0.62);
    dog.root.rotation.y = -0.35;
    dog.setTongue(true);
    dog.animate({ speed: 0, dt: 0.016, time: 0.1 });
    scene.add(dog.root);
    if (params.get('hill') !== '0') {
      const hill = new THREE.Mesh(
        new THREE.SphereGeometry(1, 48, 24),
        new THREE.MeshLambertMaterial({ color: '#7BCB4F' }),
      );
      hill.scale.set(4, 0.8, 4);
      hill.position.set(-0.6, -0.66, -0.1);
      scene.add(hill);
    }
    camera.position.set(3.4, 1.3, -0.1);
    camera.lookAt(0, 0.72, -0.1);
  } else {
    sheep.root.rotation.y = 0.55;
    camera.position.set(3.7, 1.35, 1.4);
    camera.lookAt(0.05, 0.6, 0);
  }
  renderer.render(scene, camera);
}

(window as unknown as { artReady: boolean }).artReady = true;
