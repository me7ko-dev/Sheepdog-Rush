import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { LockIcon, StarRow } from '../components/Icons';
import { LEVELS } from '../game/levels';
import { useI18n } from '../i18n';
import { useProgress } from '../storage/progress';
import { theme } from '../theme';

const COLUMNS = 3;

export function LevelSelectScreen({ onBack, onSelect }: { onBack: () => void; onSelect: (levelId: number) => void }) {
  const { t } = useI18n();
  const { starsFor, isUnlocked, totalStars } = useProgress();
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

      <ScrollView contentContainerStyle={[styles.grid, { gap, paddingBottom: insets.bottom + 30 }]}>
        {LEVELS.map((level, index) => {
          const unlocked = isUnlocked(level.id);
          return (
            <Animated.View key={level.id} entering={ZoomIn.delay(index * 70).springify()}>
              <Pressable
                disabled={!unlocked}
                onPress={() => onSelect(level.id)}
                style={({ pressed }) => [
                  styles.tile,
                  { width: tileSize, height: tileSize },
                  !unlocked && styles.tileLocked,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
              >
                {unlocked ? (
                  <>
                    <Text style={styles.number}>{level.id}</Text>
                    <StarRow filled={starsFor(level.id)} size={tileSize * 0.2} />
                  </>
                ) : (
                  <LockIcon size={tileSize * 0.34} />
                )}
              </Pressable>
              <Text style={[styles.levelName, { width: tileSize }]} numberOfLines={1}>
                {unlocked ? t(level.nameKey) : ' '}
              </Text>
            </Animated.View>
          );
        })}
        <Text style={styles.soon}>{t('comingSoon')}</Text>
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
  number: { fontSize: 40, fontWeight: '900', color: theme.text },
  levelName: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: theme.white,
  },
  soon: {
    width: '100%',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
});
