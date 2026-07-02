// Validation / normalisation / affichage des numéros de téléphone, internationaux.
// S'appuie sur libphonenumber-js (la référence) : chaque numéro est validé selon
// le format réel du pays choisi, puis stocké en forme canonique E.164 ("+32467…").
//
// ⚠️ On importe la variante "/max" (métadonnée COMPLÈTE) et non le défaut "/min".
// La métadonnée "min" ne valide que par plages de longueur : elle accepte à tort
// des numéros incomplets (ex. BE "048633061" à 9 chiffres). "/max" applique les
// vrais motifs nationaux -> un numéro incomplet est correctement rejeté, et le
// type (mobile/fixe) est détecté. Coût : bundle un peu plus gros, acceptable ici.

import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
  getCountries,
  getExampleNumber,
  type CountryCode,
} from "libphonenumber-js/max";
import examples from "libphonenumber-js/examples.mobile.json";

export type { CountryCode };

export interface Country {
  code: CountryCode;
  name: string; // nom localisé ("Belgique" en fr, "België" en nl…)
  dial: string; // ex. "+32"
}

export const DEFAULT_COUNTRY: CountryCode = "BE";

// Pays mis en avant en tête de liste (clientèle principale du restaurant).
const PRIORITY: CountryCode[] = ["BE", "FR", "NL", "LU", "DE", "MA", "TR"];

/**
 * TOUS les pays supportés par libphonenumber, avec leur nom localisé selon
 * `locale` et leur indicatif. Quelques pays prioritaires en tête, le reste
 * trié alphabétiquement. Le nom utilise `Intl.DisplayNames` (repli : code ISO).
 */
export function listCountries(locale: string): Country[] {
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    display = null;
  }
  const all: Country[] = getCountries().map((code) => ({
    code,
    name: display?.of(code) ?? code,
    dial: "+" + getCountryCallingCode(code),
  }));
  const prio = PRIORITY.map((c) => all.find((x) => x.code === c)).filter(
    (c): c is Country => Boolean(c),
  );
  const rest = all
    .filter((c) => !PRIORITY.includes(c.code))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return [...prio, ...rest];
}

/**
 * Exemple de numéro au format national d'un pays ("0470 12 34 56" pour BE),
 * utilisé comme placeholder afin que l'invite respecte le format du pays choisi.
 * S'appuie sur les numéros d'exemple officiels de libphonenumber.
 */
export function phoneExample(country: CountryCode): string {
  try {
    const ex = getExampleNumber(country, examples);
    return ex ? ex.formatNational() : "";
  } catch {
    return "";
  }
}

/**
 * Forme canonique E.164 ("+32467440718") si le numéro est valide, sinon null.
 * - `input` peut être un numéro national (avec `country`) ou déjà en +indicatif.
 * - sans `country`, l'entrée doit être au format international (+…).
 */
export function normalizePhone(input: string, country?: CountryCode): string | null {
  if (!input || !input.trim()) return null;
  try {
    const p = parsePhoneNumberFromString(input, country);
    return p && p.isValid() ? p.number : null;
  } catch {
    return null;
  }
}

/** true si le numéro est valide pour le pays donné (ou international si +…). */
export function isValidPhone(input: string, country?: CountryCode): boolean {
  return normalizePhone(input, country) !== null;
}

/** Affichage international lisible ("+32 467 44 07 18") à partir de l'E.164. */
export function formatPhone(value: string): string {
  if (!value) return "";
  try {
    const p = parsePhoneNumberFromString(value);
    return p ? p.formatInternational() : value;
  } catch {
    return value;
  }
}
