"use client";

// Hook panier : état local + persistance dans localStorage.
// Le panier vit entièrement côté client ; il n'est envoyé au serveur qu'au
// moment de "Envoyer la commande". Il survit à un rafraîchissement de page.

import { useCallback, useEffect, useState } from "react";
import type { CartLine, SelectedChoice, SelectedOption } from "@/lib/types";

const STORAGE_KEY = "restaurant-app-cart";

/** Clé localStorage du panier d'un établissement donné (panier par point de vente). */
function cartKey(locationId?: string): string {
  return locationId ? `${STORAGE_KEY}:${locationId}` : STORAGE_KEY;
}

// Le panier vit dans un hook par-composant (OrderFlow). Pour que la barre de
// navigation (TopNav/BottomNav) affiche le compteur sans partager le state, on
// émet un événement global à chaque changement ; la nav relit alors localStorage.
const CART_EVENT = "cart:changed";
function emitCartChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CART_EVENT));
}

/** Établissement actif (cookie `location`), lu côté client. */
function activeLocationId(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(/(?:^|;\s*)location=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Nombre d'articles du panier d'un établissement, lu directement dans localStorage. */
function readCartCount(locationId?: string): number {
  if (typeof localStorage === "undefined") return 0;
  try {
    const raw = localStorage.getItem(cartKey(locationId));
    if (!raw) return 0;
    return (JSON.parse(raw) as CartLine[]).reduce((s, l) => s + (l.qty || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Compteur du panier de l'établissement ACTIF, pour la barre de navigation.
 * Se met à jour via l'événement `cart:changed` (mutations) + `storage` (autres
 * onglets) + `focus`. Indépendant du hook `useCart` d'OrderFlow.
 */
export function useCartCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const read = () => setCount(readCartCount(activeLocationId()));
    read();
    window.addEventListener(CART_EVENT, read);
    window.addEventListener("storage", read);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener(CART_EVENT, read);
      window.removeEventListener("storage", read);
      window.removeEventListener("focus", read);
    };
  }, []);
  return count;
}

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

export function useCart(locationId?: string) {
  const storageKey = cartKey(locationId);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  // (Re)chargement depuis localStorage à l'arrivée ET à chaque changement
  // d'établissement : chaque point de vente a son propre panier indépendant.
  useEffect(() => {
    setLoaded(false);
    try {
      const raw = localStorage.getItem(storageKey);
      setLines(raw ? (JSON.parse(raw) as CartLine[]) : []);
    } catch {
      setLines([]); // panier corrompu -> on repart à vide
    }
    setLoaded(true);
    emitCartChanged(); // synchronise la nav (ex. au changement d'établissement)
  }, [storageKey]);

  // Persistance au moment de la mutation (et non via un effet sur `lines`) :
  // évite, lors d'un changement d'établissement, d'écrire l'ancien panier sous
  // la nouvelle clé avant que le rechargement ait eu lieu.
  const commit = useCallback(
    (updater: (prev: CartLine[]) => CartLine[]) => {
      setLines((prev) => {
        const next = updater(prev);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* localStorage indisponible — on ignore */
        }
        return next;
      });
      // Prévient la nav (compteur du panier) APRÈS le rendu courant : éviter un
      // dispatch synchrone dans l'updater, qui déclencherait un setState de la
      // nav pendant le rendu d'un autre composant (avertissement React).
      queueMicrotask(emitCartChanged);
    },
    [storageKey],
  );

  /** Ajoute une ligne au panier (un plat + ses suppléments + une note). */
  const addLine = useCallback(
    (params: {
      menuItemId: string;
      name: string;
      image: string | null;
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
      commit((prev) => [...prev, newLine]);
    },
    [commit],
  );

  const updateQty = useCallback(
    (lineId: string, qty: number) => {
      commit((prev) =>
        prev
          .map((l) => (l.lineId === lineId ? { ...l, qty } : l))
          .filter((l) => l.qty > 0),
      );
    },
    [commit],
  );

  const removeLine = useCallback(
    (lineId: string) => {
      commit((prev) => prev.filter((l) => l.lineId !== lineId));
    },
    [commit],
  );

  const clear = useCallback(() => commit(() => []), [commit]);

  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  return { lines, loaded, addLine, updateQty, removeLine, clear, total, count };
}
