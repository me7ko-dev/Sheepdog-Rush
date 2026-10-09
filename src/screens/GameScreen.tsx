import { useCallback, useEffect, useState } from 'react';
import { AppState, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { GameView, type GameResult, type Hud } from '../components/GameView';
import { SheepIcon } from '../components/Icons';
import { getLevel, LEVELS } from '../game/levels';
import { useI18n } from '../i18n';
import { ads } from '../monetization/ads';
import { useProgress } from '../storage/progress';
import { theme } from '../theme';
import { formatTime, ResultOverlay } from './ResultOverlay';

type Props = {
  levelId: number;
  onExit: () => void;
  onNext: (levelId: number) => void;
};

export function GameScreen({ levelId, onExit, onNext }: Props) {
  const level = getLevel(levelId) ?? LEVELS[0];
  const { t } = useI18n();
  const { recordWin } = useProgress();
  const insets = useSafeAreaInsets();

  const [runKey, setRunKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [wolfAlert, setWolfAlert] = useState(false);
  const [hud, setHud] = useState<Hud>({
    timeLeft: level.timeLimit,
    penned: 0,
    total: level.sheepCount,
    started: false,
  });

  const onWolf = useCallback(() => {
    setWolfAlert(true);
    setTimeout(() => setWolfAlert(false), 2600);
  }, []);

  const restart = useCallback(() => {
    setResult(null);
    setWolfAlert(false);
    setPaused(false);
    setHud({ timeLeft: level.timeLimit, penned: 0, total: level.sheepCount, started: false });
    setRunKey((k) => k + 1);
  }, [level]);

  const onEnd = useCallback(
    (r: GameResult) => {
      setResult(r);
      if (r.won) recordWin(level.id, r.stars);
      ads.onLevelEnd({ levelId: level.id, won: r.won }).catch(() => {});
    },
    [level.id, recordWin],
  );

  // Pause automatically when the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setPaused(true);
    });
    return () => sub.remove();
  }, []);

  // Android back button: first press pauses, second goes to the menu.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!paused && !result) setPaused(true);
      else onExit();
      return true;
    });
    return () => sub.remove();
  }, [paused, result, onExit]);

  const nextLevel = getLevel(level.id + 1);
  const lowTime = hud.started && hud.timeLeft <= 10 && !result;

  return (
    <View style={styles.container}>
      <View style={[styles.hud, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => setPaused(true)} style={styles.pauseButton} hitSlop={10}>
          <View style={styles.pauseBar} />
          <View style={styles.pauseBar} />
        </Pressable>
        <View style={styles.hudTitle}>
          <Text style={styles.levelLabel}>{t('level', { n: level.id })}</Text>
          <Text style={styles.levelName} numberOfLines={1}>
            {t(level.nameKey)}
          </Text>
        </View>
        <View style={[styles.pill, lowTime && styles.pillWarn]}>
          <Text style={[styles.pillText, lowTime && styles.pillTextWarn]}>{formatTime(hud.timeLeft)}</Text>
        </View>
        <View style={styles.pill}>
          <SheepIcon size={24} />
          <Text style={styles.pillText}>
            {hud.penned}/{hud.total}
          </Text>
        </View>
      </View>

      <View style={styles.field}>
        <GameView
          key={runKey}
          level={level}
          paused={paused || !!result}
          onHud={setHud}
          onEnd={onEnd}
          onWolf={onWolf}
        />

        {!hud.started && !result && (
          <Animated.View
            entering={FadeIn.delay(300)}
            exiting={FadeOut}
            style={[styles.hint, { bottom: insets.bottom + 24 }]}
          >
            <Text style={styles.hintMain}>{t('hintDrag')}</Text>
            <Text style={styles.hintSub}>{t('hintGoal')}</Text>
            {level.blackSheep > 0 && <Text style={styles.hintSub}>{t('hintBlack')}</Text>}
          </Animated.View>
        )}

        {wolfAlert && !result && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut} style={styles.wolfAlert}>
            <Text style={styles.wolfText}>{t('wolfWarning')}</Text>
          </Animated.View>
        )}
      </View>

      {paused && !result && (
        <Animated.View entering={FadeIn.duration(150)} style={styles.backdrop}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseTitle}>{t('paused')}</Text>
            <Button title={t('resume')} onPress={() => setPaused(false)} color="green" size="big" />
            <Button title={t('restart')} onPress={restart} color="orange" />
            <Button title={t('levels')} onPress={onExit} color="blue" size="small" />
          </View>
        </Animated.View>
      )}

      {result && (
        <ResultOverlay
          result={result}
          hasNext={!!nextLevel}
          onRetry={restart}
          onNext={() => nextLevel && onNext(nextLevel.id)}
          onMenu={onExit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#5DAE45' },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: theme.grassDark,
  },
  pauseButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.cream,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderBottomWidth: 4,
    borderColor: theme.creamDark,
  },
  pauseBar: { width: 6, height: 16, borderRadius: 2, backgroundColor: theme.text },
  hudTitle: { flex: 1 },
  levelLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800' },
  levelName: { color: theme.white, fontSize: 17, fontWeight: '900' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.cream,
    borderRadius: 14,
    paddingHorizontal: 10,
    height: 38,
  },
  pillWarn: { backgroundColor: theme.buttons.red.bg },
  pillText: { fontSize: 18, fontWeight: '900', color: theme.text, fontVariant: ['tabular-nums'] },
  pillTextWarn: { color: theme.white },
  field: { flex: 1 },
  hint: {
    pointerEvents: 'none',
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 248, 231, 0.94)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  hintMain: { fontSize: 18, fontWeight: '900', color: theme.text, textAlign: 'center' },
  hintSub: { fontSize: 14, fontWeight: '700', color: theme.textLight, marginTop: 2, textAlign: 'center' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wolfAlert: {
    position: 'absolute',
    top: 16,
    left: 20,
    right: 96,
    backgroundColor: theme.buttons.red.bg,
    borderRadius: 16,
    borderBottomWidth: 4,
    borderColor: theme.buttons.red.edge,
    paddingVertical: 10,
    paddingHorizontal: 14,
    pointerEvents: 'none',
  },
  wolfText: { color: theme.white, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  pauseCard: {
    backgroundColor: theme.cream,
    borderRadius: 30,
    borderWidth: 5,
    borderColor: theme.creamDark,
    padding: 26,
    alignItems: 'center',
    gap: 14,
    minWidth: 270,
  },
  pauseTitle: { fontSize: 34, fontWeight: '900', color: theme.text, marginBottom: 6 },
});
