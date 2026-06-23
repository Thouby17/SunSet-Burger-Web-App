"use client";

// Bottom sheet de personnalisation d'un plat avant ajout au panier :
//  - quantité,
//  - suppléments tarifés (cases à cocher),
//  - note libre (ex. "sans oignons"),
//  - prix recalculé en direct.

import { useMemo, useState } from "react";
import type { MenuItem, SelectedChoice, SelectedOption } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export default function ItemSheet({
  item,
  onClose,
  onConfirm,
}: {
  item: MenuItem;
  onClose: () => void;
  onConfirm: (params: {
    options: SelectedOption[];
    choices: SelectedChoice[];
    note: string;
    qty: number;
  }) => void;
}) {
  const groups = item.choiceGroups ?? [];

  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  // Sélections par groupe de choix : { [groupId]: choiceId[] }
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  const selectedOptions: SelectedOption[] = useMemo(
    () =>
      item.options
        .filter((o) => checked[o.id])
        .map((o) => ({ id: o.id, label: o.label, price: o.price })),
    [item.options, checked],
  );

  const selectedChoices: SelectedChoice[] = useMemo(
    () =>
      groups.flatMap((g) =>
        (picked[g.id] ?? []).flatMap((cid) => {
          const c = g.choices.find((x) => x.id === cid);
          return c
            ? [{ groupId: g.id, choiceId: c.id, label: `${g.label} : ${c.label}`, price: c.price }]
            : [];
        }),
      ),
    [groups, picked],
  );

  // Tous les groupes obligatoires sont-ils satisfaits ?
  const groupsValid = groups.every((g) => (picked[g.id]?.length ?? 0) >= g.min);

  // Bascule une sélection en respectant min/max du groupe.
  function toggleChoice(groupId: string, choiceId: string, max: number) {
    setPicked((prev) => {
      const cur = prev[groupId] ?? [];
      if (cur.includes(choiceId)) {
        return { ...prev, [groupId]: cur.filter((x) => x !== choiceId) };
      }
      if (max === 1) return { ...prev, [groupId]: [choiceId] }; // radio
      if (cur.length >= max) return prev; // limite atteinte
      return { ...prev, [groupId]: [...cur, choiceId] };
    });
  }

  const unitPrice =
    item.price +
    selectedOptions.reduce((s, o) => s + o.price, 0) +
    selectedChoices.reduce((s, c) => s + c.price, 0);
  const total = unitPrice * qty;

  return (
    // Overlay plein écran ; le sheet remonte du bas (mobile-first).
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-neutral-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-700" />

        <h2 className="text-xl font-bold">{item.name}</h2>
        <p className="mt-1 text-sm text-neutral-400">{item.description}</p>

        {/* Groupes de choix (sauce, viande, taille…) */}
        {groups.map((g) => {
          const count = picked[g.id]?.length ?? 0;
          const missing = count < g.min;
          return (
            <div key={g.id} className="mt-5">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  {g.label}
                </h3>
                {g.min > 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      missing ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {missing ? "Obligatoire" : "✓"}
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500">
                    facultatif{g.max > 1 ? ` · jusqu'à ${g.max}` : ""}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {g.choices.map((c) => {
                  const isSel = (picked[g.id] ?? []).includes(c.id);
                  // Pour les groupes multi-choix : on désactive les choix non
                  // sélectionnés une fois le maximum atteint.
                  const atMax =
                    g.max > 1 && !isSel && (picked[g.id]?.length ?? 0) >= g.max;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => toggleChoice(g.id, c.id, g.max)}
                      disabled={atMax}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition disabled:opacity-40 ${
                        isSel
                          ? "border-brand bg-brand/10"
                          : "border-neutral-800 bg-neutral-950"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 ${
                            g.max === 1 ? "rounded-full" : "rounded-md"
                          } ${
                            isSel
                              ? "border-brand bg-brand text-neutral-950"
                              : "border-neutral-600"
                          }`}
                        >
                          {isSel &&
                            (g.max === 1 ? (
                              <span className="h-2 w-2 rounded-full bg-neutral-950" />
                            ) : (
                              <span className="text-xs font-bold">✓</span>
                            ))}
                        </span>
                        {c.label}
                      </span>
                      {c.price > 0 && (
                        <span className="text-sm text-neutral-400">
                          +{formatPrice(c.price)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Suppléments */}
        {item.options.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Suppléments
            </h3>
            <div className="flex flex-col gap-2">
              {item.options.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!checked[o.id]}
                      onChange={(e) =>
                        setChecked((prev) => ({ ...prev, [o.id]: e.target.checked }))
                      }
                      className="h-5 w-5 accent-brand"
                    />
                    {o.label}
                  </span>
                  <span className="text-sm text-neutral-400">
                    +{formatPrice(o.price)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Note libre */}
        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Note (optionnel)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. sans oignons, cuisson à point…"
            maxLength={200}
            rows={2}
            className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </div>

        {/* Quantité */}
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Quantité
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-10 w-10 rounded-full bg-neutral-800 text-xl font-bold"
              aria-label="Diminuer"
            >
              −
            </button>
            <span className="w-6 text-center text-lg font-bold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="h-10 w-10 rounded-full bg-neutral-800 text-xl font-bold"
              aria-label="Augmenter"
            >
              +
            </button>
          </div>
        </div>

        {/* Validation */}
        <button
          disabled={!groupsValid}
          onClick={() =>
            onConfirm({
              options: selectedOptions,
              choices: selectedChoices,
              note: note.trim(),
              qty,
            })
          }
          className="mt-6 w-full rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-neutral-950 transition active:scale-[0.98] disabled:opacity-40"
        >
          {groupsValid ? `Ajouter — ${formatPrice(total)}` : "Choix obligatoires manquants"}
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full rounded-2xl px-6 py-3 text-sm text-neutral-400"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
