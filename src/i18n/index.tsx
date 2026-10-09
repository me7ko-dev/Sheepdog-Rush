import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { bg } from './bg';
import { en, type StringKey } from './en';

export type Language = 'en' | 'bg';
export type { StringKey };

const dictionaries: Record<Language, Record<StringKey, string>> = { en, bg };
export const LANGUAGES: Language[] = ['en', 'bg'];

const STORAGE_KEY = 'sheepdog-rush/language/v1';

type TFunction = (key: StringKey, params?: Record<string, string | number>) => string;

type I18nValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TFunction;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'en' || saved === 'bg') setLanguageState(saved);
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  }, []);

  const t = useCallback<TFunction>(
    (key, params) => {
      let text = dictionaries[language][key] ?? en[key] ?? key;
      if (params) {
        for (const [name, value] of Object.entries(params)) {
          text = text.replace(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
