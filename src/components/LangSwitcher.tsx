"use client";

// Sélecteur de langue (FR / NL / EN). Pose le cookie `locale` puis rafraîchit
// la page pour re-rendre client + serveur dans la nouvelle langue.

import { LOCALES, LOCALE_LABELS } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export default function LangSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={`inline-flex items-center gap-0.5 rounded-full bg-neutral-800 p-0.5 ${className}`}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
            locale === l
              ? "bg-brand text-neutral-950"
              : "text-neutral-300 hover:text-white"
          }`}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
