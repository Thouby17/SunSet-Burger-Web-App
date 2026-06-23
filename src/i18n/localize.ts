// Résolution d'un champ de menu traduisible vers une langue donnée.
//
// Dans data/menu.json, un texte peut être :
//   - une simple chaîne ("Coca-Cola") -> identique dans toutes les langues,
//   - un objet { fr, nl, en } -> on choisit la langue (repli FR puis 1re dispo).

import type { Locale } from "./config";
import { DEFAULT_LOCALE } from "./config";

export type Localized = string | Partial<Record<Locale, string>>;

/** Renvoie la chaîne dans la langue voulue (repli : FR, puis n'importe laquelle). */
export function localize(value: Localized | undefined, locale: Locale): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return (
    value[locale] ??
    value[DEFAULT_LOCALE] ??
    Object.values(value).find((v) => typeof v === "string") ??
    ""
  );
}
