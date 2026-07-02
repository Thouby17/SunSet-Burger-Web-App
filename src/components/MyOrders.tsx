"use client";

// Liste des commandes du client (mémorisées sur son appareil). Pour chacune, on
// va chercher son statut actuel via l'API publique de suivi.
//
// Rafraîchissement auto : tant qu'au moins une commande est ENCORE ACTIVE
// (en attente ou acceptée), on re-sonde l'API toutes les 5 s pour refléter les
// changements (ex. acceptée -> prête) sans rechargement manuel. Quand toutes les
// commandes sont terminées (prêtes/refusées), on arrête de poller (inutile).

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import BackButton from "./BackButton";
import type { OrderDTO } from "@/lib/types";
import { formatPrice, modeKey, statusKey, STATUS_EMOJI } from "@/lib/format";
import { getMyOrderTokens, removeMyOrderTokens } from "@/store/myOrders";
import { useI18n } from "@/i18n/client";
import { LOCALE_BCP47 } from "@/i18n/config";

const POLL_MS = 5000;

export default function MyOrders() {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  // Vrai tant qu'une commande peut encore changer de statut (pilote le polling).
  const hasActiveRef = useRef(false);
  // Évite deux chargements concurrents (réseau lent) qui se court-circuiteraient.
  const loadingRef = useRef(false);

  const dateLabel = (iso: string) =>
    new Date(iso).toLocaleString(LOCALE_BCP47[locale], {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const load = useCallback(async (initial = false) => {
    if (loadingRef.current) return; // un chargement est déjà en cours
    loadingRef.current = true;
    try {
      const tokens = getMyOrderTokens();
      if (tokens.length === 0) {
        setOrders([]);
        hasActiveRef.current = false;
        return;
      }
      // Pour chaque jeton : on récupère la commande, ou on note le jeton comme
      // périmé si le serveur répond 404 (commande introuvable). Une simple panne
      // réseau ne supprime rien (on retentera plus tard).
      const results = await Promise.all(
        tokens.map((token) =>
          fetch(`/api/orders/track/${token}`, { cache: "no-store" })
            .then(async (r) => {
              if (r.ok) return { token, order: (await r.json()) as OrderDTO };
              if (r.status === 404) return { token, order: null, stale: true };
              return { token, order: null };
            })
            .catch(() => ({ token, order: null })),
        ),
      );

      const next = results
        .map((r) => r.order)
        .filter((o): o is OrderDTO => o !== null);
      setOrders(next);
      removeMyOrderTokens(
        results.filter((r) => "stale" in r && r.stale).map((r) => r.token),
      );
      // Continue de poller tant qu'une commande est en attente ou acceptée.
      hasActiveRef.current = next.some(
        (o) => o.status === "pending" || o.status === "accepted",
      );
    } finally {
      if (initial) setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    load(true);
    const id = setInterval(() => {
      if (hasActiveRef.current && !document.hidden) load(false);
    }, POLL_MS);
    // Au retour sur l'onglet, on rafraîchit immédiatement si pertinent.
    const onVisible = () => {
      if (!document.hidden && hasActiveRef.current) load(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <header className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-2xl font-extrabold text-brand">{t("myorders.title")}</h1>
      </header>

      {loading ? (
        <p className="text-neutral-500">{t("common.loading")}</p>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-4xl">🧾</span>
          <p className="text-neutral-400">{t("myorders.empty")}</p>
          <Link href="/commander" className="text-sm text-brand underline underline-offset-4">
            {t("track.placeOrder")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/suivi/${o.token}`}
                className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition active:scale-[0.99] hover:border-neutral-700"
              >
                <div>
                  <div className="font-bold">
                    {t("myorders.order")} <span className="text-brand">#{o.id}</span>
                  </div>
                  <div className="text-sm text-neutral-400">
                    {dateLabel(o.createdAt)} · {t(modeKey(o.mode))} ·{" "}
                    {formatPrice(o.total, locale)}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div>{STATUS_EMOJI[o.status]}</div>
                  <div className="text-neutral-300">{t(statusKey(o.status))}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
