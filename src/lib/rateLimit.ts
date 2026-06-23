// Anti-spam simple, en mémoire (fenêtre glissante).
//
// Objectif : éviter qu'un même numéro / une même IP n'inonde la cuisine de
// commandes. Ce n'est PAS une vérification d'identité (voir SMS OTP pour ça),
// juste un garde-fou contre les abus évidents.
//
// ⚠️ Mémoire de processus : sur un hébergement serverless multi-instances
// (Vercel), la limite est "best-effort" (chaque instance compte de son côté).
// Pour un seul resto à faible trafic c'est suffisant. Pour un anti-spam robuste
// et distribué, brancher un store partagé (ex. Upstash Redis).

interface Hit {
  count: number;
  resetAt: number; // timestamp (ms) de fin de fenêtre
}

const store = new Map<string, Hit>();

/**
 * Retourne true si l'action est AUTORISÉE pour `key`, false si la limite est
 * atteinte. `limit` actions max par fenêtre de `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hit = store.get(key);

  if (!hit || now > hit.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (hit.count >= limit) {
    return false;
  }
  hit.count += 1;
  return true;
}

// Nettoyage périodique des entrées expirées (évite que la Map ne grossisse).
// `unref` pour ne pas empêcher le process de s'arrêter.
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, hit] of store) {
      if (now > hit.resetAt) store.delete(key);
    }
  }, 60_000);
  // unref : ne pas empêcher l'arrêt du process (présent sur Node).
  (timer as { unref?: () => void }).unref?.();
}
