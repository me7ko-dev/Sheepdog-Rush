import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type * as THREE from 'three';

import { sound } from '../audio/sound';
import { Button } from '../components/Button';
import { LockIcon, StarRow } from '../components/Icons';
import { useI18n, type StringKey } from '../i18n';
import { COATS, COLLARS, HATS, type HatId } from '../kennel/outfits';
import { useProgress } from '../storage/progress';
import { kennel, useOutfit } from '../storage/kennel';
import { KennelScene } from '../three/KennelScene';
import { ThreeView } from '../three/ThreeView';
import { theme } from '../theme';

type Item = { id: string; nameKey: StringKey; stars: number; swatch?: string };

/** Dress up the sheepdog with looks unlocked by stars. */
export function KennelScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { totalStars } = useProgress();
  const outfit = useOutfit();

  const create = useCallback(() => {
    const stage = new KennelScene();
    return {
      frame: (renderer: THREE.WebGLRenderer, dt: number) => {
        stage.update(dt);
        renderer.render(stage.scene, stage.camera);
      },
      resize: (w: number, h: number) => stage.resize(w, h),
      dispose: () => stage.dispose(),
    };
  }, []);

  const row = (title: string, items: Item[], selected: string, choose: (id: string) => void) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {items.map((item) => {
          const unlocked = totalStars >= item.stars;
          const on = item.id === selected;
          return (
            <Pressable
              key={item.id}
              disabled={!unlocked}
              onPress={() => {
                sound.play('click');
                choose(item.id);
              }}
              style={[styles.chip, on && styles.chipOn, !unlocked && styles.chipLocked]}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !unlocked }}
              accessibilityLabel={t(item.nameKey)}
            >
              {item.swatch && <View style={[styles.swatch, { backgroundColor: item.swatch }]} />}
              {unlocked ? (
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(item.nameKey)}</Text>
              ) : (
                <View style={styles.lockRow}>
                  <LockIcon size={16} />
                  <Text style={styles.lockText}>{t('needStars', { n: item.stars })}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Button title={`‹ ${t('back')}`} onPress={onBack} size="small" color="blue" />
        <Text style={styles.title}>{t('kennel')}</Text>
        <View style={styles.total}>
          <StarRow filled={1} total={1} size={20} />
          <Text style={styles.totalText}>{totalStars}</Text>
        </View>
      </View>

      <View style={styles.stage}>
        <ThreeView create={create} active />
      </View>
      <Text style={styles.hint}>{t('kennelHint')}</Text>

      <Animated.ScrollView
        entering={FadeInDown.duration(400)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {row(
          t('coat'),
          COATS.map((c) => ({ ...c, swatch: c.fur })),
          outfit.coat,
          (id) => kennel.set({ coat: id }),
        )}
        {row(
          t('collar'),
          COLLARS.map((c) => ({ ...c, swatch: c.color })),
          outfit.collar,
          (id) => kennel.set({ collar: id }),
        )}
        {row(t('hat'), HATS, outfit.hat, (id) => kennel.set({ hat: id as HatId }))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.grass },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.white,
    textShadowColor: theme.grassDark,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 1,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.cream,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  totalText: { fontSize: 16, fontWeight: '800', color: theme.text },
  stage: {
    height: 300,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: theme.creamDark,
    backgroundColor: '#BFE6FB',
  },
  hint: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  section: { marginBottom: 12 },
  sectionTitle: { color: theme.white, fontWeight: '900', fontSize: 18, marginLeft: 18, marginBottom: 6 },
  chips: { paddingHorizontal: 14, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.cream,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: theme.creamDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 46,
  },
  chipOn: { borderColor: theme.buttons.orange.bg, backgroundColor: '#FFF0D6' },
  chipLocked: { backgroundColor: '#E4DCCB', borderColor: '#C9BCA5' },
  chipText: { fontSize: 15, fontWeight: '800', color: theme.text },
  chipTextOn: { color: theme.buttons.orange.edge },
  swatch: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockText: { fontSize: 13, fontWeight: '800', color: '#9C8D78' },
});
