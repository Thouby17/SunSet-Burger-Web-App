"use client";

// Édition des prix (admin), par établissement :
//   - prix de base de chaque plat,
//   - prix des suppléments (options),
//   - prix des choix tarifés (ex. "Steak Smash +3€").
// Le prix par défaut vient du menu ; une surcharge est enregistrée en base.
// Bouton "Enregistrer" par ligne (actif quand le prix a changé) + "↺" (défaut).

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Menu } from "@/lib/types";
import { useI18n } from "@/i18n/client";

export default function PriceManager({
  menu,
  initialOverrides,
  locationId,
  locationName,
}: {
  menu: Menu; // prix PAR DÉFAUT (data/menu.json)
  initialOverrides: Record<string, number>; // surcharges enregistrées (id -> prix)
  locationId: string;
  locationName: string;
}) {
  const router = useRouter();
  const { t } = useI18n();

  // Groupes de choix PARTAGÉS (ex. "sauce" proposée par 30+ plats) : on les
  // affiche UNE SEULE FOIS dans une section commune, au lieu de les répéter
  // sous chaque plat qui les propose (c'était la "duplication" des sauces).
  const sharedGroups = Object.values(menu.sharedChoiceGroups ?? {});
  const sharedIds = new Set(sharedGroups.map((g) => g.id));

  // Prix par défaut de chaque entité tarifable (plat, option, choix), par id.
  const defaults: Record<string, number> = {};
  for (const g of sharedGroups) {
    for (const c of g.choices) defaults[`${g.id}:${c.id}`] = c.price;
  }
  for (const cat of menu.categories) {
    for (const it of cat.items) {
      defaults[it.id] = it.price;
      for (const o of it.options) defaults[o.id] = o.price;
      // Seuls les groupes PROPRES au plat (non partagés) sont listés ici.
      for (const g of (it.choiceGroups ?? []).filter((g) => !sharedIds.has(g.id))) {
        for (const c of g.choices) defaults[`${g.id}:${c.id}`] = c.price;
      }
    }
  }

  const eff = (id: string) => initialOverrides[id] ?? defaults[id] ?? 0;

  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const id of Object.keys(defaults)) v[id] = String(eff(id));
    return v;
  });
  const [saved, setSaved] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {};
    for (const id of Object.keys(defaults)) s[id] = eff(id);
    return s;
  });
  const [busy, setBusy] = useState<Set<string>>(new Set());

  async function save(id: string, price: number | null) {
    setBusy((p) => new Set(p).add(id));
    try {
      const res = await fetch("/api/admin/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: locationId, menuItemId: id, price }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) throw new Error();
      const newEff = price ?? defaults[id] ?? 0;
      setSaved((s) => ({ ...s, [id]: newEff }));
      setValues((v) => ({ ...v, [id]: String(newEff) }));
    } catch {
      setValues((v) => ({ ...v, [id]: String(saved[id]) }));
    } finally {
      setBusy((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }
  }

  // Une ligne éditable (plat ou supplément/choix indenté).
  function row(id: string, label: string, indent = false) {
    const def = defaults[id] ?? 0;
    const current = values[id] ?? "";
    const parsed = Number(current.replace(",", "."));
    const changed = Number.isFinite(parsed) && parsed !== saved[id];
    const overridden = saved[id] !== def;
    const isBusy = busy.has(id);
    return (
      <div
        key={id}
        className={`flex items-center justify-between gap-3 bg-neutral-900 px-4 py-2.5 ${
          indent ? "pl-8" : ""
        }`}
      >
        <div className="min-w-0">
          <div className={`truncate ${indent ? "text-sm" : "font-medium"}`}>{label}</div>
          <div className="text-xs text-neutral-500">
            {t("prices.default")} : {def.toFixed(2)} €
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={current}
              onChange={(e) => setValues((v) => ({ ...v, [id]: e.target.value }))}
              className="w-24 rounded-lg border border-neutral-700 bg-neutral-950 py-1.5 pl-3 pr-7 text-right outline-none focus:border-brand"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500">
              €
            </span>
          </div>
          <button
            onClick={() => save(id, parsed)}
            disabled={!changed || isBusy}
            className="rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-neutral-950 transition active:scale-[0.97] disabled:opacity-30"
          >
            {t("prices.save")}
          </button>
          {overridden && (
            <button
              onClick={() => save(id, null)}
              disabled={isBusy}
              title={t("prices.reset")}
              className="rounded-full bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-300 transition active:scale-[0.97] disabled:opacity-50"
            >
              ↺
            </button>
          )}
        </div>
      </div>
    );
  }

  function subHeader(label: string) {
    return (
      <div className="bg-neutral-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          {t("prices.title")}
          <span className="ml-3 rounded-full bg-neutral-800 px-3 py-1 align-middle text-sm font-semibold text-neutral-200">
            {locationName}
          </span>
        </h1>
      </header>
      <p className="mb-6 text-sm text-neutral-400">{t("prices.hint")}</p>

      <div className="flex flex-col gap-6">
        {/* Sauces, viandes, accompagnements... communs à plusieurs plats :
            affichés UNE SEULE FOIS ici (modifier "Andalouse" ici la change
            partout où elle est proposée). */}
        {sharedGroups.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-bold">{t("prices.shared")}</h2>
            <div className="flex flex-col divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800">
              {sharedGroups.map((g) => (
                <div key={g.id} className="flex flex-col divide-y divide-neutral-800/60">
                  {subHeader(g.label)}
                  {g.choices.map((c) => row(`${g.id}:${c.id}`, c.label, true))}
                </div>
              ))}
            </div>
          </section>
        )}

        {menu.categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="mb-2 text-lg font-bold">{cat.label}</h2>
            <div className="flex flex-col divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800">
              {cat.items.map((item) => (
                <div key={item.id} className="flex flex-col divide-y divide-neutral-800/60">
                  {row(item.id, item.name)}
                  {item.options.length > 0 && subHeader(t("item.supplements"))}
                  {item.options.map((o) => row(o.id, o.label, true))}
                  {(item.choiceGroups ?? [])
                    .filter((g) => !sharedIds.has(g.id))
                    .map((g) => (
                      <div key={g.id} className="flex flex-col divide-y divide-neutral-800/60">
                        {subHeader(g.label)}
                        {g.choices.map((c) => row(`${g.id}:${c.id}`, c.label, true))}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
