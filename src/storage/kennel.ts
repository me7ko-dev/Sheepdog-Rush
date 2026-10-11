import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { DEFAULT_OUTFIT, type Outfit } from '../kennel/outfits';

// The dog's chosen look, saved on the phone.
const STORAGE_KEY = 'sheepdog-rush/outfit/v1';

let state: Outfit = DEFAULT_OUTFIT;
const listeners = new Set<() => void>();

export const kennel = {
  get: () => state,
  set(patch: Partial<Outfit>) {
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
        state = { ...DEFAULT_OUTFIT, ...(JSON.parse(raw) as Partial<Outfit>) };
        listeners.forEach((l) => l());
      }
    } catch {
      // Keep the default look.
    }
  },
};

export function useOutfit(): Outfit {
  return useSyncExternalStore(kennel.subscribe, kennel.get, kennel.get);
}
