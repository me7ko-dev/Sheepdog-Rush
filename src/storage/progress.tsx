import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// Progress is saved on the phone (AsyncStorage). Bump the version in the key
// if the saved format ever changes in an incompatible way.
const STORAGE_KEY = 'sheepdog-rush/progress/v1';

type SavedProgress = {
  /** Best stars per level id, e.g. { "1": 3, "2": 1 }. */
  stars: Record<string, number>;
};

type ProgressValue = {
  loaded: boolean;
  starsFor: (levelId: number) => number;
  isUnlocked: (levelId: number) => boolean;
  /** Saves a finished level. Keeps the best result. */
  recordWin: (levelId: number, stars: number) => void;
  totalStars: number;
};

const ProgressContext = createContext<ProgressValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<SavedProgress>({ stars: {} });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<SavedProgress>;
        if (parsed && typeof parsed.stars === 'object' && parsed.stars) {
          setProgress({ stars: parsed.stars });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const starsFor = useCallback((levelId: number) => progress.stars[String(levelId)] ?? 0, [progress]);

  const isUnlocked = useCallback(
    (levelId: number) => levelId <= 1 || (progress.stars[String(levelId - 1)] ?? 0) > 0,
    [progress],
  );

  const recordWin = useCallback((levelId: number, stars: number) => {
    setProgress((prev) => {
      const best = Math.max(prev.stars[String(levelId)] ?? 0, stars);
      const next = { stars: { ...prev.stars, [String(levelId)]: best } };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const totalStars = useMemo(() => Object.values(progress.stars).reduce((a, b) => a + b, 0), [progress]);

  const value = useMemo(
    () => ({ loaded, starsFor, isUnlocked, recordWin, totalStars }),
    [loaded, starsFor, isUnlocked, recordWin, totalStars],
  );
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
