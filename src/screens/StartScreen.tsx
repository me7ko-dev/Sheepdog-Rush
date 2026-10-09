import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { MenuBackground } from '../components/MenuBackground';
import { LANGUAGES, useI18n } from '../i18n';
import { theme } from '../theme';

export function StartScreen({ onPlay }: { onPlay: () => void }) {
  const { t, language, setLanguage } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <MenuBackground />
      <View style={[styles.content, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInDown.duration(700).springify()} style={styles.titleBox}>
          <Text style={styles.title}>Sheepdog</Text>
          <Text style={[styles.title, styles.titleRush]}>Rush!</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
          <Button title={t('play')} onPress={onPlay} size="big" color="orange" />
        </Animated.View>

        <View style={styles.langRow}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang}
              onPress={() => setLanguage(lang)}
              style={[styles.langPill, lang === language && styles.langPillOn]}
            >
              <Text style={[styles.langText, lang === language && styles.langTextOn]}>{lang.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.sky },
  content: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  titleBox: { alignItems: 'center', paddingHorizontal: 20 },
  title: {
    fontSize: 54,
    fontWeight: '900',
    color: theme.white,
    textShadowColor: theme.text,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 1,
    letterSpacing: 1,
  },
  titleRush: { color: theme.gold, marginTop: -10, fontSize: 64 },
  tagline: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.75)',
    padding: 5,
    borderRadius: 20,
  },
  langPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  langPillOn: { backgroundColor: theme.buttons.green.bg },
  langText: { fontSize: 16, fontWeight: '800', color: theme.textLight },
  langTextOn: { color: theme.white },
});
