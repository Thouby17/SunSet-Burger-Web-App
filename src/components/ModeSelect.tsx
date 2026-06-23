"use client";

// Première étape du parcours client : "Sur place" ou "À emporter".

import type { OrderMode } from "@/lib/types";

export default function ModeSelect({
  onSelect,
}: {
  onSelect: (mode: OrderMode) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-lg font-semibold text-neutral-300">
        Comment souhaitez-vous commander ?
      </h2>

      <button
        onClick={() => onSelect("dine_in")}
        className="flex flex-col items-center gap-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center transition active:scale-[0.98] hover:border-brand"
      >
        <span className="text-3xl">🍽️</span>
        <span className="text-lg font-bold">Sur place</span>
        <span className="text-sm text-neutral-400">Servi à votre table</span>
      </button>

      <button
        onClick={() => onSelect("takeaway")}
        className="flex flex-col items-center gap-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center transition active:scale-[0.98] hover:border-brand"
      >
        <span className="text-3xl">🥡</span>
        <span className="text-lg font-bold">À emporter</span>
        <span className="text-sm text-neutral-400">Prêt à récupérer</span>
      </button>
    </div>
  );
}
