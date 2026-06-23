"use client";

// Suivi de commande côté client : interroge l'API toutes les 5 s (polling) et
// reflète le statut décidé par le staff sans rechargement manuel.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BackButton from "./BackButton";
import type { OrderDTO } from "@/lib/types";
import { formatPrice, modeLabel, STATUS_META } from "@/lib/format";
import { ensureNotifyPermission, playBeep, showNotification } from "@/lib/notify";

const POLL_MS = 5000;

/** Heure formatée "19h45" à partir d'une Date. */
function clock(d: Date): string {
  return d
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", "h");
}

export default function OrderTracker({ token }: { token: string }) {
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [notFound, setNotFound] = useState(false);
  // Statut précédent : sert à détecter le passage à "prête" pour notifier.
  const prevStatus = useRef<string | null>(null);

  // On demande l'autorisation de notifier dès l'arrivée sur la page.
  useEffect(() => {
    ensureNotifyPermission();
  }, []);

  // Détecte la transition vers "prête" et déclenche son + notification.
  useEffect(() => {
    if (!order) return;
    const prev = prevStatus.current;
    prevStatus.current = order.status;
    if (prev && prev !== order.status && order.status === "ready") {
      playBeep();
      showNotification(
        `Commande #${order.id} prête !`,
        "Votre commande vous attend. Bon appétit !",
      );
    }
  }, [order]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/orders/track/${token}`, { cache: "no-store" });
        if (res.status === 404) {
          if (active) setNotFound(true);
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
        <h1 className="text-xl font-bold">Commande introuvable</h1>
        <a href="/commander" className="text-sm text-brand underline underline-offset-4">
          Passer une commande
        </a>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md items-center justify-center text-neutral-500">
        Chargement…
      </div>
    );
  }

  const meta = STATUS_META[order.status];

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <div className="mb-4">
        <BackButton />
      </div>
      <header className="mb-6 text-center">
        <p className="text-sm text-neutral-400">Commande</p>
        <h1 className="text-3xl font-extrabold text-brand">#{order.id}</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {modeLabel(order.mode)} · {order.customerName}
        </p>
      </header>

      {/* Bloc statut */}
      <section className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center">
        <div className="text-5xl">{meta.emoji}</div>
        <h2 className="mt-3 text-xl font-bold">{meta.label}</h2>

        {order.status === "pending" && (
          <p className="mt-1 text-sm text-neutral-400">
            Le restaurant examine votre commande…
          </p>
        )}
        {order.status === "accepted" && order.waitTime != null && (
          <div className="mt-1">
            <p className="text-lg text-neutral-200">
              Temps d&apos;attente estimé :{" "}
              <span className="font-bold text-brand">{order.waitTime} min</span>
            </p>
            <p className="mt-0.5 text-sm text-neutral-400">
              Prêt vers{" "}
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
          <p className="mt-1 text-sm text-neutral-400">
            Votre commande vous attend. Bon appétit !
          </p>
        )}
        {order.status === "refused" && (
          <p className="mt-1 text-sm text-neutral-400">
            {order.staffMessage
              ? order.staffMessage
              : "Votre commande n'a pas pu être acceptée."}
          </p>
        )}
      </section>

      {/* Récapitulatif */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Récapitulatif
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
                    {l.options.map((o) => o.label).join(", ")}
                  </span>
                )}
                {l.note && (
                  <span className="block italic text-neutral-500">“{l.note}”</span>
                )}
              </div>
              <span className="shrink-0 text-neutral-300">
                {formatPrice(l.lineTotal)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-neutral-800 pt-3 text-lg font-bold">
          <span>Total</span>
          <span className="text-brand">{formatPrice(order.total)}</span>
        </div>
        <p className="mt-3 text-center text-xs text-neutral-500">
          Paiement sur place. Cette page se met à jour automatiquement.
        </p>
      </section>

      <div className="mt-6 text-center">
        <Link
          href="/mes-commandes"
          className="text-sm text-neutral-400 underline underline-offset-4 hover:text-neutral-200"
        >
          Voir toutes mes commandes
        </Link>
      </div>
    </main>
  );
}
