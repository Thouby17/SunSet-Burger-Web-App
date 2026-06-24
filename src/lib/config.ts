// Lecture de la configuration (data/config.json) et calcul d'ouverture.
// S'exécute côté serveur.

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { HoursSlot, RestaurantConfig } from "./types";

const CONFIG_PATH = path.join(process.cwd(), "data", "config.json");

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/** Charge la configuration du restaurant. */
export async function getConfig(): Promise<RestaurantConfig> {
  const raw = await readFile(CONFIG_PATH, "utf-8");
  return JSON.parse(raw) as RestaurantConfig;
}

/** Convertit "HH:MM" en minutes depuis minuit. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Fuseau horaire du restaurant. ⚠️ En production (Vercel) le serveur tourne en
// UTC : sans ça, à 17:00 à Bruxelles (15:00 UTC en été) un créneau "17:00"
// serait vu comme pas encore commencé -> faux "fermé".
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

/** Créneaux d'un jour donné (tableau vide si fermé / format invalide). */
function slotsForDay(config: RestaurantConfig, dayIndex: number): HoursSlot[] {
  const slots = config.hours[DAY_KEYS[dayIndex]];
  return Array.isArray(slots) ? (slots as HoursSlot[]) : [];
}

/**
 * Indique si le restaurant est ouvert à `now` (évalué à l'heure de Bruxelles).
 * Gère les créneaux qui franchissent minuit (fermeture <= ouverture, ex. 18:00→03:00) ;
 * pour une fermeture pile à minuit, utiliser "24:00".
 */
export function isOpen(config: RestaurantConfig, now: Date = new Date()): boolean {
  const { day, minutes: minutesNow } = zonedNow(now);

  const inToday = slotsForDay(config, day).some((slot) => {
    const open = toMinutes(slot.open);
    const close = toMinutes(slot.close);
    return close > open
      ? minutesNow >= open && minutesNow < close
      : minutesNow >= open;
  });

  const inYesterdayOvernight = slotsForDay(config, (day + 6) % 7).some((slot) => {
    const open = toMinutes(slot.open);
    const close = toMinutes(slot.close);
    return close <= open && minutesNow < close;
  });

  return inToday || inYesterdayOvernight;
}
