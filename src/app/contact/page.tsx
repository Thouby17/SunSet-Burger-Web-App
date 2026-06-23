// Page /contact : coordonnées du restaurant + horaires (lues depuis la config).

import { getConfig, isOpen } from "@/lib/config";
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
  const open = isOpen(config);
  const c = config.contact ?? {};
  const t = await getT();

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <header className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-2xl font-extrabold text-brand">{t("contact.title")}</h1>
      </header>

      <div
        className={`mb-6 inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${
          open ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
        }`}
      >
        {open ? t("contact.openNow") : t("contact.closedNow")}
      </div>

      {/* Coordonnées */}
      <section className="mb-6 flex flex-col gap-3">
        {c.phone && (
          <a
            href={`tel:${c.phone.replace(/\s/g, "")}`}
            className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <span className="text-neutral-400">{t("contact.phone")}</span>
            <span className="font-semibold text-neutral-100">{c.phone}</span>
          </a>
        )}
        {c.email && (
          <a
            href={`mailto:${c.email}`}
            className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <span className="text-neutral-400">{t("contact.email")}</span>
            <span className="font-semibold text-neutral-100">{c.email}</span>
          </a>
        )}
        {c.address && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(c.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <span className="text-neutral-400">{t("contact.address")}</span>
            <span className="text-right font-semibold text-neutral-100">{c.address}</span>
          </a>
        )}
      </section>

      {/* Horaires */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t("contact.hours")}
        </h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {DAYS.map((d) => (
            <li key={d.key} className="flex justify-between">
              <span className="text-neutral-400">{t(d.labelKey)}</span>
              <span className="text-neutral-200">
                {formatSlots(config.hours[d.key], t("contact.closedDay"))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
