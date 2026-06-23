"use client";

// Liste des commandes du client (mémorisées sur son appareil). Pour chacune, on
// va chercher son statut actuel via l'API publique de suivi.

import { useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "./BackButton";
import type { OrderDTO } from "@/lib/types";
import { formatPrice, modeKey, statusKey, STATUS_EMOJI } from "@/lib/format";
import { getMyOrderTokens } from "@/store/myOrders";
import { useI18n } from "@/i18n/client";
import { LOCALE_BCP47 } from "@/i18n/config";

export default function MyOrders() {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const dateLabel = (iso: string) =>
    new Date(iso).toLocaleString(LOCALE_BCP47[locale], {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  useEffect(() => {
    const tokens = getMyOrderTokens();
    if (tokens.length === 0) {
      setLoading(false);
      return;
    }
    // On récupère chaque commande via son jeton ; on ignore celles qui
    // n'existent plus (404).
    Promise.all(
      tokens.map((token) =>
        fetch(`/api/orders/track/${token}`, { cache: "no-store" })
          .then((r) => (r.ok ? (r.json() as Promise<OrderDTO>) : null))
          .catch(() => null),
      ),
    ).then((results) => {
      setOrders(results.filter((o): o is OrderDTO => o !== null));
      setLoading(false);
    });
  }, []);

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
