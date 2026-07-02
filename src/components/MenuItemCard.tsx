"use client";

// Carte d'un plat dans le menu : visuel, badges, prix, bouton "Ajouter".
// Le clic ouvre la fiche de personnalisation (ItemSheet) gérée par le parent.

import type { MenuItem } from "@/lib/types";
import { BADGE_STYLE, badgeKey, formatPrice } from "@/lib/format";
import { useI18n } from "@/i18n/client";

export default function MenuItemCard({
  item,
  onAdd,
  unavailable = false,
}: {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  unavailable?: boolean;
}) {
  const { t, locale } = useI18n();
  return (
    <button
      onClick={() => !unavailable && onAdd(item)}
      disabled={unavailable}
      aria-disabled={unavailable}
      className={`flex h-full w-full items-stretch gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-3 text-left transition ${
        unavailable
          ? "cursor-not-allowed opacity-50"
          : "active:scale-[0.99] hover:border-neutral-700"
      }`}
    >
      {/* Image optionnelle */}
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.name}
          className="h-20 w-20 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-neutral-600">
          {/* Placeholder SVG (cloche de service) — net et cohérent, contrairement à un emoji. */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-9 w-9"
            aria-hidden
          >
            <path d="M3 16h18" />
            <path d="M5 16a7 7 0 0 1 14 0" />
            <path d="M12 6V4" />
            <circle cx="12" cy="3.5" r="1" />
          </svg>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="font-bold leading-tight">{item.name}</h3>
          {item.badges.map((b) => {
            const key = badgeKey(b);
            if (!key) return null;
            return (
              <span
                key={b}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  BADGE_STYLE[b] ?? "bg-neutral-700 text-neutral-200"
                }`}
              >
                {t(key)}
              </span>
            );
          })}
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-neutral-400">
          {item.description}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold text-brand">{formatPrice(item.price, locale)}</span>
          {unavailable ? (
            <span className="rounded-full bg-neutral-700 px-3 py-1 text-sm font-bold text-neutral-300">
              {t("item.unavailable")}
            </span>
          ) : (
            <span className="rounded-full bg-brand px-3 py-1 text-sm font-bold text-neutral-950">
              {t("item.addToCart")}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
