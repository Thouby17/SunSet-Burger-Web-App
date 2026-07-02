"use client";

// "Mes commandes" : la liste des JETONS de suivi du client est mémorisée dans
// son propre navigateur (localStorage). On stocke les jetons (non devinables),
// pas les ids séquentiels. Le restaurant ne stocke rien de plus.

const STORAGE_KEY = "restaurant-app-my-orders-v2";

/** Renvoie les jetons mémorisés sur cet appareil (plus récents d'abord). */
export function getMyOrderTokens(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const tokens = JSON.parse(raw) as string[];
    return Array.isArray(tokens) ? tokens : [];
  } catch {
    return [];
  }
}

/** Ajoute un jeton en tête de liste (sans doublon). */
export function addMyOrderToken(token: string) {
  try {
    const current = getMyOrderTokens().filter((t) => t !== token);
    const next = [token, ...current].slice(0, 50); // on garde les 50 dernières
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage indisponible — on ignore */
  }
}

/**
 * Retire un (ou plusieurs) jeton(s) périmé(s) : commande introuvable côté
 * serveur (404), p. ex. base réinitialisée. Évite de garder des commandes
 * fantômes dans "Mes commandes".
 */
export function removeMyOrderTokens(tokens: string[]) {
  if (tokens.length === 0) return;
  try {
    const stale = new Set(tokens);
    const next = getMyOrderTokens().filter((t) => !stale.has(t));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage indisponible — on ignore */
  }
}
