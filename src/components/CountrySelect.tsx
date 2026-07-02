"use client";

// Sélecteur d'indicatif téléphonique : menu déroulant personnalisé (un <select>
// natif ne peut pas afficher d'images) avec recherche et drapeaux SVG inline.
// Les drapeaux (country-flag-icons) s'affichent sur TOUS les appareils — PC,
// téléphone, tablette — contrairement aux emoji drapeau (non rendus sous Windows).

import { useEffect, useMemo, useRef, useState, type FC } from "react";
import * as Flags from "country-flag-icons/react/3x2";
import { listCountries, type CountryCode } from "@/lib/phone";
import { useI18n } from "@/i18n/client";

type FlagComponent = FC<{ title?: string; className?: string }>;
const FLAGS = Flags as unknown as Record<string, FlagComponent | undefined>;

function Flag({ code, className }: { code: string; className?: string }) {
  const C = FLAGS[code];
  return C ? <C className={className} /> : null;
}

export default function CountrySelect({
  value,
  onChange,
}: {
  value: CountryCode;
  onChange: (c: CountryCode) => void;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const countries = useMemo(() => listCountries(locale), [locale]);
  const current = countries.find((c) => c.code === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    // Recherche par nom, indicatif (+32 / 32) ou code ISO (BE).
    const qDial = q.replace(/^\+/, "");
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.replace(/^\+/, "").startsWith(qDial) ||
        c.code.toLowerCase().includes(q),
    );
  }, [countries, query]);

  // Fermeture au clic extérieur + Échap ; focus auto sur la recherche.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(code: CountryCode) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("checkout.phoneCountry")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-full items-center gap-1.5 rounded-l-xl border-r border-neutral-800 bg-neutral-950 px-3 py-3 text-neutral-200 outline-none"
      >
        {current && (
          <Flag code={current.code} className="h-4 w-6 rounded-sm object-cover" />
        )}
        <span className="text-sm">{current?.dial}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-neutral-500"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-1 w-72 rounded-xl border border-neutral-700 bg-neutral-900 shadow-xl">
          <div className="p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("checkout.phoneSearch")}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-auto pb-1">
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => pick(c.code)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-neutral-800 ${
                    c.code === value ? "bg-neutral-800/60" : ""
                  }`}
                >
                  <Flag code={c.code} className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                  <span className="flex-1 truncate text-neutral-200">{c.name}</span>
                  <span className="shrink-0 text-neutral-400">{c.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-neutral-500">
                {t("checkout.phoneNoResult")}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
