// Helpers i18n côté serveur (Server Components et routes API).
// La langue est lue depuis le cookie `locale` (posé par le sélecteur de langue).

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { translate, type MessageKey } from "./messages";

/** Langue active (cookie), repli sur FR. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Traducteur lié à la langue active : `const t = await getT(); t("nav.home")`. */
export async function getT(): Promise<
  (key: MessageKey, params?: Record<string, string | number>) => string
> {
  const locale = await getLocale();
  return (key, params) => translate(locale, key, params);
}
