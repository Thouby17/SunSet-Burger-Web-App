"use client";

// Carte d'un plat dans le menu : visuel, badges, prix, bouton "Ajouter".
// Le clic ouvre la fiche de personnalisation (ItemSheet) gérée par le parent.

import type { MenuItem } from "@/lib/types";
import { BADGES, formatPrice } from "@/lib/format";

export default function MenuItemCard({
  item,
  onAdd,
}: {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}) {
  return (
    <button
      onClick={() => onAdd(item)}
      className="flex w-full items-stretch gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-3 text-left transition active:scale-[0.99] hover:border-neutral-700"
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
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-2xl">
          🍔
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <h3 className="font-bold leading-tight">{item.name}</h3>
          {item.badges.map((b) =>
            BADGES[b] ? (
              <span key={b} title={BADGES[b].label} className="text-sm">
                {BADGES[b].emoji}
              </span>
            ) : null,
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-neutral-400">
          {item.description}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold text-brand">{formatPrice(item.price)}</span>
          <span className="rounded-full bg-brand px-3 py-1 text-sm font-bold text-neutral-950">
            + Ajouter
          </span>
        </div>
      </div>
    </button>
  );
}
