import { Canvas, createPicture, Picture, Skia, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';
import { useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { fill, oval, stroke } from '../game/render/paint';
import { dogSprite, drawDogTail, sheepSprite, WALK_FRAMES } from '../game/render/sprites';
import { useFrameLoop } from '../game/useFrameLoop';

/** Animated countryside behind the menus: sun, clouds, hills and a sheep parade. */
export function MenuBackground() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [picture, setPicture] = useState<SkPicture | null>(null);
  const clock = useRef(0);

  useFrameLoop((dt) => {
    clock.current += dt;
    const { width, height } = size;
    setPicture(createPicture((c) => drawScene(c, width, height, clock.current), Skia.XYWHRect(0, 0, width, height)));
  }, size.width > 0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.noTouch]} onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill}>{picture && <Picture picture={picture} />}</Canvas>
    </View>
  );
}

function cloud(c: SkCanvas, x: number, y: number, s: number) {
  const white = fill('#FFFFFF', 0.95);
  c.drawCircle(x, y, 18 * s, white);
  c.drawCircle(x + 20 * s, y - 8 * s, 22 * s, white);
  c.drawCircle(x + 42 * s, y, 17 * s, white);
  oval(c, x + 21 * s, y + 8 * s, 70 * s, 22 * s, white);
}

function drawScene(c: SkCanvas, w: number, h: number, t: number) {
  c.drawRect(Skia.XYWHRect(0, 0, w, h), fill('#8FD3F4'));
  c.drawRect(Skia.XYWHRect(0, h * 0.4, w, h * 0.3), fill('#B5E6FA', 0.7));

  // Sun with slowly turning rays
  const sx = w * 0.8;
  const sy = h * 0.12;
  c.drawCircle(sx, sy, 50, fill('#FFF3B0', 0.5));
  const ray = stroke('#FFE066', 5);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + t * 0.3;
    c.drawLine(sx + Math.cos(a) * 42, sy + Math.sin(a) * 42, sx + Math.cos(a) * 56, sy + Math.sin(a) * 56, ray);
  }
  c.drawCircle(sx, sy, 34, fill('#FFE066'));

  const span = w + 160;
  const drift = (base: number, speed: number) => ((((base + t * speed) % span) + span) % span) - 110;
  cloud(c, drift(20, 9), h * 0.09, 0.9);
  cloud(c, drift(w * 0.6, 6), h * 0.22, 0.7);
  cloud(c, drift(w * 1.1, 11), h * 0.33, 1);

  // Hills
  oval(c, w * 0.15, h * 0.7, w * 1.5, h * 0.42, fill('#86D06A'));
  oval(c, w * 0.95, h * 0.74, w * 1.3, h * 0.4, fill('#73C457'));
  c.drawRect(Skia.XYWHRect(0, h * 0.74, w, h * 0.26), fill('#8CD867'));

  // A fence along the hill
  const wood = fill('#C98A4B');
  const fy = h * 0.71;
  c.drawRect(Skia.XYWHRect(0, fy, w, 5), wood);
  c.drawRect(Skia.XYWHRect(0, fy + 12, w, 5), wood);
  for (let x = 10; x < w; x += 34) {
    c.drawRect(Skia.XYWHRect(x, fy - 8, 7, 32), fill('#8B5A2B'));
  }

  // Sheep parade with the dog behind them
  const groundY = h * 0.86;
  const loop = w + 300;
  const head = ((t * 45) % loop) - 60;
  const sheepScale = 1.7;
  for (let i = 0; i < 4; i++) {
    const x = head - i * 46;
    const y = groundY + Math.sin(i * 2.1) * 14 + Math.abs(Math.sin(t * 8 + i)) * -3;
    c.save();
    c.translate(x, y);
    c.scale(sheepScale, sheepScale);
    c.drawPicture(sheepSprite(Math.floor(t * 8 + i) % WALK_FRAMES));
    c.restore();
  }
  c.save();
  c.translate(head - 4 * 46 - 30, groundY + 4);
  c.scale(sheepScale, sheepScale);
  drawDogTail(c, t * 22);
  c.drawPicture(dogSprite(Math.floor(t * 10) % WALK_FRAMES));
  c.restore();
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
});
