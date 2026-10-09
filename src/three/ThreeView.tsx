import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import * as THREE from 'three';

export type ThreeController = {
  /** Called every frame: update things, then draw with `renderer.render(...)`. */
  frame: (renderer: THREE.WebGLRenderer, dt: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

type Props = {
  /** Creates the scene once the 3D surface is ready. */
  create: () => ThreeController;
  /** When false, nothing moves and nothing is redrawn (pause). */
  active: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A 3D surface for three.js that works in Expo Go (native) and on the web.
 * three.js expects a browser <canvas>; on phones we hand it a tiny stand-in
 * that returns the expo-gl context (the same trick react-three-fiber uses).
 */
export function ThreeView({ create, active, style }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const controller = useRef<ThreeController | null>(null);
  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  const gl = useRef<ExpoWebGLRenderingContext | null>(null);
  const createRef = useRef(create);
  const sizeRef = useRef(size);
  useLayoutEffect(() => {
    createRef.current = create;
    sizeRef.current = size;
  });

  const onContextCreate = (context: ExpoWebGLRenderingContext) => {
    gl.current = context;
    const { width, height } = sizeRef.current;
    const canvas =
      Platform.OS === 'web'
        ? ((context as unknown as WebGL2RenderingContext).canvas as HTMLCanvasElement)
        : ({
            width: context.drawingBufferWidth,
            height: context.drawingBufferHeight,
            clientWidth: context.drawingBufferWidth,
            clientHeight: context.drawingBufferHeight,
            style: {},
            addEventListener: () => {},
            removeEventListener: () => {},
            getContext: () => context,
          } as unknown as HTMLCanvasElement);

    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    const pixelRatio = Platform.OS === 'web' ? Math.min(2, window.devicePixelRatio || 1) : context.drawingBufferWidth / width;
    r.setPixelRatio(pixelRatio);
    r.setSize(width, height, false);
    renderer.current = r;

    const c = createRef.current();
    c.resize(width, height);
    controller.current = c;
  };

  // Resize when the view changes size.
  useEffect(() => {
    if (renderer.current && controller.current && size.width > 0) {
      renderer.current.setSize(size.width, size.height, false);
      controller.current.resize(size.width, size.height);
    }
  }, [size]);

  // The frame loop.
  useEffect(() => {
    if (!active) return;
    let id = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(0.033, (now - last) / 1000) : 0;
      last = now;
      const c = controller.current;
      const r = renderer.current;
      if (c && r && dt > 0) {
        c.frame(r, dt);
        gl.current?.endFrameEXP();
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [active]);

  // Clean up when the screen closes.
  useEffect(
    () => () => {
      controller.current?.dispose();
      renderer.current?.dispose();
      controller.current = null;
      renderer.current = null;
    },
    [],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  return (
    <View style={[styles.fill, style]} onLayout={onLayout}>
      {size.width > 0 && <GLView style={StyleSheet.absoluteFill} msaaSamples={4} onContextCreate={onContextCreate} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
