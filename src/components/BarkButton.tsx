import { Canvas, createPicture, Picture, Skia } from '@shopify/react-native-skia';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BARK_COOLDOWN } from '../game/constants';
import { stroke } from '../game/render/paint';
import type { World } from '../game/types';
import { useI18n } from '../i18n';
import { theme } from '../theme';

const SIZE = 78;

/** The big "WOOF!" button. A ring fills up while the bark recharges. */
export function BarkButton({ world, tick, onPress }: { world: World; tick: number; onPress: () => void }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const ready = world.barkCooldown <= 0;
  const progress = 1 - world.barkCooldown / BARK_COOLDOWN;
  const ring = drawRing(progress, tick);

  return (
    <View style={[styles.box, { bottom: insets.bottom + 18 }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.button, !ready && styles.waiting, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t('bark')}
        hitSlop={10}
      >
        <Text style={styles.text}>{t('bark')}</Text>
      </Pressable>
      {!ready && (
        <Canvas style={styles.ring}>
          <Picture picture={ring} />
        </Canvas>
      )}
    </View>
  );
}

function drawRing(progress: number, _tick: number) {
  return createPicture(
    (c) => {
      const path = Skia.PathBuilder.Make();
      path.addArc(Skia.XYWHRect(4, 4, SIZE - 8, SIZE - 8), -90, Math.max(1, progress * 360));
      c.drawPath(path.detach(), stroke('#FFFFFF', 6));
    },
    Skia.XYWHRect(0, 0, SIZE, SIZE),
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', right: 16, width: SIZE, height: SIZE },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: theme.buttons.orange.bg,
    borderBottomWidth: 6,
    borderColor: theme.buttons.orange.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waiting: { backgroundColor: '#C9B48F', borderColor: '#A08E6C' },
  pressed: { transform: [{ scale: 0.92 }] },
  text: {
    color: theme.white,
    fontSize: 17,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  ring: { position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, pointerEvents: 'none' },
});
