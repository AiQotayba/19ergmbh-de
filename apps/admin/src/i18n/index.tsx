import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import ar from "./locales/ar.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
export type Locale = "en" | "de" | "ar";

const STORAGE_KEY = "19er-admin-locale";

const messages: Record<Locale, Record<string, unknown>> = { en, de, ar };

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && messages[stored]) return stored;
  const browser = navigator.language.slice(0, 2);
  if (browser === "de") return "de";
  if (browser === "ar") return "ar";
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const dir: "ltr" | "rtl" = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const text = getNested(messages[locale], key) ?? getNested(messages.en, key) ?? key;
      return interpolate(text, vars);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t, dir }), [locale, setLocale, t, dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;

}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
