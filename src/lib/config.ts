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

/**
 * Indique si le restaurant est ouvert à `now` selon les horaires de config.
 * Renvoie aussi le prochain créneau pour un éventuel message d'info.
 */
export function isOpen(config: RestaurantConfig, now: Date = new Date()): boolean {
  const dayKey = DAY_KEYS[now.getDay()];
  const slots = config.hours[dayKey];
  if (!Array.isArray(slots)) return false;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return (slots as HoursSlot[]).some(
    (slot) => minutesNow >= toMinutes(slot.open) && minutesNow < toMinutes(slot.close),
  );
}
