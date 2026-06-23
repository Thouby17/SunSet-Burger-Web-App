// Page /contact : coordonnées du restaurant + horaires (lues depuis la config).

import { getConfig, isOpen } from "@/lib/config";
import type { HoursSlot } from "@/lib/types";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

const DAYS: { key: string; label: string }[] = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" },
];

function formatSlots(slots: HoursSlot[] | string | undefined): string {
  if (!Array.isArray(slots) || slots.length === 0) return "Fermé";
  return slots.map((s) => `${s.open} – ${s.close}`).join(" · ");
}

export default async function ContactPage() {
  const config = await getConfig();
  const open = isOpen(config);
  const c = config.contact ?? {};

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <header className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-2xl font-extrabold text-brand">Contact</h1>
      </header>

      <div
        className={`mb-6 inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${
          open ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
        }`}
      >
        {open ? "● Ouvert maintenant" : "● Fermé actuellement"}
      </div>

      {/* Coordonnées */}
      <section className="mb-6 flex flex-col gap-3">
        {c.phone && (
          <a
            href={`tel:${c.phone.replace(/\s/g, "")}`}
            className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <span className="text-neutral-400">Téléphone</span>
            <span className="font-semibold text-neutral-100">{c.phone}</span>
          </a>
        )}
        {c.email && (
          <a
            href={`mailto:${c.email}`}
            className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <span className="text-neutral-400">E-mail</span>
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
            <span className="text-neutral-400">Adresse</span>
            <span className="text-right font-semibold text-neutral-100">{c.address}</span>
          </a>
        )}
      </section>

      {/* Horaires */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Horaires
        </h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {DAYS.map((d) => (
            <li key={d.key} className="flex justify-between">
              <span className="text-neutral-400">{d.label}</span>
              <span className="text-neutral-200">{formatSlots(config.hours[d.key])}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
