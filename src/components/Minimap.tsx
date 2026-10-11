import { Canvas, createPicture, Picture, Skia } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';

import { fill, roundRect, stroke } from '../game/render/paint';
import type { World } from '../game/types';
import { barnRect, penInnerRect } from '../game/world';

const MAP_WIDTH = 74;
const BACKGROUND = { spring: '#7BC950', autumn: '#A3C257', winter: '#B7CADB' };

/** A small map in the corner, so you can find sheep that are off screen. */
export function Minimap({ world, tick }: { world: World; tick: number }) {
  const { w, h } = world.size;
  const scale = MAP_WIDTH / w;
  const height = Math.min(130, h * scale);
  const sy = height / h;

  // Redrawn whenever `tick` changes (a few times per second).
  const picture = drawMap(world, tick, height, scale, sy);

  return (
    <View style={[styles.box, { height }]}>
      <Canvas style={{ width: MAP_WIDTH, height }}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}

function drawMap(world: World, _tick: number, height: number, scale: number, sy: number) {
  return createPicture(
    (c) => {
      roundRect(c, 0, 0, MAP_WIDTH, height, 8, fill(BACKGROUND[world.level.theme ?? 'spring']));
      c.save();
      c.scale(scale, sy);
      for (const r of world.water) c.drawRect(Skia.XYWHRect(r.x, r.y, r.w, r.h), fill('#47BDF5'));
      for (const mud of world.mud) c.drawCircle(mud.x, mud.y, mud.r, fill('#7A5230'));
      for (const ice of world.ice) {
        if ('r' in ice) c.drawCircle(ice.x, ice.y, ice.r, fill('#8FD0F2'));
        else c.drawRect(Skia.XYWHRect(ice.x, ice.y, ice.w, ice.h), fill('#8FD0F2'));
      }
      for (const b of world.level.bridges) c.drawRect(Skia.XYWHRect(b.x, b.y, b.w, b.h), fill('#B98353'));
      const inner = penInnerRect(world.level.pen);
      c.drawRect(Skia.XYWHRect(inner.x, inner.y, inner.w, inner.h), fill('#F2DD98'));
      const barn = barnRect(world.level.pen);
      c.drawRect(Skia.XYWHRect(barn.x, barn.y, barn.w, barn.h), fill('#D9483A'));
      c.restore();

      const dot = (x: number, y: number, r: number, color: string, ring?: string) => {
        c.drawCircle(x * scale, y * sy, r, fill(color));
        if (ring) c.drawCircle(x * scale, y * sy, r, stroke(ring, 1));
      };
      for (const s of world.sheep) dot(s.x, s.y, 2.6, s.black ? '#2B2830' : '#FFFFFF', s.black ? '#FFFFFF' : '#6B6B6B');
      if (world.wolf?.active) dot(world.wolf.x, world.wolf.y, 3.4, '#E53935', '#FFFFFF');
      dot(world.dog.x, world.dog.y, 3.4, '#FFC531', '#3A2A10');
      roundRect(c, 0.75, 0.75, MAP_WIDTH - 1.5, height - 1.5, 8, stroke('#FFFFFF', 1.5));
    },
    Skia.XYWHRect(0, 0, MAP_WIDTH, height),
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: MAP_WIDTH,
    borderRadius: 8,
    opacity: 0.92,
    pointerEvents: 'none',
  },
});
