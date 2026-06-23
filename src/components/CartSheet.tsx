"use client";

// Panier (bottom sheet) : récapitulatif des lignes, ajustement des quantités,
// suppression, total, et passage à l'identification.

import type { CartLine } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { lineExtras, lineTotal } from "@/store/cart";

export default function CartSheet({
  lines,
  total,
  onClose,
  onUpdateQty,
  onRemove,
  onClear,
  onCheckout,
}: {
  lines: CartLine[];
  total: number;
  onClose: () => void;
  onUpdateQty: (lineId: string, qty: number) => void;
  onRemove: (lineId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] flex-col rounded-t-3xl bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-2">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-700" />
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Votre panier</h2>
            {lines.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Vider le panier ?")) onClear();
                }}
                className="text-sm text-red-400"
              >
                Vider
              </button>
            )}
          </div>
        </div>

        {/* Lignes */}
        <div className="flex-1 overflow-y-auto px-5">
          {lines.length === 0 ? (
            <p className="py-10 text-center text-neutral-500">
              Votre panier est vide.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {lines.map((l) => (
                <li
                  key={l.lineId}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 p-3"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">{l.name}</span>
                    <span className="font-semibold text-brand">
                      {formatPrice(lineTotal(l))}
                    </span>
                  </div>

                  {lineExtras(l).length > 0 && (
                    <p className="mt-0.5 text-sm text-neutral-400">
                      {lineExtras(l).map((e) => e.label).join(", ")}
                    </p>
                  )}
                  {l.note && (
                    <p className="mt-0.5 text-sm italic text-neutral-500">
                      “{l.note}”
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onUpdateQty(l.lineId, l.qty - 1)}
                        className="h-8 w-8 rounded-full bg-neutral-800 text-lg font-bold"
                        aria-label="Diminuer"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-bold">{l.qty}</span>
                      <button
                        onClick={() => onUpdateQty(l.lineId, l.qty + 1)}
                        className="h-8 w-8 rounded-full bg-neutral-800 text-lg font-bold"
                        aria-label="Augmenter"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => onRemove(l.lineId)}
                      className="text-sm text-neutral-500"
                    >
                      Retirer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pied : total + actions */}
        <div className="border-t border-neutral-800 p-5">
          <div className="mb-3 flex items-center justify-between text-lg">
            <span className="font-medium text-neutral-300">Total</span>
            <span className="font-bold text-brand">{formatPrice(total)}</span>
          </div>
          <button
            disabled={lines.length === 0}
            onClick={onCheckout}
            className="w-full rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-neutral-950 transition active:scale-[0.98] disabled:opacity-40"
          >
            Continuer
          </button>
          <button
            onClick={onClose}
            className="mt-2 w-full rounded-2xl px-6 py-3 text-sm text-neutral-400"
          >
            Ajouter d'autres plats
          </button>
        </div>
      </div>
    </div>
  );
}
