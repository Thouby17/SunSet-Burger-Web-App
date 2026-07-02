// Lecture de la configuration (data/config.json) et calcul d'ouverture.
// S'exécute côté serveur.
//
// L'app est MULTI-ÉTABLISSEMENTS : la config contient plusieurs `locations`
// (même marque, même menu, mais adresse / téléphone / horaires propres).
// L'établissement actif du client est mémorisé dans le cookie `location` ;
// celui de la cuisine (écran staff) dans le cookie `staff_location`.

import { readFile } from "node:fs/promises";
import { cookies } from "next/headers";
import path from "node:path";
import { prisma } from "./db";
import type { HoursSlot, LocationConfig, RestaurantConfig } from "./types";

const CONFIG_PATH = path.join(process.cwd(), "data", "config.json");

/** Cookie de l'établissement choisi par le client (lisible serveur + client). */
export const LOCATION_COOKIE = "location";
/** Cookie de la cuisine sélectionnée sur une tablette staff. */
export const STAFF_LOCATION_COOKIE = "staff_location";

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

// En prod, data/config.json est statique (figé au déploiement) : on met en
// cache le résultat parsé au niveau module pour éviter un readFile + JSON.parse
// à chaque requête. En dev, on relit à chaque fois (modifs prises en compte).
let _configCache: RestaurantConfig | null = null;

/** Charge la configuration du restaurant. */
export async function getConfig(): Promise<RestaurantConfig> {
  if (_configCache && process.env.NODE_ENV === "production") return _configCache;
  const raw = await readFile(CONFIG_PATH, "utf-8");
  _configCache = JSON.parse(raw) as RestaurantConfig;
  return _configCache;
}

/** Liste des établissements. */
export async function getLocations(): Promise<LocationConfig[]> {
  const config = await getConfig();
  return config.locations ?? [];
}

/** Établissement par id (undefined si inconnu). */
export async function getLocation(id: string | null | undefined): Promise<LocationConfig | undefined> {
  if (!id) return undefined;
  return (await getLocations()).find((l) => l.id === id);
}

/**
 * Établissement actif du client (cookie `location`), validé contre la config.
 * Renvoie null si aucun cookie ou cookie pointant vers un établissement inconnu.
 */
export async function getActiveLocation(): Promise<LocationConfig | null> {
  const store = await cookies();
  const id = store.get(LOCATION_COOKIE)?.value;
  const byCookie = await getLocation(id);
  if (byCookie) return byCookie;
  // Mono-établissement : aucun choix nécessaire, on prend l'unique établissement
  // (la commande fonctionne sans cookie, et le panier est accessible partout).
  const all = await getLocations();
  return all.length === 1 ? all[0] : null;
}

/** Id de la cuisine sélectionnée sur la tablette staff (validé), sinon null. */
export async function getStaffLocationId(): Promise<string | null> {
  const store = await cookies();
  const id = store.get(STAFF_LOCATION_COOKIE)?.value;
  return (await getLocation(id))?.id ?? null;
}

/** Convertit "HH:MM" en minutes depuis minuit. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Renvoie les créneaux d'un jour donné (tableau vide si fermé / format invalide). */
function slotsFor(hours: Record<string, HoursSlot[] | string>, dayIndex: number): HoursSlot[] {
  const slots = hours[DAY_KEYS[dayIndex]];
  return Array.isArray(slots) ? (slots as HoursSlot[]) : [];
}

// Fuseau horaire du restaurant. ⚠️ Indispensable : en production (Vercel),
// le serveur tourne en UTC. Sans ça, à 18:00 à Bruxelles (16:00 UTC en été)
// un créneau "18:00" serait vu comme pas encore commencé -> faux "fermé".
const TIMEZONE = "Europe/Brussels";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Jour (0=dimanche) et minutes-depuis-minuit à l'heure d'`Europe/Brussels`. */
function zonedNow(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return {
    day: WEEKDAY_INDEX[map.weekday] ?? now.getUTCDay(),
    minutes: (parseInt(map.hour, 10) || 0) * 60 + (parseInt(map.minute, 10) || 0),
  };
}

/**
 * Indique si un jeu d'horaires est ouvert à `now` (évalué à l'heure de Bruxelles).
 *
 * Gère les créneaux qui franchissent minuit : un créneau dont l'heure de
 * fermeture est <= à l'ouverture (ex. 18:00 → 03:00) est considéré comme
 * "de nuit". Sa partie après minuit (00:00 → 03:00) appartient au lendemain,
 * on vérifie donc aussi les créneaux de nuit de la veille.
 * NB : pour une fermeture pile à minuit, utiliser "24:00" (pas "00:00").
 */
export function isOpenHours(
  hours: Record<string, HoursSlot[] | string>,
  now: Date = new Date(),
): boolean {
  const { day, minutes: minutesNow } = zonedNow(now);

  // Partie du soir : créneaux d'aujourd'hui.
  const inToday = slotsFor(hours, day).some((slot) => {
    const open = toMinutes(slot.open);
    const close = toMinutes(slot.close);
    return close > open
      ? minutesNow >= open && minutesNow < close // même journée
      : minutesNow >= open; // créneau de nuit : partie avant minuit
  });

  // Partie après minuit : créneaux de nuit de la veille (ex. ouvert jusqu'à 03:00).
  const inYesterdayOvernight = slotsFor(hours, (day + 6) % 7).some((slot) => {
    const open = toMinutes(slot.open);
    const close = toMinutes(slot.close);
    return close <= open && minutesNow < close;
  });

  return inToday || inYesterdayOvernight;
}

/**
 * Mode « toujours ouvert ».
 *   - Par défaut true : l'établissement est TOUJOURS considéré ouvert (horaires
 *     ignorés, commandes possibles à toute heure) — pratique pour les tests.
 *   - PRODUCTION : définir la variable d'environnement `ENFORCE_HOURS=true`
 *     (sur Vercel) pour appliquer réellement les horaires : commandes refusées
 *     hors ouverture et badge « Fermé » affiché. Aucun changement de code requis.
 */
const FORCE_ALWAYS_OPEN = process.env.ENFORCE_HOURS !== "true";

/** Indique si un établissement est ouvert à `now` (horaires de la config seule). */
export function isLocationOpen(location: LocationConfig, now: Date = new Date()): boolean {
  if (FORCE_ALWAYS_OPEN) return true;
  return isOpenHours(location.hours, now);
}

// --- Surcharge des horaires en base (éditables depuis /admin/hours) ---

/** Horaires surchargés d'un établissement (null si aucune surcharge enregistrée). */
export async function getHoursOverride(
  location: string,
): Promise<Record<string, HoursSlot[]> | null> {
  const row = await prisma.hoursOverride.findUnique({ where: { location } });
  if (!row) return null;
  try {
    return JSON.parse(row.hours) as Record<string, HoursSlot[]>;
  } catch {
    return null;
  }
}

/** Enregistre les horaires surchargés d'un établissement. */
export async function setHoursOverride(
  location: string,
  hours: Record<string, HoursSlot[]>,
): Promise<void> {
  const data = JSON.stringify(hours);
  await prisma.hoursOverride.upsert({
    where: { location },
    create: { location, hours: data },
    update: { hours: data },
  });
}

/** Horaires EFFECTIFS : surcharge en base si présente, sinon ceux de la config. */
export async function getEffectiveHours(
  location: LocationConfig,
): Promise<Record<string, HoursSlot[] | string>> {
  const override = await getHoursOverride(location.id);
  return override ?? location.hours;
}

/** Ouvert MAINTENANT, en tenant compte de la surcharge d'horaires éventuelle. */
export async function isLocationOpenNow(
  location: LocationConfig,
  now: Date = new Date(),
): Promise<boolean> {
  if (FORCE_ALWAYS_OPEN) return true;
  return isOpenHours(await getEffectiveHours(location), now);
}
