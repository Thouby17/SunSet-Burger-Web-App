// Petits utilitaires de présentation (prix, badges, libellés), adaptés à la langue.

import type { OrderMode, OrderStatus } from "./types";
import { DEFAULT_LOCALE, LOCALE_BCP47, type Locale } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";

/** Cache des formatters de prix par langue (recréer un Intl.NumberFormat à
 *  chaque appel est coûteux ; ici formatPrice est appelé très souvent). */
const _priceFormatters = new Map<string, Intl.NumberFormat>();

/** Formate un montant en euros selon la langue (ex. "11,50 €" / "€11.50"). */
export function formatPrice(amount: number, locale: Locale = DEFAULT_LOCALE): string {
  const tag = LOCALE_BCP47[locale];
  let f = _priceFormatters.get(tag);
  if (!f) {
    f = new Intl.NumberFormat(tag, { style: "currency", currency: "EUR" });
    _priceFormatters.set(tag, f);
  }
  return f.format(amount);
}

/** Emoji des badges plats (le libellé est traduit via la clé badge.*). */
export const BADGE_EMOJI: Record<string, string> = {
  veggie: "🌱",
  spicy: "🌶️",
  new: "✨",
};

/** Clé de traduction du libellé d'un badge ("badge.veggie"…). */
export function badgeKey(badge: string): MessageKey | null {
  if (badge === "veggie") return "badge.veggie";
  if (badge === "spicy") return "badge.spicy";
  if (badge === "new") return "badge.new";
  if (badge === "popular") return "badge.popular";
  return null;
}

/** Style de pastille (couleur) par badge. */
export const BADGE_STYLE: Record<string, string> = {
  popular: "bg-amber-500/15 text-amber-400",
  spicy: "bg-red-500/15 text-red-400",
  veggie: "bg-green-500/15 text-green-400",
  new: "bg-sky-500/15 text-sky-400",
};

/** Clé de traduction du mode de retrait ("mode.dineIn" / "mode.takeaway" / "mode.delivery"). */
export function modeKey(mode: OrderMode): MessageKey {
  if (mode === "delivery") return "mode.delivery";
  return mode === "dine_in" ? "mode.dineIn" : "mode.takeaway";
}

/** Emoji d'un statut de commande. */
export const STATUS_EMOJI: Record<OrderStatus, string> = {
  pending: "⏳",
  accepted: "✅",
  refused: "❌",
  ready: "🛍️",
};

/** Clé de traduction du libellé d'un statut ("status.pending"…). */
export function statusKey(status: OrderStatus): MessageKey {
  return `status.${status}` as MessageKey;
}

/**
 * Libellé d'une option de commande ré-traduit via la table id -> libellé
 * (getOrderLabelMap). Repli sur le libellé figé si l'id n'est plus au menu.
 */
export function relabelOption(
  id: string,
  fallback: string,
  map?: Record<string, string>,
): string {
  return (map && map[id]) || fallback;
}
