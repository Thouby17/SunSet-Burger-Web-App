// Validation d'adresse de livraison via le géocodage OpenStreetMap (Nominatim).
// Gratuit, sans clé API. On vérifie simplement que l'adresse correspond à un
// lieu réel ("qu'on retrouve sur la carte"). Serveur uniquement.
//
// Politique d'usage Nominatim : volume faible + User-Agent identifiant requis.
// En cas d'indisponibilité du service, on N'EMPÊCHE PAS la commande (on accepte)
// pour ne pas perdre une vente à cause d'un tiers en panne.

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api/";

/**
 * Suggestions d'adresses (autocomplétion type Google Maps) via Photon (OSM).
 * Biaisé autour de Bruxelles, filtré sur la Belgique. Renvoie une liste de
 * libellés lisibles ("12 Rue X, 1070 Anderlecht"). Vide en cas d'erreur.
 */
export async function suggestAddresses(query: string): Promise<string[]> {
  const q = query.trim();
  if (q.length < 4) return [];
  try {
    const url = `${PHOTON}?q=${encodeURIComponent(q)}&limit=6&lang=fr&lat=50.85&lon=4.35`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      headers: { "User-Agent": "RestaurantOrderApp/1.0 (autocomplete)" },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: { properties?: Record<string, string> }[];
    };
    const out: string[] = [];
    const seen = new Set<string>();
    for (const f of data.features ?? []) {
      const p = f.properties ?? {};
      if (p.countrycode && p.countrycode !== "BE") continue; // Belgique uniquement
      const street = p.street || p.name || "";
      const num = p.housenumber ? `${p.housenumber} ` : "";
      const line1 = `${num}${street}`.trim();
      const city = [p.postcode, p.city || p.county || ""].filter(Boolean).join(" ").trim();
      const label = [line1, city].filter(Boolean).join(", ").trim();
      if (label && !seen.has(label)) {
        seen.add(label);
        out.push(label);
      }
    }
    return out.slice(0, 6);
  } catch {
    return [];
  }
}

/** true si l'adresse est plausible et résolue à un lieu réel (ou si le service est indisponible). */
export async function isResolvableAddress(address: string): Promise<boolean> {
  const q = address.trim();
  if (q.length < 6) return false; // trop courte pour être une adresse

  try {
    const url = `${NOMINATIM}?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RestaurantOrderApp/1.0 (commande à distance)",
        "Accept-Language": "fr-BE,fr,nl,en",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return true; // service indisponible -> on accepte
    const data = (await res.json()) as unknown[];
    return Array.isArray(data) && data.length > 0;
  } catch {
    return true; // timeout / erreur réseau -> on accepte
  }
}
