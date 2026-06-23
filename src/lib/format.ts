// Petits utilitaires de présentation (prix, badges, libellés).

import type { OrderMode, OrderStatus } from "./types";

/** Formate un montant en euros (ex. 11.5 -> "11,50 €"). */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/** Métadonnées d'affichage des badges plats. */
export const BADGES: Record<string, { label: string; emoji: string }> = {
  veggie: { label: "Végé", emoji: "🌱" },
  spicy: { label: "Épicé", emoji: "🌶️" },
  new: { label: "Nouveau", emoji: "✨" },
};

/** Libellé lisible du mode de retrait. */
export function modeLabel(mode: OrderMode): string {
  return mode === "dine_in" ? "Sur place" : "À emporter";
}

/** Métadonnées d'affichage des statuts de commande. */
export const STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; emoji: string }
> = {
  pending: { label: "En attente de validation", color: "amber", emoji: "⏳" },
  accepted: { label: "Acceptée", color: "green", emoji: "✅" },
  refused: { label: "Refusée", color: "red", emoji: "❌" },
  ready: { label: "Prête", color: "blue", emoji: "🛍️" },
};
