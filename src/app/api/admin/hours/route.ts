// /api/admin/hours
//   POST { location, hours }  -> enregistre les horaires surchargés.
//   `hours` = { monday: [{open:"HH:MM", close:"HH:MM"}], …, sunday: [...] }.
//   Réservé à l'admin (protégé par le middleware /api/admin/*).

import { NextResponse } from "next/server";
import { setHoursOverride } from "@/lib/config";
import type { HoursSlot } from "@/lib/types";

export const dynamic = "force-dynamic";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const HHMM = /^([01]\d|2[0-4]):[0-5]\d$/; // 00:00 → 24:00

export async function POST(req: Request) {
  let body: { location?: string; hours?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { location, hours } = body;
  if (!location || typeof hours !== "object" || hours === null) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  // Validation stricte : chaque jour = tableau de créneaux {open,close} valides.
  const clean: Record<string, HoursSlot[]> = {};
  for (const day of DAYS) {
    const raw = (hours as Record<string, unknown>)[day];
    const slots = Array.isArray(raw) ? raw : [];
    const out: HoursSlot[] = [];
    for (const s of slots) {
      const open = (s as HoursSlot)?.open;
      const close = (s as HoursSlot)?.close;
      if (typeof open !== "string" || typeof close !== "string") continue;
      if (!HHMM.test(open) || !HHMM.test(close)) {
        return NextResponse.json(
          { error: `Horaire invalide (${day}) : format HH:MM attendu.` },
          { status: 400 },
        );
      }
      out.push({ open, close });
    }
    clean[day] = out;
  }

  await setHoursOverride(location, clean);
  return NextResponse.json({ ok: true });
}
