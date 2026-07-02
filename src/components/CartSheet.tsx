"use client";

// Panier (bottom sheet) : recapitulatif des lignes, ajustement des quantites,
// suppression, total, et passage a l'identification.

import { useEffect, useRef, useState } from "react";
import type { CartLine, MenuItem } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { lineExtras, lineTotal } from "@/store/cart";
import { useI18n } from "@/i18n/client";

function FoodIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

export default function CartSheet({
  lines,
  total,
  suggestions = [],
  onAddSuggestion,
  onClose,
  onUpdateQty,
  onRemove,
  onClear,
  onCheckout,
}: {
  lines: CartLine[];
  total: number;
  suggestions?: MenuItem[];
  onAddSuggestion?: (item: MenuItem) => void;
  onClose: () => void;
  onUpdateQty: (lineId: string, qty: number) => void;
  onRemove: (lineId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  const { t, locale } = useI18n();

  // Verrouille le défilement de la page derrière le panier.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Swipe vers le bas (depuis le bandeau du haut) pour fermer le panier.
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  function onHandleStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
  }
  function onHandleMove(e: React.TouchEvent) {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    setDragY(dy > 0 ? dy : 0); // on ne suit que vers le bas
  }
  function onHandleEnd() {
    if (dragY > 90) onClose(); // seuil dépassé -> fermeture
    setDragY(0);
    startY.current = null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in flex-col justify-end bg-black/60 md:items-center md:justify-center md:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] animate-sheet-up flex-col rounded-t-3xl bg-neutral-900 md:max-h-[85dvh] md:w-full md:max-w-lg md:animate-modal-in md:rounded-3xl md:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? "none" : "transform 0.2s ease-out",
        }}
      >
        {/* Bandeau du haut : zone de "poignée" — glisser vers le bas pour fermer. */}
        <div
          className="touch-none p-5 pb-2"
          onTouchStart={onHandleStart}
          onTouchMove={onHandleMove}
          onTouchEnd={onHandleEnd}
        >
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-700 md:hidden" />
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{t("cart.title")}</h2>
            {lines.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(t("cart.clearConfirm"))) onClear();
                }}
                className="text-sm text-red-400"
              >
                {t("cart.clear")}
              </button>
            )}
          </div>
        </div>

        {/* Lignes */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5">
          {lines.length === 0 ? (
            <p className="py-10 text-center text-neutral-500">
              {t("cart.empty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {lines.map((l) => (
                <li
                  key={l.lineId}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 p-3"
                >
                  <div className="flex gap-3">
                    {/* Vignette produit ou icone de remplacement */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                      {l.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.image}
                          alt={l.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <FoodIcon className="h-7 w-7 text-neutral-500" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold leading-tight">{l.name}</span>
                        <span className="shrink-0 font-semibold text-brand">
                          {formatPrice(lineTotal(l), locale)}
                        </span>
                      </div>
                      {lineExtras(l).length > 0 && (
                        <p className="mt-0.5 text-sm text-neutral-400">
                          {lineExtras(l).map((e) => e.label).join(", ")}
                        </p>
                      )}
                      {l.note && (
                        <p className="mt-0.5 text-sm italic text-neutral-500">
                          &ldquo;{l.note}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onUpdateQty(l.lineId, l.qty - 1)}
                        className="h-11 w-11 rounded-full bg-neutral-800 text-lg font-bold"
                        aria-label={t("item.decrease")}
                      >
                        &minus;
                      </button>
                      <span className="w-5 text-center font-bold">{l.qty}</span>
                      <button
                        onClick={() => onUpdateQty(l.lineId, l.qty + 1)}
                        className="h-11 w-11 rounded-full bg-neutral-800 text-lg font-bold"
                        aria-label={t("item.increase")}
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => onRemove(l.lineId)}
                      className="text-sm text-neutral-500"
                    >
                      {t("cart.remove")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upsell : complements populaires a ajouter en un tap. */}
        {lines.length > 0 && suggestions.length > 0 && (
          <div className="border-t border-neutral-800 px-5 py-3">
            <p className="mb-2 text-sm font-semibold text-neutral-300">
              {t("cart.suggestions")}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onAddSuggestion?.(s)}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950 py-1 pl-1 pr-2 text-sm transition active:scale-[0.97]"
                >
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FoodIcon className="h-4 w-4 text-neutral-500" />
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-neutral-200">{s.name}</span>
                  <span className="font-semibold text-brand">{formatPrice(s.price, locale)}</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-lg font-bold leading-none text-neutral-950">
                    +
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pied : total + actions */}
        <div className="border-t border-neutral-800 p-5">
          <div className="mb-3 flex items-center justify-between text-lg">
            <span className="font-medium text-neutral-300">{t("cart.total")}</span>
            <span className="font-bold text-brand">{formatPrice(total, locale)}</span>
          </div>
          <button
            disabled={lines.length === 0}
            onClick={onCheckout}
            className="w-full rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-neutral-950 transition active:scale-[0.98] disabled:opacity-40"
          >
            {t("cart.continue")}
          </button>
          <button
            onClick={onClose}
            className="mt-2 w-full rounded-2xl px-6 py-3 text-sm text-neutral-400"
          >
            {t("cart.addMore")}
          </button>
        </div>
      </div>
    </div>
  );
}
