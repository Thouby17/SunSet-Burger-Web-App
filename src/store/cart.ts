"use client";

// Hook panier : état local + persistance dans localStorage.
// Le panier vit entièrement côté client ; il n'est envoyé au serveur qu'au
// moment de "Envoyer la commande". Il survit à un rafraîchissement de page.

import { useCallback, useEffect, useState } from "react";
import type { CartLine, SelectedChoice, SelectedOption } from "@/lib/types";

const STORAGE_KEY = "brooklyn-food-cart";

/** Suppléments + choix d'une ligne réunis pour l'affichage (label + prix). */
export function lineExtras(line: CartLine): { label: string; price: number }[] {
  return [
    ...line.options.map((o) => ({ label: o.label, price: o.price })),
    ...line.choices.map((c) => ({ label: c.label, price: c.price })),
  ];
}

/** Prix unitaire d'une ligne = base + suppléments + choix. */
export function lineUnitPrice(line: CartLine): number {
  const extras = lineExtras(line).reduce((sum, e) => sum + e.price, 0);
  return line.unitBasePrice + extras;
}

/** Total d'une ligne (unitaire × quantité). */
export function lineTotal(line: CartLine): number {
  return lineUnitPrice(line) * line.qty;
}

/**
 * Convertit le panier en lignes prêtes à envoyer à l'API.
 * On n'envoie que les références (ids) : le serveur recalcule libellés et prix.
 */
export function toOrderLines(lines: CartLine[]) {
  return lines.map((l) => ({
    menuItemId: l.menuItemId,
    qty: l.qty,
    note: l.note,
    options: l.options.map((o) => ({ id: o.id })),
    choices: l.choices.map((c) => ({ groupId: c.groupId, choiceId: c.choiceId })),
  }));
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Chargement initial depuis localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      // panier corrompu -> on repart à vide
    }
    setLoaded(true);
  }, []);

  // Sauvegarde à chaque changement (après le chargement initial).
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, loaded]);

  /** Ajoute une ligne au panier (un plat + ses suppléments + une note). */
  const addLine = useCallback(
    (params: {
      menuItemId: string;
      name: string;
      unitBasePrice: number;
      options: SelectedOption[];
      choices: SelectedChoice[];
      note: string;
      qty: number;
    }) => {
      const newLine: CartLine = {
        lineId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        ...params,
      };
      setLines((prev) => [...prev, newLine]);
    },
    [],
  );

  const updateQty = useCallback((lineId: string, qty: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.lineId === lineId ? { ...l, qty } : l))
        .filter((l) => l.qty > 0),
    );
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  return { lines, loaded, addLine, updateQty, removeLine, clear, total, count };
}
