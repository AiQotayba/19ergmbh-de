import { ar } from "./locales/ar.js";
import { de } from "./locales/de.js";
import { en } from "./locales/en.js";

export type Locale = "de" | "en" | "ar";

/** Customer-facing email and WhatsApp messages are always German. */
export const CUSTOMER_MESSAGE_LOCALE: Locale = "de";

const SUPPORTED_LOCALES: Locale[] = ["de", "en", "ar"];
const DEFAULT_LOCALE: Locale = "de";

const catalogs: Record<Locale, Record<string, unknown>> = { de, en, ar };

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export function parseAcceptLanguage(header: string | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;

  const candidates = header
    .split(",")
    .map((part) => {
      const [langPart, ...params] = part.trim().split(";");
      const lang = langPart.split("-")[0]?.toLowerCase() ?? "";
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { lang, q: Number.isFinite(q) ? q : 0 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of candidates) {
    if (SUPPORTED_LOCALES.includes(lang as Locale)) {
      return lang as Locale;
    }
  }

  return DEFAULT_LOCALE;
}

export function translate(
  locale: Locale | string | undefined,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const resolved = SUPPORTED_LOCALES.includes(locale as Locale) ? (locale as Locale) : DEFAULT_LOCALE;
  const text =
    getNested(catalogs[resolved], key) ??
    getNested(catalogs[DEFAULT_LOCALE], key) ??
    getNested(catalogs.en, key) ??
    key;
  return interpolate(text, vars);
}

export { ar, de, en };
