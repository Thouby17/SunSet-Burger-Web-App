// Petits utilitaires de présentation (prix, badges, libellés), adaptés à la langue.

import type { OrderMode, OrderStatus } from "./types";
import { DEFAULT_LOCALE, LOCALE_BCP47, type Locale } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";

/** Formate un montant en euros selon la langue (ex. "11,50 €" / "€11.50"). */
export function formatPrice(amount: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(LOCALE_BCP47[locale], {
    style: "currency",
    currency: "EUR",
  }).format(amount);
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
  return null;
}

/** Clé de traduction du mode de retrait ("mode.dineIn" / "mode.takeaway"). */
export function modeKey(mode: OrderMode): MessageKey {
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
