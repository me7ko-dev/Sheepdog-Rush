import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { LockIcon, StarRow } from '../components/Icons';
import { LEVELS, WORLDS } from '../game/levels';
import { useI18n } from '../i18n';
import { useProgress } from '../storage/progress';
import { theme } from '../theme';
import { formatTime } from './ResultOverlay';

const COLUMNS = 3;

/** Banner and tile colors for each world (spring, autumn, winter). */
const WORLD_LOOK = [
  { banner: null, tile: null },
  { banner: { backgroundColor: '#C8692B' }, tile: { backgroundColor: '#FFF1DE', borderColor: '#E5B57A' } },
  { banner: { backgroundColor: '#4F8FC0' }, tile: { backgroundColor: '#F1F7FD', borderColor: '#A9C8E2' } },
];

export function LevelSelectScreen({ onBack, onSelect }: { onBack: () => void; onSelect: (levelId: number) => void }) {
  const { t } = useI18n();
  const { starsFor, bestTime, isUnlocked, totalStars } = useProgress();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gap = 14;
  const tileSize = Math.min(120, (width - 40 - gap * (COLUMNS - 1)) / COLUMNS);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Button title={`‹ ${t('back')}`} onPress={onBack} size="small" color="blue" />
        <Text style={styles.title}>{t('levels')}</Text>
        <View style={styles.total}>
          <StarRow filled={1} total={1} size={20} />
          <Text style={styles.totalText}>
            {totalStars}/{LEVELS.length * 3}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        {WORLDS.map((world, w) => {
          const worldStars = world.levels.reduce((sum, l) => sum + starsFor(l.id), 0);
          const look = WORLD_LOOK[w] ?? WORLD_LOOK[0];
          const firstId = world.levels[0].id;
          return (
            <View key={world.nameKey} style={styles.world}>
              <View style={[styles.worldBanner, look.banner]}>
                <Text style={styles.worldTitle}>{t(world.nameKey)}</Text>
                <View style={styles.worldStars}>
                  <StarRow filled={1} total={1} size={16} />
                  <Text style={styles.worldStarsText}>
                    {worldStars}/{world.levels.length * 3}
                  </Text>
                </View>
              </View>
              {!isUnlocked(firstId) && <Text style={styles.worldLocked}>{t('worldLocked', { n: firstId - 1 })}</Text>}
              <View style={[styles.grid, { gap }]}>
                {world.levels.map((level, index) => {
                  const unlocked = isUnlocked(level.id);
                  const best = bestTime(level.id);
                  return (
                    <Animated.View key={level.id} entering={ZoomIn.delay(index * 40).springify()}>
                      <Pressable
                        disabled={!unlocked}
                        onPress={() => onSelect(level.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t('level', { n: level.id })}
                        style={({ pressed }) => [
                          styles.tile,
                          look.tile,
                          { width: tileSize, height: tileSize },
                          !unlocked && styles.tileLocked,
                          pressed && { transform: [{ scale: 0.95 }] },
                        ]}
                      >
                        {unlocked ? (
                          <>
                            <Text style={styles.number}>{level.id}</Text>
                            <StarRow filled={starsFor(level.id)} size={tileSize * 0.2} />
                            {best !== null && <Text style={styles.tileTime}>{formatTime(best)}</Text>}
                          </>
                        ) : (
                          <>
                            <LockIcon size={tileSize * 0.3} />
                            <Text style={styles.lockedNumber}>{level.id}</Text>
                          </>
                        )}
                      </Pressable>
                      <Text style={[styles.levelName, { width: tileSize }]} numberOfLines={1}>
                        {unlocked ? t(level.nameKey) : ' '}
                      </Text>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
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
    paddingBottom: 14,
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
  world: { marginBottom: 18 },
  worldBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: theme.grassDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  worldTitle: { fontSize: 20, fontWeight: '900', color: theme.white },
  worldStars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  worldStarsText: { fontSize: 15, fontWeight: '800', color: theme.white },
  worldLocked: { textAlign: 'center', color: theme.white, fontWeight: '800', fontSize: 14, marginBottom: 10 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  tile: {
    backgroundColor: theme.cream,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: theme.creamDark,
    borderBottomWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tileLocked: { backgroundColor: '#E4DCCB', borderColor: '#C9BCA5' },
  number: { fontSize: 40, lineHeight: 44, fontWeight: '900', color: theme.text },
  tileTime: { fontSize: 12, fontWeight: '800', color: theme.textLight },
  lockedNumber: { fontSize: 18, fontWeight: '900', color: '#A89A84' },
  levelName: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: theme.white,
  },
});
