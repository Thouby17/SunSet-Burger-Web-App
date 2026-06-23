// Validation et normalisation des numéros de mobile belges.
//
// Formats acceptés (les espaces / points / tirets sont tolérés) :
//   - national       : 04XX XX XX XX   (ex. 0467 44 07 18)
//   - international   : +324XX XX XX XX (ex. +32467 44 07 18)
//   - international 2 : 00324XX XX XX XX (tolérance, même numéro écrit autrement)
//
// Tout est ramené à une forme canonique unique : "+324XXXXXXXX".
// Les numéros fixes ou étrangers sont refusés (commande = mobile belge).

/** Forme canonique "+324XXXXXXXX" si le numéro est un mobile belge valide, sinon null. */
export function normalizeBeMobile(raw: string): string | null {
  const cleaned = raw.replace(/[\s.\-/()]/g, "");

  // 04 + 8 chiffres (national)
  let m = cleaned.match(/^0(4\d{8})$/);
  if (m) return "+32" + m[1];

  // +32 / 0032 + 4 + 8 chiffres (international)
  m = cleaned.match(/^(?:\+32|0032)(4\d{8})$/);
  if (m) return "+32" + m[1];

  return null;
}

/** true si le numéro est un mobile belge valide. */
export function isValidBeMobile(raw: string): boolean {
  return normalizeBeMobile(raw) !== null;
}

/**
 * Affichage lisible à partir de la forme canonique :
 * "+32467440718" -> "+32 467 44 07 18".
 */
export function formatBeMobile(canonical: string): string {
  const m = canonical.match(/^\+32(4\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return canonical;
  return `+32 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}
