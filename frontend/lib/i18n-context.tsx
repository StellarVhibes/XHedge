"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '../messages/en.json';
import es from '../messages/es.json';

type Messages = typeof en;
type Locale = 'en' | 'es';

const messagesMap: Record<Locale, Messages> = {
  en,
  es,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'es')) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let current: any = messagesMap[locale];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return path;
      }
    }
    return typeof current === 'string' ? current : path;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Mimic next-intl hook
export function useTranslations(namespace?: string) {
  const { t } = useI18n();
  return (key: string) => {
    const fullPath = namespace ? `${namespace}.${key}` : key;
    return t(fullPath);
  };
}
