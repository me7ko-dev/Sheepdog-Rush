import * as THREE from 'three';

import { kennel } from '../storage/kennel';
import { createCanine, dogStyleFor, type CanineCritter } from './characters';
import { blobGeometry, Parts, shadowMaterial, shapes } from './kit';

/** A little stage for the Kennel screen: the dog turns slowly on a patch of grass. */
export class KennelScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  private dog: CanineCritter | null = null;
  private holder = new THREE.Group();
  private time = 0;
  private unsubscribe: () => void;

  constructor() {
    this.scene.background = new THREE.Color('#BFE6FB');
    this.scene.add(new THREE.HemisphereLight('#EAF7FF', '#5E9E3A', 2.3));
    const sun = new THREE.DirectionalLight('#FFF0D2', 2.2);
    sun.position.set(4, 8, 6);
    this.scene.add(sun);

    const ground = new Parts();
    ground.add(shapes.disc, '#7BCB4F', { pos: [0, -0.06, 0], scale: [1.6, 0.12, 1.6] });
    ground.add(shapes.disc, '#6AB443', { pos: [0, -0.13, 0], scale: [1.62, 0.04, 1.62] });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      ground.add(shapes.ball, ['#FFFFFF', '#FFE066', '#FF9AA2'][i % 3], {
        pos: [Math.cos(a) * 1.3, 0.02, Math.sin(a) * 1.3],
        scale: [0.06, 0.03, 0.06],
      });
    }
    this.scene.add(ground.mesh(false));
    const shadow = new THREE.Mesh(blobGeometry(), shadowMaterial);
    shadow.scale.set(0.9, 1, 0.55);
    shadow.position.y = 0.005;
    this.holder.add(shadow);
    this.scene.add(this.holder);

    this.makeDog();
    this.unsubscribe = kennel.subscribe(() => this.makeDog());
  }

  private makeDog() {
    if (this.dog) this.holder.remove(this.dog.root);
    this.dog = createCanine(dogStyleFor(kennel.get()));
    this.dog.setTongue(true);
    this.holder.add(this.dog.root);
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 1.25, 3.1);
    this.camera.lookAt(0, 0.62, 0);
  }

  update(dt: number) {
    this.time += dt;
    this.holder.rotation.y = -1.15 + Math.sin(this.time * 0.6) * 0.7;
    this.dog?.animate({ speed: 0, dt, time: this.time });
  }

  dispose() {
    this.unsubscribe();
  }
}
