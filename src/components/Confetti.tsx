import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const COLORS = ['#FFC83D', '#FF6F91', '#5BBA47', '#3FA7D6', '#FF9F1C', '#FFFFFF'];
const PIECES = 36;

// Fixed "random" values so the confetti looks the same every time (and render stays pure).
const pieces = Array.from({ length: PIECES }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    x: r(1),
    delay: r(2) * 500,
    duration: 1800 + r(3) * 1200,
    drift: (r(4) - 0.5) * 120,
    spin: (r(5) - 0.5) * 1440,
    w: 7 + r(6) * 6,
    h: 10 + r(7) * 8,
    color: COLORS[i % COLORS.length],
  };
});

function Piece({ p, height, width }: { p: (typeof pieces)[number]; height: number; width: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(p.delay, withTiming(1, { duration: p.duration, easing: Easing.in(Easing.quad) })));
  }, [t, p]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get() > 0 ? 1 - Math.max(0, t.get() - 0.85) / 0.15 : 0,
    transform: [
      { translateX: p.x * width + p.drift * t.get() },
      { translateY: -30 + t.get() * (height + 60) },
      { rotate: `${p.spin * t.get()}deg` },
    ],
  }));
  return <Animated.View style={[styles.piece, { width: p.w, height: p.h, backgroundColor: p.color }, style]} />;
}

/** Colorful paper pieces falling over the screen (for a win). */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={styles.layer}>
      {pieces.map((p, i) => (
        <Piece key={i} p={p} width={width} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  piece: { position: 'absolute', top: 0, left: 0, borderRadius: 2 },
});
