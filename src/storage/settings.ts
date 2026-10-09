import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// Player settings, saved on the phone. Usable from React (useSettings) and from plain code (settings.get()).

export type Settings = {
  sound: boolean;
  music: boolean;
  haptics: boolean;
};

const STORAGE_KEY = 'sheepdog-rush/settings/v1';
const DEFAULTS: Settings = { sound: true, music: true, haptics: true };

let state: Settings = DEFAULTS;
const listeners = new Set<() => void>();

export const settings = {
  get: () => state,
  set(patch: Partial<Settings>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Settings>;
        state = { ...DEFAULTS, ...saved };
        listeners.forEach((l) => l());
      }
    } catch {
      // Keep the defaults.
    }
  },
};

export function useSettings(): Settings {
  return useSyncExternalStore(settings.subscribe, settings.get, settings.get);
}
