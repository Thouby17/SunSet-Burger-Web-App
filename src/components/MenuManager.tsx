"use client";

// Gestion de la disponibilité des plats (staff/admin), par établissement.
// Chaque plat peut être désactivé temporairement (rupture) : il reste visible
// au menu côté client mais devient non commandable.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Menu } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useI18n } from "@/i18n/client";

export default function MenuManager({
  menu,
  initialDisabled,
  locationId,
  locationName,
  backHref = "/staff",
  loginHref = "/staff/login",
}: {
  menu: Menu;
  initialDisabled: string[];
  locationId: string;
  locationName: string;
  // Liens contextuels : staff (défaut) ou admin. backHref=null masque le lien
  // retour du header (l'admin a déjà un bouton Dashboard dans sa barre du bas).
  backHref?: string | null;
  loginHref?: string;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [disabled, setDisabled] = useState<Set<string>>(new Set(initialDisabled));
  const [busy, setBusy] = useState<Set<string>>(new Set());

  async function toggle(menuItemId: string) {
    const willDisable = !disabled.has(menuItemId);
    // Optimiste : on met à jour l'UI tout de suite.
    setDisabled((prev) => {
      const next = new Set(prev);
      if (willDisable) next.add(menuItemId);
      else next.delete(menuItemId);
      return next;
    });
    setBusy((prev) => new Set(prev).add(menuItemId));
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: locationId, menuItemId, disabled: willDisable }),
      });
      if (res.status === 401) {
        router.push(loginHref);
        return;
      }
      if (!res.ok) throw new Error();
    } catch {
      // Échec : on annule le changement optimiste.
      setDisabled((prev) => {
        const next = new Set(prev);
        if (willDisable) next.delete(menuItemId);
        else next.add(menuItemId);
        return next;
      });
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(menuItemId);
        return next;
      });
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          {t("menu.title")}
          <span className="ml-3 rounded-full bg-neutral-800 px-3 py-1 align-middle text-sm font-semibold text-neutral-200">
            {locationName}
          </span>
        </h1>
        {backHref && (
          <Link
            href={backHref}
            className="rounded-full bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:text-neutral-100"
          >
            {t("menu.backLive")}
          </Link>
        )}
      </header>
      <p className="mb-6 text-sm text-neutral-400">{t("menu.hint")}</p>

      <div className="flex flex-col gap-6">
        {menu.categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="mb-2 text-lg font-bold">{cat.label}</h2>
            <div className="flex flex-col divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800">
              {cat.items.map((item) => {
                const off = disabled.has(item.id);
                const isBusy = busy.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 bg-neutral-900 px-4 py-3 ${
                      off ? "opacity-60" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.name}</div>
                      <div className="text-xs text-neutral-500">
                        {formatPrice(item.price, locale)} ·{" "}
                        <span className={off ? "text-red-400" : "text-green-400"}>
                          {off ? t("menu.unavailable") : t("menu.available")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggle(item.id)}
                      disabled={isBusy}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-50 ${
                        off
                          ? "bg-brand text-neutral-950"
                          : "bg-neutral-800 text-neutral-300"
                      }`}
                    >
                      {off ? t("menu.enable") : t("menu.disable")}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
