// Configuration i18n : langues disponibles, langue par défaut, cookie.
// FR (par défaut) · NL (Belgique) · EN.

export const LOCALES = ["fr", "nl", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

/** Nom du cookie qui mémorise la langue choisie (lisible serveur + client). */
export const LOCALE_COOKIE = "locale";

/** Libellé court affiché dans le sélecteur de langue. */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "FR",
  nl: "NL",
  en: "EN",
};

/** Code BCP-47 pour le formatage des prix / dates par langue (contexte belge). */
export const LOCALE_BCP47: Record<Locale, string> = {
  fr: "fr-BE",
  nl: "nl-BE",
  en: "en-GB",
};

/** Garde de type : true si `v` est une langue supportée. */
export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}
