"use client";

// Édition des horaires d'ouverture (admin), par établissement.
// Un créneau ouverture→fermeture par jour (couvre le cas courant ; un créneau
// dont la fermeture est avant l'ouverture = service de nuit, ex. 18:00→03:00).
// Enregistre l'ensemble des 7 jours en un clic (surcharge en base).

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HoursSlot } from "@/lib/types";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";

const DAYS: { key: string; labelKey: MessageKey }[] = [
  { key: "monday", labelKey: "day.monday" },
  { key: "tuesday", labelKey: "day.tuesday" },
  { key: "wednesday", labelKey: "day.wednesday" },
  { key: "thursday", labelKey: "day.thursday" },
  { key: "friday", labelKey: "day.friday" },
  { key: "saturday", labelKey: "day.saturday" },
  { key: "sunday", labelKey: "day.sunday" },
];

type DayState = { closed: boolean; open: string; close: string };

export default function HoursManager({
  initialHours,
  locationId,
  locationName,
}: {
  initialHours: Record<string, HoursSlot[] | string>;
  locationId: string;
  locationName: string;
}) {
  const router = useRouter();
  const { t } = useI18n();

  const [days, setDays] = useState<Record<string, DayState>>(() => {
    const out: Record<string, DayState> = {};
    for (const { key } of DAYS) {
      const slots = initialHours[key];
      const first = Array.isArray(slots) && slots.length > 0 ? slots[0] : null;
      out[key] = first
        ? { closed: false, open: first.open, close: first.close }
        : { closed: true, open: "12:00", close: "22:00" };
    }
    return out;
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function update(key: string, patch: Partial<DayState>) {
    setDays((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
    setStatus("idle");
  }

  async function saveAll() {
    setStatus("saving");
    const hours: Record<string, HoursSlot[]> = {};
    for (const { key } of DAYS) {
      const d = days[key];
      hours[key] = d.closed ? [] : [{ open: d.open, close: d.close }];
    }
    try {
      const res = await fetch("/api/admin/hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: locationId, hours }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          {t("hours.title")}
          <span className="ml-3 rounded-full bg-neutral-800 px-3 py-1 align-middle text-sm font-semibold text-neutral-200">
            {locationName}
          </span>
        </h1>
      </header>
      <p className="mb-6 text-sm text-neutral-400">{t("hours.hint")}</p>

      <div className="flex flex-col divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800">
        {DAYS.map(({ key, labelKey }) => {
          const d = days[key];
          return (
            <div
              key={key}
              className="flex flex-col gap-2.5 bg-neutral-900 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
            >
              {/* Ligne 1 (mobile) / bloc gauche (desktop) : jour + statut. */}
              <div className="flex items-center justify-between gap-3 sm:w-32 sm:shrink-0 sm:justify-start">
                <span className="font-medium">{t(labelKey)}</span>
                <button
                  onClick={() => update(key, { closed: !d.closed })}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition active:scale-[0.97] ${
                    d.closed
                      ? "bg-neutral-800 text-neutral-400"
                      : "bg-green-500/15 text-green-400"
                  }`}
                >
                  {d.closed ? t("hours.closed") : t("hours.open")}
                </button>
              </div>
              {/* Ligne 2 (mobile) / bloc droit (desktop) : plage horaire. Les
                  champs partagent l'espace disponible (flex-1, min-w-0) pour ne
                  jamais déborder de l'écran sur mobile. */}
              {!d.closed && (
                <div className="flex items-center gap-2 sm:ml-auto sm:w-auto">
                  <input
                    type="time"
                    value={d.open}
                    onChange={(e) => update(key, { open: e.target.value })}
                    className="w-0 min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 outline-none focus:border-brand sm:w-auto sm:flex-none"
                  />
                  <span className="shrink-0 text-neutral-500">→</span>
                  <input
                    type="time"
                    value={d.close}
                    onChange={(e) => update(key, { close: e.target.value })}
                    className="w-0 min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 outline-none focus:border-brand sm:w-auto sm:flex-none"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={saveAll}
          disabled={status === "saving"}
          className="rounded-2xl bg-brand px-6 py-3 font-bold text-neutral-950 transition active:scale-[0.98] disabled:opacity-50"
        >
          {status === "saving" ? t("hours.saving") : t("hours.save")}
        </button>
        {status === "saved" && (
          <span className="text-sm text-green-400">{t("hours.savedOk")}</span>
        )}
        {status === "error" && (
          <span className="text-sm text-red-400">{t("hours.error")}</span>
        )}
      </div>
    </main>
  );
}
