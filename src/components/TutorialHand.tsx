import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/** A finger that shows "press and drag up" on the first level. */
export function TutorialHand({ bottom }: { bottom: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, false));
  }, [t]);

  const finger = useAnimatedStyle(() => {
    const v = t.get();
    return {
      opacity: v < 0.1 ? v / 0.1 : v > 0.85 ? (1 - v) / 0.15 : 1,
      transform: [{ translateY: -v * 140 }, { scale: v < 0.15 ? 1.15 - v : 1 }],
    };
  });
  const trail = useAnimatedStyle(() => ({ height: t.get() * 140, opacity: 0.5 }));

  return (
    <View style={[styles.box, { bottom }]}>
      <Animated.View style={[styles.trail, trail]} />
      <Animated.View style={[styles.finger, finger]}>
        <View style={styles.ring} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 190,
    alignItems: 'center',
    justifyContent: 'flex-end',
    pointerEvents: 'none',
  },
  trail: { position: 'absolute', bottom: 22, width: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  finger: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: '#FF9F1C' },
});
