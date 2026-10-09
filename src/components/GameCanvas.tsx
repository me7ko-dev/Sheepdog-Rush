import { Canvas, Picture, type SkPicture } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { renderFrame } from '../game/render/frame';
import { computeView, createBackground } from '../game/render/scene';
import { resultStars, stepWorld } from '../game/simulation';
import type { LevelDef } from '../game/types';
import { useFrameLoop } from '../game/useFrameLoop';
import { createWorld } from '../game/world';

export type Hud = { timeLeft: number; penned: number; total: number; started: boolean };
export type GameResult = { won: boolean; stars: number; time: number; sheepLeft: number };

type Props = {
  level: LevelDef;
  /** Change this number to restart the level. */
  runKey: number;
  paused: boolean;
  onHud: (hud: Hud) => void;
  onEnd: (result: GameResult) => void;
};

/** The playing field: runs the simulation, draws it and reads the finger. */
export function GameCanvas({ level, runKey, paused, onHud, onEnd }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [picture, setPicture] = useState<SkPicture | null>(null);
  const world = useMemo(() => createWorld(level), [level, runKey]);
  const view = useMemo(() => computeView(size.width, size.height), [size]);
  const background = useMemo(
    () => (size.width > 0 ? createBackground(level, view) : null),
    [level, view, size.width],
  );
  const lastHud = useRef('');
  const currentWorld = useRef(world);
  currentWorld.current = world;

  useFrameLoop((dt) => {
    if (!background) return;
    const events = stepWorld(world, dt);
    for (const e of events) {
      if (e.type === 'penned') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (e.type === 'won' || e.type === 'lost') {
        const result: GameResult = {
          won: e.type === 'won',
          stars: resultStars(world),
          time: world.elapsed,
          sheepLeft: world.sheep.filter((s) => !s.penned).length,
        };
        if (result.won) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        // Short pause so the player sees the last sheep go in.
        setTimeout(() => {
          if (currentWorld.current === world) onEnd(result);
        }, 700);
      }
    }

    const hud: Hud = {
      timeLeft: Math.max(0, Math.ceil(level.timeLimit - world.elapsed)),
      penned: world.sheep.filter((s) => s.penned).length,
      total: world.sheep.length,
      started: world.started,
    };
    const key = `${hud.timeLeft}|${hud.penned}|${hud.started}`;
    if (key !== lastHud.current) {
      lastHud.current = key;
      onHud(hud);
    }

    setPicture(renderFrame(world, view, background));
  }, !paused && background !== null);

  const gesture = useMemo(() => {
    const toWorld = (x: number, y: number) => ({
      x: (x - view.offsetX) / view.scale,
      y: (y - view.offsetY) / view.scale,
    });
    return Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin((e) => {
        if (world.status !== 'playing') return;
        world.target = toWorld(e.x, e.y);
        world.touching = true;
        world.started = true;
      })
      .onUpdate((e) => {
        if (world.status !== 'playing') return;
        world.target = toWorld(e.x, e.y);
      })
      .onFinalize(() => {
        world.touching = false;
      });
  }, [world, view]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.fill} onLayout={onLayout} collapsable={false}>
        <Canvas style={styles.fill}>{picture && <Picture picture={picture} />}</Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
