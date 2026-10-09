import { PaintStyle, Skia, StrokeCap, StrokeJoin, type SkCanvas, type SkPaint } from '@shopify/react-native-skia';

// Paints are reused (creating them every frame would be slow).
const cache = new Map<string, SkPaint>();

export function fill(color: string, alpha = 1): SkPaint {
  const key = `f|${color}|${alpha}`;
  let p = cache.get(key);
  if (!p) {
    p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(Skia.Color(color));
    p.setAlphaf(alpha);
    cache.set(key, p);
  }
  return p;
}

export function stroke(color: string, width: number, alpha = 1): SkPaint {
  const key = `s|${color}|${width}|${alpha}`;
  let p = cache.get(key);
  if (!p) {
    p = Skia.Paint();
    p.setAntiAlias(true);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(width);
    p.setStrokeCap(StrokeCap.Round);
    p.setStrokeJoin(StrokeJoin.Round);
    p.setColor(Skia.Color(color));
    p.setAlphaf(alpha);
    cache.set(key, p);
  }
  return p;
}

export function oval(c: SkCanvas, cx: number, cy: number, w: number, h: number, paint: SkPaint) {
  c.drawOval(Skia.XYWHRect(cx - w / 2, cy - h / 2, w, h), paint);
}

export function roundRect(c: SkCanvas, x: number, y: number, w: number, h: number, r: number, paint: SkPaint) {
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r), paint);
}

/** A little heart shape centred on (x, y). */
export function heart(c: SkCanvas, x: number, y: number, size: number, paint: SkPaint) {
  const s = size / 2;
  const p = Skia.PathBuilder.Make();
  p.moveTo(x, y + s);
  p.cubicTo(x - s * 2, y - s * 0.2, x - s * 0.9, y - s * 1.6, x, y - s * 0.5);
  p.cubicTo(x + s * 0.9, y - s * 1.6, x + s * 2, y - s * 0.2, x, y + s);
  p.close();
  c.drawPath(p.detach(), paint);
}

/** A five-pointed star centred on (x, y). */
export function star(c: SkCanvas, x: number, y: number, outer: number, paint: SkPaint) {
  const inner = outer * 0.48;
  const p = Skia.PathBuilder.Make();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) p.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else p.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  p.close();
  c.drawPath(p.detach(), paint);
}
