import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { theme, type ButtonColor } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  color?: ButtonColor;
  size?: 'big' | 'normal' | 'small';
  style?: StyleProp<ViewStyle>;
};

/** A chunky, bouncy cartoon button. */
export function Button({ title, onPress, color = 'green', size = 'normal', style }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const c = theme.buttons[color];

  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => (scale.value = withSpring(0.93, { damping: 15, stiffness: 400 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 10, stiffness: 300 }))}
        style={[
          styles.button,
          size === 'big' && styles.big,
          size === 'small' && styles.small,
          { backgroundColor: c.bg, borderColor: c.edge },
        ]}
      >
        <Text style={[styles.text, size === 'big' && styles.bigText, size === 'small' && styles.smallText]}>
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 150,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: theme.radius,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  big: { minWidth: 210, paddingVertical: 16, borderRadius: 24 },
  small: { minWidth: 0, paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 4, borderRadius: 14 },
  text: {
    color: theme.white,
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  bigText: { fontSize: 30 },
  smallText: { fontSize: 16 },
});
