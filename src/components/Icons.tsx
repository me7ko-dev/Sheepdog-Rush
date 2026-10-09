import { Canvas, createPicture, Picture, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { fill, star, stroke } from '../game/render/paint';
import { sheepSprite } from '../game/render/sprites';
import { theme } from '../theme';

/** A row of stars, `filled` of them gold. Drawn with Skia. */
export function StarRow({ filled, total = 3, size = 22 }: { filled: number; total?: number; size?: number }) {
  const width = size * total + (total - 1) * size * 0.15;
  const picture = useMemo(
    () =>
      createPicture(
        (c) => {
          for (let i = 0; i < total; i++) {
            const x = size / 2 + i * size * 1.15;
            const on = i < filled;
            star(c, x, size / 2 + 1, size * 0.48, fill(on ? theme.gold : theme.starEmpty));
            star(c, x, size / 2 + 1, size * 0.48, stroke(on ? theme.goldDark : '#BFAE8E', size * 0.07));
          }
        },
        Skia.XYWHRect(0, 0, width, size + 2),
      ),
    [filled, total, size, width],
  );
  return (
    <Canvas style={{ width, height: size + 2 }}>
      <Picture picture={picture} />
    </Canvas>
  );
}

/** One big star (used on the result screen, so each can pop in on its own). */
export function BigStar({ on, size = 64 }: { on: boolean; size?: number }) {
  return <StarRow filled={on ? 1 : 0} total={1} size={size} />;
}

/** A small sheep, for the sheep counter. */
export function SheepIcon({ size = 28 }: { size?: number }) {
  const picture = useMemo(
    () =>
      createPicture(
        (c) => {
          c.translate(size / 2 + 1, size / 2);
          c.scale(size / 32, size / 32);
          c.rotate(-90, 0, 0);
          c.drawPicture(sheepSprite(null));
        },
        Skia.XYWHRect(0, 0, size, size),
      ),
    [size],
  );
  return (
    <Canvas style={{ width: size, height: size }}>
      <Picture picture={picture} />
    </Canvas>
  );
}

/** A gear (settings) icon. */
export function GearIcon({ size = 26, color = '#5B3A1A' }: { size?: number; color?: string }) {
  const picture = useMemo(
    () =>
      createPicture(
        (c) => {
          const r = size / 2;
          c.translate(r, r);
          for (let i = 0; i < 8; i++) {
            c.save();
            c.rotate(i * 45, 0, 0);
            c.drawRRect(Skia.RRectXY(Skia.XYWHRect(-r * 0.17, -r * 0.98, r * 0.34, r * 0.4), 2, 2), fill(color));
            c.restore();
          }
          c.drawCircle(0, 0, r * 0.68, fill(color));
          c.drawCircle(0, 0, r * 0.28, fill('#FFF8E7'));
        },
        Skia.XYWHRect(0, 0, size, size),
      ),
    [size, color],
  );
  return (
    <Canvas style={{ width: size, height: size }}>
      <Picture picture={picture} />
    </Canvas>
  );
}

/** A padlock made from plain views. */
export function LockIcon({ size = 30 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={[
          styles.shackle,
          { width: size * 0.6, height: size * 0.55, borderRadius: size * 0.3, borderWidth: size * 0.12 },
        ]}
      />
      <View
        style={[
          styles.body,
          { width: size * 0.85, height: size * 0.6, borderRadius: size * 0.14, marginTop: -size * 0.18 },
        ]}
      >
        <View
          style={{ width: size * 0.14, height: size * 0.22, borderRadius: size * 0.07, backgroundColor: '#7A6A55' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shackle: { borderColor: '#9C8D78', borderBottomWidth: 0 },
  body: { backgroundColor: '#C2B49E', alignItems: 'center', justifyContent: 'center' },
});
