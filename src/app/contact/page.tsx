// Page /contact : coordonnées + horaires de CHAQUE établissement (app multi-points).

import { getConfig, getEffectiveHours, isLocationOpenNow } from "@/lib/config";
import type { HoursSlot } from "@/lib/types";
import BackButton from "@/components/BackButton";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";

export const dynamic = "force-dynamic";

const DAYS: { key: string; labelKey: MessageKey }[] = [
  { key: "monday", labelKey: "day.monday" },
  { key: "tuesday", labelKey: "day.tuesday" },
  { key: "wednesday", labelKey: "day.wednesday" },
  { key: "thursday", labelKey: "day.thursday" },
  { key: "friday", labelKey: "day.friday" },
  { key: "saturday", labelKey: "day.saturday" },
  { key: "sunday", labelKey: "day.sunday" },
];

function formatSlots(
  slots: HoursSlot[] | string | undefined,
  closedLabel: string,
): string {
  if (!Array.isArray(slots) || slots.length === 0) return closedLabel;
  return slots.map((s) => `${s.open} – ${s.close}`).join(" · ");
}

export default async function ContactPage() {
  const config = await getConfig();
  const t = await getT();

  // Horaires EFFECTIFS (surcharge admin incluse) + état d'ouverture, par point.
  const locData = await Promise.all(
    config.locations.map(async (loc) => ({
      loc,
      hours: await getEffectiveHours(loc),
      open: await isLocationOpenNow(loc),
    })),
  );

  return (
    <main className="mx-auto max-w-md px-5 py-6 md:max-w-3xl">
      <header className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-2xl font-extrabold text-brand">{t("contact.title")}</h1>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        {locData.map(({ loc, hours, open }) => {
          return (
            <section key={loc.id}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-xl font-bold">{loc.name}</h2>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${
                    open ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {open ? t("contact.openNow") : t("contact.closedNow")}
                </span>
              </div>

              {/* Coordonnées */}
              <div className="mb-3 flex flex-col gap-3">
                {loc.phone && (
                  <a
                    href={`tel:${loc.phone.replace(/\s/g, "")}`}
                    className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
                  >
                    <span className="text-neutral-400">{t("contact.phone")}</span>
                    <span className="font-semibold text-neutral-100">{loc.phone}</span>
                  </a>
                )}
                {loc.email && (
                  <a
                    href={`mailto:${loc.email}`}
                    className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
                  >
                    <span className="text-neutral-400">{t("contact.email")}</span>
                    <span className="font-semibold text-neutral-100">{loc.email}</span>
                  </a>
                )}
                {loc.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(loc.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
                  >
                    <span className="text-neutral-400">{t("contact.address")}</span>
                    <span className="text-right font-semibold text-neutral-100">{loc.address}</span>
                  </a>
                )}
              </div>

              {/* Horaires */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  {t("contact.hours")}
                </h3>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {DAYS.map((d) => (
                    <li key={d.key} className="flex justify-between">
                      <span className="text-neutral-400">{t(d.labelKey)}</span>
                      <span className="text-neutral-200">
                        {formatSlots(hours[d.key], t("contact.closedDay"))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      {config.vat && (
        <p className="mt-8 text-center text-xs text-neutral-400">
          {t("contact.vat")} {config.vat}
        </p>
      )}
    </main>
  );
}
