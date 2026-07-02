"use client";

// Bottom sheet de personnalisation d'un plat avant ajout au panier :
//  - quantité,
//  - suppléments tarifés (cases à cocher),
//  - note libre (ex. "sans oignons"),
//  - prix recalculé en direct.

import { useEffect, useMemo, useState } from "react";
import type { MenuItem, SelectedChoice, SelectedOption } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { flyToCart } from "@/lib/flyToCart";
import { useI18n } from "@/i18n/client";

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
  const { t, locale } = useI18n();
  const groups = item.choiceGroups ?? [];

  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  // Sélections par groupe de choix : { [groupId]: choiceId[] }
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  // Verrouille le défilement de la page DERRIÈRE la fiche : sans ça, un swipe
  // dans une zone non défilante de la fiche fait défiler le menu en dessous.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
      className="fixed inset-0 z-50 flex animate-fade-in flex-col justify-end bg-black/60 md:items-center md:justify-center md:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-neutral-900 animate-sheet-up md:max-h-[85dvh] md:max-w-4xl md:flex-row md:animate-modal-in md:rounded-3xl md:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton fermer : flottant, toujours visible (revenir au menu). */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.cancel")}
          className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition active:scale-95 md:bg-neutral-800/90 md:text-neutral-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-5 w-5" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        {/* DESKTOP : image en colonne gauche, ratio CARRÉ FIXE (indépendant de la
            hauteur du contenu). `self-start` : la colonne image ne s'étire PAS
            sur toute la hauteur de la fiche — sinon, avec beaucoup d'options, la
            colonne devient très haute et `object-cover` "zoome" énormément dans
            la photo pour la remplir (bug corrigé ici). */}
        <div className="hidden md:block md:w-1/2 md:self-start md:overflow-hidden">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.name} className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-neutral-800">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-neutral-600" aria-hidden>
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                <path d="M7 2v20" />
                <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
              </svg>
            </div>
          )}
        </div>

        {/* Colonne de droite = toute la fiche sur mobile : zone défilante + pied épinglé. */}
        <div className="flex min-h-0 w-full flex-1 flex-col md:w-1/2">
          {/* Zone défilante. `overscroll-contain` empêche le swipe de "fuir" et de
              faire défiler le menu derrière une fois en bout de course. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {/* MOBILE : image qui monte et disparaît au swipe vers le haut. */}
            <div className="md:hidden">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex h-44 w-full items-center justify-center bg-neutral-800">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-neutral-600" aria-hidden>
                    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                    <path d="M7 2v20" />
                    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                  </svg>
                </div>
              )}
            </div>

            {/* Contenu : titre, choix, suppléments, note, quantité. */}
            <div className="p-5">
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
                      {missing ? t("item.required") : "✓"}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500">
                      {t("item.optional")}
                      {g.max > 1 ? ` · ${t("item.upTo", { n: g.max })}` : ""}
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
                            +{formatPrice(c.price, locale)}
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
                {t("item.supplements")}
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
                      +{formatPrice(o.price, locale)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Note libre */}
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t("item.note")}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("item.notePlaceholder")}
              maxLength={200}
              rows={2}
              className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </div>

          {/* Quantité */}
          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t("item.quantity")}
            </span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-11 w-11 rounded-full bg-neutral-800 text-xl font-bold"
                aria-label={t("item.decrease")}
              >
                −
              </button>
              <span className="w-6 text-center text-lg font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="h-11 w-11 rounded-full bg-neutral-800 text-xl font-bold"
                aria-label={t("item.increase")}
              >
                +
              </button>
            </div>
          </div>

          </div>
          </div>

          {/* Pied ÉPINGLÉ : bouton Ajouter toujours visible (suit l'utilisateur,
              même quand l'image est en haut). Affiche "Choix obligatoires
              manquants" tant qu'un choix requis n'est pas fait. */}
          <div className="shrink-0 border-t border-neutral-800 p-4">
            <button
              disabled={!groupsValid}
              onClick={(e) => {
                // Animation "vol vers le panier" depuis le bouton d'ajout.
                flyToCart(e.currentTarget.getBoundingClientRect());
                onConfirm({
                  options: selectedOptions,
                  choices: selectedChoices,
                  note: note.trim(),
                  qty,
                });
              }}
              className="w-full rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-neutral-950 transition active:scale-[0.98] disabled:opacity-40"
            >
              {groupsValid
                ? t("item.add", { price: formatPrice(total, locale) })
                : t("item.missingChoices")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
