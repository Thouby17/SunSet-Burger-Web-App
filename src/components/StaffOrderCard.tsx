"use client";

// Carte d'une commande côté staff, avec les actions :
//   - Accepter (en saisissant un temps d'attente en minutes)
//   - Refuser (avec message optionnel)
//   - Marquer "Prête"

import { useState } from "react";
import type { OrderDTO } from "@/lib/types";
import { formatPrice, modeLabel, STATUS_META } from "@/lib/format";
import { formatBeMobile } from "@/lib/phone";

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

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Minutes écoulées depuis `iso`. */
function minutesSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

/** "à l'instant", "il y a 3 min"… */
function elapsedLabel(iso: string): string {
  const m = minutesSince(iso);
  if (m < 1) return "à l'instant";
  return `il y a ${m} min`;
}

export default function StaffOrderCard({
  order,
  defaultWaitTime,
  onAction,
}: {
  order: OrderDTO;
  defaultWaitTime: number;
  onAction: (
    id: number,
    body: { action: string; waitTime?: number; message?: string },
  ) => void;
}) {
  const [wait, setWait] = useState(String(defaultWaitTime));
  const meta = STATUS_META[order.status];

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
            {modeLabel(order.mode)}
          </span>
        </div>
        <div className="text-right text-sm text-neutral-400">
          <div>
            {timeLabel(order.createdAt)}
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
            {meta.emoji} {meta.label}
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
                ({l.options.map((o) => o.label).join(", ")})
              </span>
            )}
            {l.note && (
              <span className="block pl-4 italic text-amber-400">→ {l.note}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex justify-between border-t border-neutral-800 pt-2 font-bold">
        <span>Total</span>
        <span className="text-brand">{formatPrice(order.total)}</span>
      </div>

      {/* Actions selon le statut */}
      <div className="mt-3">
        {order.status === "pending" && (
          <div className="flex flex-col gap-2">
            {/* Acceptation rapide en un clic */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-neutral-400">Accepter sous :</span>
              {QUICK_TIMES.map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    onAction(order.id, { action: "accept", waitTime: t })
                  }
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-bold text-white transition active:scale-[0.98]"
                >
                  {t} min
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
                Accepter (perso)
              </button>
            </div>

            <button
              onClick={() => {
                // Confirmation explicite avant un refus.
                if (!window.confirm(`Refuser la commande #${order.id} ?`)) return;
                const message = window.prompt("Motif du refus (optionnel) :", "");
                if (message !== null) {
                  onAction(order.id, { action: "refuse", message });
                }
              }}
              className="rounded-lg bg-red-600/90 px-4 py-2 font-medium text-white transition active:scale-[0.98]"
            >
              Refuser
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
                    ⚠ En retard de {lateMin} min (prévu{" "}
                    {readyAt.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    )
                  </span>
                ) : (
                  <span className="text-neutral-400">
                    Prêt vers{" "}
                    <span className="font-semibold text-neutral-200">
                      {readyAt.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
                Marquer “Prête”
              </button>
            <button
              onClick={() => onAction(order.id, { action: "revert" })}
              title="Revenir à « En attente »"
              className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300 transition active:scale-[0.98]"
            >
              ↩
            </button>
            </div>
          </div>
        )}

        {order.status === "ready" && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-blue-400">Commande prête ✓</span>
            <button
              onClick={() => onAction(order.id, { action: "revert" })}
              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition active:scale-[0.98]"
            >
              ↩ Annuler « Prête »
            </button>
          </div>
        )}
        {order.status === "refused" && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-red-400">
              Refusée{order.staffMessage ? ` — ${order.staffMessage}` : ""}
            </span>
            <button
              onClick={() => onAction(order.id, { action: "revert" })}
              className="shrink-0 rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition active:scale-[0.98]"
            >
              ↩ Rétablir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
