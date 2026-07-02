"use client";

// Suivi de commande côté client : interroge l'API toutes les 5 s (polling) et
// reflète le statut décidé par le staff sans rechargement manuel.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BackButton from "./BackButton";
import type { OrderDTO } from "@/lib/types";
import { formatPrice, modeKey, relabelOption, statusKey, STATUS_EMOJI } from "@/lib/format";
import { ensureNotifyPermission, alertOrderUpdate, showNotification } from "@/lib/notify";
import { enablePush } from "@/lib/pushClient";
import { useI18n } from "@/i18n/client";
import { LOCALE_BCP47 } from "@/i18n/config";
import { removeMyOrderTokens } from "@/store/myOrders";

const POLL_MS = 5000;

export default function OrderTracker({
  token,
  labelMap,
}: {
  token: string;
  labelMap?: Record<string, string>;
}) {
  const { t, locale } = useI18n();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [notFound, setNotFound] = useState(false);
  // Statut précédent : sert à détecter le passage à "prête" pour notifier.
  const prevStatus = useRef<string | null>(null);

  /** Heure formatée "19h45" à partir d'une Date (selon la langue). */
  function clock(d: Date): string {
    return d
      .toLocaleTimeString(LOCALE_BCP47[locale], { hour: "2-digit", minute: "2-digit" })
      .replace(":", "h");
  }

  // On demande l'autorisation de notifier dès l'arrivée sur la page, et on
  // s'abonne au Web Push (notif écran verrouillé) pour CETTE commande.
  useEffect(() => {
    ensureNotifyPermission();
    enablePush({ role: "client", token });
  }, [token]);

  // Détecte la transition vers "prête" et déclenche son + notification.
  useEffect(() => {
    if (!order) return;
    const prev = prevStatus.current;
    prevStatus.current = order.status;
    if (prev && prev !== order.status && order.status === "ready") {
      alertOrderUpdate();
      showNotification(
        t("track.notifyReadyTitle", { id: order.id }),
        t("track.readyNote"),
      );
    }
  }, [order, t]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/orders/track/${token}`, { cache: "no-store" });
        if (res.status === 404) {
          if (active) setNotFound(true);
          removeMyOrderTokens([token]); // jeton périmé : on l'oublie sur l'appareil
          return;
        }
        const data = (await res.json()) as OrderDTO;
        if (!active) return;
        setOrder(data);
        // On continue toujours de poller : le staff peut annuler/modifier un
        // statut (ex. revenir de "prête" à "acceptée"), il faut le refléter.
        timer = setTimeout(poll, POLL_MS);
      } catch {
        if (active) timer = setTimeout(poll, POLL_MS);
      }
    }

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [token]);

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="text-4xl">🔎</span>
        <h1 className="text-xl font-bold">{t("track.notFound")}</h1>
        <a href="/commander" className="text-sm text-brand underline underline-offset-4">
          {t("track.placeOrder")}
        </a>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md items-center justify-center text-neutral-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <div className="mb-4">
        <BackButton />
      </div>
      <header className="mb-6 text-center">
        <p className="text-sm text-neutral-400">{t("track.order")}</p>
        <h1 className="text-3xl font-extrabold text-brand">#{order.id}</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {t(modeKey(order.mode))} · {order.customerName}
        </p>
      </header>

      {/* Bloc statut */}
      <section className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center">
        <div className="text-5xl">{STATUS_EMOJI[order.status]}</div>
        <h2 className="mt-3 text-xl font-bold">{t(statusKey(order.status))}</h2>

        {order.status === "pending" && (
          <p className="mt-1 text-sm text-neutral-400">{t("track.pendingNote")}</p>
        )}
        {order.status === "accepted" && order.waitTime != null && (
          <div className="mt-1">
            <p className="text-lg text-neutral-200">
              {t("track.waitEstimated")}{" "}
              <span className="font-bold text-brand">
                {order.waitTime} {t("track.min")}
              </span>
            </p>
            <p className="mt-0.5 text-sm text-neutral-400">
              {t("track.readyAround")}{" "}
              <span className="font-semibold text-neutral-200">
                {clock(
                  new Date(
                    new Date(order.updatedAt).getTime() +
                      order.waitTime * 60_000,
                  ),
                )}
              </span>
            </p>
          </div>
        )}
        {order.status === "ready" && (
          <p className="mt-1 text-sm text-neutral-400">{t("track.readyNote")}</p>
        )}
        {order.status === "refused" && (
          <p className="mt-1 text-sm text-neutral-400">
            {order.staffMessage ? order.staffMessage : t("track.refusedDefault")}
          </p>
        )}
      </section>

      {/* Récapitulatif */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t("track.summary")}
        </h3>
        <ul className="flex flex-col gap-3">
          {order.items.map((l, i) => (
            <li key={i} className="flex justify-between gap-2 text-sm">
              <div>
                <span className="font-medium">
                  {l.qty}× {l.name}
                </span>
                {l.options.length > 0 && (
                  <span className="block text-neutral-400">
                    {l.options
                      .map((o) => relabelOption(o.id, o.label, labelMap))
                      .join(", ")}
                  </span>
                )}
                {l.note && (
                  <span className="block italic text-neutral-500">“{l.note}”</span>
                )}
              </div>
              <span className="shrink-0 text-neutral-300">
                {formatPrice(l.lineTotal, locale)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-neutral-800 pt-3 text-lg font-bold">
          <span>{t("cart.total")}</span>
          <span className="text-brand">{formatPrice(order.total, locale)}</span>
        </div>
        <p className="mt-3 text-center text-xs text-neutral-500">
          {t("track.payAutoUpdate")}
        </p>
      </section>

      <div className="mt-6 text-center">
        <Link
          href="/mes-commandes"
          className="text-sm text-neutral-400 underline underline-offset-4 hover:text-neutral-200"
        >
          {t("track.viewAll")}
        </Link>
      </div>
    </main>
  );
}
