"use client";

// Contexte i18n côté client : la langue active est fournie par le layout
// (lue dans le cookie côté serveur), puis exposée via le hook useI18n().

import { createContext, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";
import { translate, type MessageKey } from "./messages";

type I18nValue = {
  locale: Locale;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  setLocale: (next: Locale) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      // Cookie lisible côté serveur (1 an), puis on rafraîchit pour re-rendre
      // tous les Server Components avec la nouvelle langue.
      document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t: (key, params) => translate(locale, key, params),
      setLocale,
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Hook principal : `const { t, locale, setLocale } = useI18n();` */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Repli défensif si jamais un composant est rendu hors Provider.
    return {
      locale: DEFAULT_LOCALE,
      t: (key, params) => translate(DEFAULT_LOCALE, key, params),
      setLocale: () => {},
    };
  }
  return ctx;
}
