import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { sound } from './src/audio/sound';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { I18nProvider } from './src/i18n';
import { ads } from './src/monetization/ads';
import { purchases } from './src/monetization/purchases';
import { GameScreen } from './src/screens/GameScreen';
import { KennelScreen } from './src/screens/KennelScreen';
import { LevelSelectScreen } from './src/screens/LevelSelectScreen';
import { StartScreen } from './src/screens/StartScreen';
import { ProgressProvider } from './src/storage/progress';
import { kennel } from './src/storage/kennel';
import { settings } from './src/storage/settings';

// Keep the splash screen up until the saved settings are loaded.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Which screen is visible. A tiny "navigator" is enough for a game with 3 screens.
type Route =
  | { name: 'start' }
  | { name: 'levels' }
  | { name: 'kennel' }
  | { name: 'game'; levelId: number; key: number };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'start' });

  useEffect(() => {
    Promise.all([settings.load(), kennel.load()]).finally(() => {
      sound.start();
      SplashScreen.hideAsync().catch(() => {});
    });
    ads.init().catch(() => {});
    purchases.init().catch(() => {});
  }, []);

  // Android back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // The game screen handles the back button itself (pause first).
      if (route.name === 'game') return false;
      if (route.name === 'levels' || route.name === 'kennel') {
        setRoute({ name: 'start' });
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [route.name]);

  const openLevel = (levelId: number) => setRoute({ name: 'game', levelId, key: Date.now() });

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <I18nProvider>
          <ProgressProvider>
            <StatusBar style="light" />
            <ErrorBoundary onReset={() => setRoute({ name: 'start' })}>
              {route.name === 'start' && (
                <StartScreen
                  onPlay={() => setRoute({ name: 'levels' })}
                  onKennel={() => setRoute({ name: 'kennel' })}
                />
              )}
              {route.name === 'kennel' && <KennelScreen onBack={() => setRoute({ name: 'start' })} />}
              {route.name === 'levels' && (
                <LevelSelectScreen onBack={() => setRoute({ name: 'start' })} onSelect={openLevel} />
              )}
              {route.name === 'game' && (
                <GameScreen
                  key={route.key}
                  levelId={route.levelId}
                  onExit={() => setRoute({ name: 'levels' })}
                  onNext={openLevel}
                />
              )}
            </ErrorBoundary>
          </ProgressProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
