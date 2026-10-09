import Constants from 'expo-constants';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { sound } from '../audio/sound';
import { PRIVACY_URL } from '../config';
import { LANGUAGES, useI18n } from '../i18n';
import { useProgress } from '../storage/progress';
import { settings, useSettings } from '../storage/settings';
import { theme } from '../theme';
import { Button } from './Button';

/** Sound, music, vibration, language and "reset progress". */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { t, language, setLanguage } = useI18n();
  const current = useSettings();
  const { resetProgress } = useProgress();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const row = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={(v) => {
          onChange(v);
          sound.play('click');
        }}
        trackColor={{ false: '#D9CBB0', true: theme.buttons.green.bg }}
        thumbColor={theme.white}
        accessibilityLabel={label}
      />
    </View>
  );

  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('close')} />
      <Animated.View entering={ZoomIn.springify().damping(15)} style={styles.card}>
        <Text style={styles.title}>{t('settings')}</Text>

        {row(t('sound'), current.sound, (v) => settings.set({ sound: v }))}
        {row(t('music'), current.music, (v) => settings.set({ music: v }))}
        {row(t('vibration'), current.haptics, (v) => settings.set({ haptics: v }))}

        <View style={styles.row}>
          <Text style={styles.label}>{t('language')}</Text>
          <View style={styles.langRow}>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                onPress={() => {
                  setLanguage(lang);
                  sound.play('click');
                }}
                style={[styles.langPill, lang === language && styles.langPillOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: lang === language }}
              >
                <Text style={[styles.langText, lang === language && styles.langTextOn]}>{lang.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={styles.reset}
          accessibilityRole="button"
          onPress={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              return;
            }
            resetProgress();
            setConfirmReset(false);
            setResetDone(true);
          }}
        >
          <Text style={styles.resetText}>
            {resetDone ? t('resetDone') : confirmReset ? t('resetConfirm') : t('resetProgress')}
          </Text>
        </Pressable>

        <Button title={t('close')} onPress={onClose} color="green" />

        <Pressable onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} accessibilityRole="link">
          <Text style={styles.link}>{t('privacy')}</Text>
        </Pressable>
        <Text style={styles.small}>
          {t('version', { v: Constants.expoConfig?.version ?? '1.0.0' })} · {t('madeBy')}
        </Text>
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
    paddingVertical: 22,
    paddingHorizontal: 22,
    alignItems: 'stretch',
    gap: 10,
  },
  title: { fontSize: 32, fontWeight: '900', color: theme.text, textAlign: 'center', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  label: { fontSize: 19, fontWeight: '800', color: theme.text },
  langRow: { flexDirection: 'row', gap: 6, backgroundColor: '#EFE3C8', padding: 4, borderRadius: 16 },
  langPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 13 },
  langPillOn: { backgroundColor: theme.buttons.green.bg },
  langText: { fontSize: 15, fontWeight: '800', color: theme.textLight },
  langTextOn: { color: theme.white },
  reset: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
  resetText: { fontSize: 15, fontWeight: '800', color: theme.buttons.red.bg, textAlign: 'center' },
  link: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.buttons.blue.edge,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 6,
  },
  small: { fontSize: 12, fontWeight: '600', color: theme.textLight, textAlign: 'center' },
});
