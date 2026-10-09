import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type * as THREE from 'three';

import { stepWorld } from '../game/simulation';
import type { LevelDef } from '../game/types';
import { createWorld } from '../game/world';
import { FarmScene } from '../three/FarmScene';
import { ThreeView } from '../three/ThreeView';

// A little farm for the start screen: the camera slowly circles around
// while the dog trots in loops and the flock runs around.
const MENU_FARM: LevelDef = {
  id: 0,
  nameKey: 'level_1',
  size: { w: 520, h: 640 },
  sheepCount: 9,
  blackSheep: 2,
  sheepArea: { x: 150, y: 330, w: 220, h: 140 },
  dogStart: { x: 260, y: 560 },
  pen: { x: 190, y: 92, w: 140, h: 110, gate: 'bottom', gateSize: 66 },
  fences: [],
  bushes: [
    { x: 90, y: 300, r: 24 },
    { x: 440, y: 260, r: 22 },
  ],
  rocks: [{ x: 420, y: 520, r: 16 }],
  hay: [
    { x: 110, y: 520, r: 16 },
    { x: 140, y: 545, r: 15 },
  ],
  water: [],
  bridges: [],
  timeLimit: 9999,
  starTimes: [1, 2],
  seed: 5,
};

export function MenuBackground({ active = true }: { active?: boolean }) {
  const world = useMemo(() => {
    const w = createWorld(MENU_FARM);
    // In the menu nobody gets locked in the yard, so the flock keeps running around.
    w.penInner = { x: -999, y: -999, w: 1, h: 1 };
    return w;
  }, []);

  const create = useCallback(() => {
    const scene = new FarmScene(MENU_FARM, 'orbit');
    scene.setWorld(world);
    let t = 0;
    return {
      frame: (renderer: THREE.WebGLRenderer, dt: number) => {
        t += dt;
        // The dog runs a lazy figure-eight below the flock.
        const a = t * 0.45;
        world.target = { x: 260 + Math.sin(a) * 170, y: 440 + Math.sin(a * 2) * 90 };
        stepWorld(world, dt);
        scene.update(dt);
        renderer.render(scene.scene, scene.camera);
      },
      resize: (w: number, h: number) => scene.resize(w, h),
      onSlow: () => scene.setLowDetail(),
      dispose: () => scene.dispose(),
    };
  }, [world]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.noTouch]}>
      <ThreeView create={create} active={active} />
    </View>
  );
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
});
