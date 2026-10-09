import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type * as THREE from 'three';

import { aimDog, releaseDog, resultStars, stepWorld } from '../game/simulation';
import type { LevelDef, World } from '../game/types';
import { createWorld } from '../game/world';
import { FarmScene } from '../three/FarmScene';
import { ThreeView } from '../three/ThreeView';
import { Minimap } from './Minimap';

// Which 3D scene shows which world (used to turn touches into meadow positions).
const scenes = new WeakMap<World, FarmScene>();

export type Hud = { timeLeft: number; penned: number; total: number; started: boolean };
export type GameResult = { won: boolean; stars: number; time: number; sheepLeft: number; reason: 'time' | 'wolf' | null };

type Props = {
  level: LevelDef;
  paused: boolean;
  onHud: (hud: Hud) => void;
  onEnd: (result: GameResult) => void;
  onWolf: () => void;
};

/**
 * The playing field: runs the simulation, draws it in 3D and reads the finger.
 * To restart a level, give this component a new `key` (a fresh world is created on mount).
 */
export function GameView({ level, paused, onHud, onEnd, onWolf }: Props) {
  const [world] = useState(() => createWorld(level));
  const [mapTick, setMapTick] = useState(0);
  const callbacks = useRef({ onHud, onEnd, onWolf });
  useLayoutEffect(() => {
    callbacks.current = { onHud, onEnd, onWolf };
  });

  // Web only: lets the automated screenshot tests look at the running game.
  useEffect(() => {
    if (Platform.OS === 'web') (globalThis as { __sheepdogWorld?: World }).__sheepdogWorld = world;
  }, [world]);

  const create = useCallback(() => {
    const scene = new FarmScene(world.level, 'follow');
    scene.setWorld(world);
    scenes.set(world, scene);
    let lastHud = '';
    let mapTimer = 0;
    let endTimer: ReturnType<typeof setTimeout> | null = null;

    return {
      frame: (renderer: THREE.WebGLRenderer, dt: number) => {
        const events = stepWorld(world, dt);
        for (const e of events) {
          if (e.type === 'penned') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          if (e.type === 'wolf') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            callbacks.current.onWolf();
          }
          if (e.type === 'won' || e.type === 'lost') {
            const result: GameResult = {
              won: e.type === 'won',
              stars: resultStars(world),
              time: world.elapsed,
              sheepLeft: world.sheep.filter((s) => !s.penned).length,
              reason: e.type === 'lost' ? e.reason : null,
            };
            Haptics.notificationAsync(
              result.won ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
            ).catch(() => {});
            // Short pause so the player sees the last sheep go in.
            endTimer = setTimeout(() => callbacks.current.onEnd(result), 900);
          }
        }

        const hud: Hud = {
          timeLeft: Math.max(0, Math.ceil(world.level.timeLimit - world.elapsed)),
          penned: world.sheep.filter((s) => s.penned).length,
          total: world.sheep.length,
          started: world.started,
        };
        const key = `${hud.timeLeft}|${hud.penned}|${hud.started}`;
        if (key !== lastHud) {
          lastHud = key;
          callbacks.current.onHud(hud);
        }

        mapTimer += dt;
        if (mapTimer > 0.12) {
          mapTimer = 0;
          setMapTick((t) => t + 1);
        }

        scene.update(dt);
        renderer.render(scene.scene, scene.camera);
      },
      resize: (width: number, height: number) => scene.resize(width, height),
      dispose: () => {
        if (endTimer) clearTimeout(endTimer);
        scene.dispose();
        scenes.delete(world);
      },
    };
  }, [world]);

  const gesture = useMemo(() => {
    const aim = (x: number, y: number) => {
      const p = scenes.get(world)?.pick(x, y);
      if (p) aimDog(world, p);
    };
    return Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin((e) => aim(e.x, e.y))
      .onUpdate((e) => aim(e.x, e.y))
      .onFinalize(() => releaseDog(world));
  }, [world]);

  return (
    <View style={styles.fill}>
      <GestureDetector gesture={gesture}>
        <View style={styles.fill} collapsable={false}>
          <ThreeView create={create} active={!paused} />
        </View>
      </GestureDetector>
      <Minimap world={world} tick={mapTick} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
