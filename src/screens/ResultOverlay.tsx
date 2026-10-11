import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { sound } from '../audio/sound';
import { Button } from '../components/Button';
import { Confetti } from '../components/Confetti';
import { BigStar } from '../components/Icons';
import type { GameResult } from '../components/GameView';
import { useI18n } from '../i18n';
import { theme } from '../theme';

type Props = {
  result: GameResult;
  hasNext: boolean;
  /** How many Kennel items this win unlocked. */
  newLooks?: number;
  onRetry: () => void;
  onNext: () => void;
  onMenu: () => void;
};

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The win / lose card shown at the end of a level. */
export function ResultOverlay({ result, hasNext, newLooks = 0, onRetry, onNext, onMenu }: Props) {
  const { t } = useI18n();

  // A "ding" for every star, in time with the stars popping in.
  useEffect(() => {
    if (!result.won) return;
    const timers = Array.from({ length: result.stars }, (_, i) =>
      setTimeout(() => sound.play('star', 0.8 + i * 0.1), 450 + i * 280),
    );
    return () => timers.forEach(clearTimeout);
  }, [result]);

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.backdrop}>
      {result.won && <Confetti />}
      <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.card}>
        <Text style={[styles.title, !result.won && styles.titleLose]}>
          {result.won ? t('winTitle') : result.reason === 'wolf' ? t('wolfTitle') : t('loseTitle')}
        </Text>

        {result.won ? (
          <>
            <View style={styles.stars}>
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  entering={ZoomIn.delay(350 + i * 280)
                    .springify()
                    .damping(9)}
                  style={i === 1 && styles.middleStar}
                >
                  <BigStar on={i < result.stars} size={i === 1 ? 76 : 62} />
                </Animated.View>
              ))}
            </View>
            <Text style={styles.info}>{t('yourTime', { t: formatTime(result.time) })}</Text>
            {!hasNext && <Text style={styles.small}>{t('allDone')}</Text>}
            {newLooks > 0 && (
              <Animated.View entering={ZoomIn.delay(1300).springify()} style={styles.unlock}>
                <Text style={styles.unlockText}>{t('newUnlock')}</Text>
              </Animated.View>
            )}
          </>
        ) : (
          <Text style={styles.info}>
            {result.reason === 'wolf' ? t('loseWolf') : t('loseText', { n: result.sheepLeft })}
          </Text>
        )}

        <View style={styles.buttons}>
          {result.won && hasNext && <Button title={t('next')} onPress={onNext} color="green" size="big" />}
          <Button title={t('retry')} onPress={onRetry} color={result.won ? 'blue' : 'orange'} />
          <Button title={t('levels')} onPress={onMenu} color="blue" size="small" />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.cream,
    borderRadius: 30,
    borderWidth: 5,
    borderColor: theme.creamDark,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: { fontSize: 38, fontWeight: '900', color: theme.buttons.green.edge },
  titleLose: { color: theme.buttons.red.bg },
  stars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 14 },
  middleStar: { marginBottom: 14 },
  info: { fontSize: 20, fontWeight: '800', color: theme.text, marginTop: 8, textAlign: 'center' },
  small: { fontSize: 15, fontWeight: '600', color: theme.textLight, marginTop: 8, textAlign: 'center' },
  unlock: {
    marginTop: 12,
    backgroundColor: theme.buttons.orange.bg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  unlockText: { color: theme.white, fontWeight: '900', fontSize: 15, textAlign: 'center' },
  buttons: { marginTop: 22, gap: 12, alignItems: 'center' },
});
