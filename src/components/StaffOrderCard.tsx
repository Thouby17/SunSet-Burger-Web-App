"use client";

// Carte d'une commande côté staff, avec les actions :
//   - Accepter (en saisissant un temps d'attente en minutes)
//   - Refuser (avec message optionnel)
//   - Marquer "Prête"

import { useState } from "react";
import type { OrderDTO } from "@/lib/types";
import { formatPrice, modeKey, relabelOption, statusKey, STATUS_EMOJI } from "@/lib/format";
import { formatBeMobile } from "@/lib/phone";
import { useI18n } from "@/i18n/client";
import { LOCALE_BCP47 } from "@/i18n/config";

// Couleur de bordure selon le statut (repère visuel rapide).
const BORDER: Record<OrderDTO["status"], string> = {
  pending: "border-amber-500/60",
  accepted: "border-green-500/40",
  refused: "border-red-500/30 opacity-70",
  ready: "border-blue-500/40 opacity-80",
};

// Boutons de temps d'attente prêts à l'emploi (acceptation en un clic).
const QUICK_TIMES = [10, 15, 20, 30];

// Seuils (en minutes) d'alerte sur une commande en attente trop longtemps.
const WARN_MIN = 5;
const URGENT_MIN = 10;

/** Minutes écoulées depuis `iso`. */
function minutesSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

export default function StaffOrderCard({
  order,
  defaultWaitTime,
  onAction,
  labelMap,
}: {
  order: OrderDTO;
  defaultWaitTime: number;
  onAction: (
    id: number,
    body: { action: string; waitTime?: number; message?: string },
  ) => void;
  labelMap?: Record<string, string>;
}) {
  const { t, locale } = useI18n();
  const [wait, setWait] = useState(String(defaultWaitTime));

  const clockTime = (iso: string | Date) =>
    new Date(iso).toLocaleTimeString(LOCALE_BCP47[locale], {
      hour: "2-digit",
      minute: "2-digit",
    });

  /** "à l'instant", "il y a 3 min"… (traduit) */
  const elapsedLabel = (iso: string) => {
    const m = minutesSince(iso);
    return m < 1 ? t("card.justNow") : t("card.minAgo", { n: m });
  };

  // Alerte d'ancienneté : uniquement pour les commandes encore en attente.
  const waiting = order.status === "pending";
  const elapsedMin = minutesSince(order.createdAt);
  const urgent = waiting && elapsedMin >= URGENT_MIN;
  const warn = waiting && elapsedMin >= WARN_MIN && elapsedMin < URGENT_MIN;

  // Retard : pour une commande acceptée, on compare l'heure promise
  // (acceptation + temps d'attente) à maintenant.
  const accepted = order.status === "accepted";
  const readyAt =
    accepted && order.waitTime != null
      ? new Date(new Date(order.updatedAt).getTime() + order.waitTime * 60_000)
      : null;
  const lateMin = readyAt
    ? Math.floor((Date.now() - readyAt.getTime()) / 60_000)
    : 0;
  const late = !!readyAt && lateMin > 0;

  const ring =
    urgent || late
      ? "ring-2 ring-red-500 animate-pulse"
      : warn
        ? "ring-2 ring-amber-400"
        : "";

  return (
    <div
      className={`rounded-2xl border-2 bg-neutral-900 p-4 ${BORDER[order.status]} ${ring}`}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xl font-extrabold text-brand">#{order.id}</span>
          <span className="ml-2 rounded-full bg-neutral-800 px-2 py-0.5 text-xs">
            {t(modeKey(order.mode))}
          </span>
        </div>
        <div className="text-right text-sm text-neutral-400">
          <div>
            {clockTime(order.createdAt)}
            {waiting && (
              <span
                className={`ml-1 ${
                  urgent ? "text-red-400" : warn ? "text-amber-400" : ""
                }`}
              >
                · {elapsedLabel(order.createdAt)}
              </span>
            )}
          </div>
          <div className="font-medium text-neutral-300">
            {STATUS_EMOJI[order.status]} {t(statusKey(order.status))}
          </div>
        </div>
      </div>

      {/* Client */}
      <div className="mt-1 text-sm text-neutral-300">
        {order.customerName} ·{" "}
        <a href={`tel:${order.phone}`} className="underline underline-offset-2">
          {formatBeMobile(order.phone)}
        </a>
      </div>

      {/* Items */}
      <ul className="mt-3 flex flex-col gap-1.5 border-t border-neutral-800 pt-3 text-sm">
        {order.items.map((l, i) => (
          <li key={i}>
            <span className="font-semibold">
              {l.qty}× {l.name}
            </span>
            {l.options.length > 0 && (
              <span className="text-neutral-400">
                {" "}
                ({l.options.map((o) => relabelOption(o.id, o.label, labelMap)).join(", ")})
              </span>
            )}
            {l.note && (
              <span className="block pl-4 italic text-amber-400">→ {l.note}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex justify-between border-t border-neutral-800 pt-2 font-bold">
        <span>{t("cart.total")}</span>
        <span className="text-brand">{formatPrice(order.total, locale)}</span>
      </div>

      {/* Actions selon le statut */}
      <div className="mt-3">
        {order.status === "pending" && (
          <div className="flex flex-col gap-2">
            {/* Acceptation rapide en un clic */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-neutral-400">{t("card.acceptWithin")}</span>
              {QUICK_TIMES.map((mins) => (
                <button
                  key={mins}
                  onClick={() =>
                    onAction(order.id, { action: "accept", waitTime: mins })
                  }
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-bold text-white transition active:scale-[0.98]"
                >
                  {mins} {t("card.min")}
                </button>
              ))}
            </div>

            {/* Temps personnalisé */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={wait}
                onChange={(e) => setWait(e.target.value)}
                className="w-20 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-center"
              />
              <button
                onClick={() =>
                  onAction(order.id, { action: "accept", waitTime: Number(wait) })
                }
                className="flex-1 rounded-lg bg-green-700 px-4 py-2 font-bold text-white transition active:scale-[0.98]"
              >
                {t("card.acceptCustom")}
              </button>
            </div>

            <button
              onClick={() => {
                // Confirmation explicite avant un refus.
                if (!window.confirm(t("card.refuseConfirm", { id: order.id }))) return;
                const message = window.prompt(t("card.refuseReason"), "");
                if (message !== null) {
                  onAction(order.id, { action: "refuse", message });
                }
              }}
              className="rounded-lg bg-red-600/90 px-4 py-2 font-medium text-white transition active:scale-[0.98]"
            >
              {t("card.refuse")}
            </button>
          </div>
        )}

        {order.status === "accepted" && (
          <div className="flex flex-col gap-2">
            {/* Heure promise + alerte retard */}
            {readyAt && (
              <div className="text-sm">
                {late ? (
                  <span className="font-bold text-red-400">
                    {t("card.lateBy", { n: lateMin, time: clockTime(readyAt) })}
                  </span>
                ) : (
                  <span className="text-neutral-400">
                    {t("card.readyAround")}{" "}
                    <span className="font-semibold text-neutral-200">
                      {clockTime(readyAt)}
                    </span>
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAction(order.id, { action: "ready" })}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition active:scale-[0.98]"
              >
                {t("card.markReady")}
              </button>
            <button
              onClick={() => onAction(order.id, { action: "revert" })}
              title={t("card.revertToPending")}
              className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300 transition active:scale-[0.98]"
            >
              ↩
            </button>
            </div>
          </div>
        )}

        {order.status === "ready" && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-blue-400">{t("card.orderReady")}</span>
            <button
              onClick={() => onAction(order.id, { action: "revert" })}
              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition active:scale-[0.98]"
            >
              {t("card.cancelReady")}
            </button>
          </div>
        )}
        {order.status === "refused" && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-red-400">
              {t("card.refused")}{order.staffMessage ? ` — ${order.staffMessage}` : ""}
            </span>
            <button
              onClick={() => onAction(order.id, { action: "revert" })}
              className="shrink-0 rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition active:scale-[0.98]"
            >
              {t("card.restore")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
