"use client";

// Historique des commandes pour le restaurant :
//   - filtre par plage de dates,
//   - totaux (nombre de commandes + chiffre d'affaires de la période),
//   - export CSV (compta / tableur).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderDTO } from "@/lib/types";
import { formatPrice, modeLabel, STATUS_META } from "@/lib/format";
import { formatBeMobile } from "@/lib/phone";

/** Date du jour au format YYYY-MM-DD (pour les <input type="date">). */
function todayStr(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function dateTimeLabel(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Résumé textuel des items d'une commande (pour table + CSV). */
function itemsSummary(o: OrderDTO): string {
  return o.items
    .map((l) => {
      const opts = l.options.length ? ` (${l.options.map((x) => x.label).join(", ")})` : "";
      const note = l.note ? ` [${l.note}]` : "";
      return `${l.qty}× ${l.name}${opts}${note}`;
    })
    .join(" ; ");
}

export default function HistoryView() {
  const router = useRouter();
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?from=${from}&to=${to}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.push("/staff/login");
        return;
      }
      setOrders((await res.json()) as OrderDTO[]);
    } finally {
      setLoading(false);
    }
  }, [from, to, router]);

  // Chargement initial (aujourd'hui).
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Totaux : on ne compte dans le CA que les commandes non refusées.
  const count = orders.length;
  const refusedCount = orders.filter((o) => o.status === "refused").length;
  const revenue = orders
    .filter((o) => o.status !== "refused")
    .reduce((s, o) => s + o.total, 0);

  function exportCsv() {
    const header = [
      "Numero",
      "Date",
      "Mode",
      "Prenom",
      "Telephone",
      "Statut",
      "Total_EUR",
      "Articles",
    ];
    const escape = (v: string | number) => {
      let s = String(v);
      // Neutralise l'injection de formules : un champ commençant par = + - @
      // (ou tab/retour chariot) pourrait être exécuté par Excel. On le préfixe.
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = orders.map((o) =>
      [
        o.id,
        dateTimeLabel(o.createdAt),
        modeLabel(o.mode),
        o.customerName,
        formatBeMobile(o.phone),
        STATUS_META[o.status].label,
        o.total.toFixed(2),
        itemsSummary(o),
      ]
        .map(escape)
        .join(","),
    );

    const csv = [header.map(escape).join(","), ...rows].join("\r\n");
    // BOM pour qu'Excel ouvre l'UTF-8 correctement.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          Historique <span className="text-brand">— Staff</span>
        </h1>
        <Link
          href="/staff"
          className="rounded-full bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:text-white"
        >
          ← Écran live
        </Link>
      </header>

      {/* Filtres */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm text-neutral-400">
          Du
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-neutral-100"
          />
        </label>
        <label className="flex flex-col text-sm text-neutral-400">
          Au
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-neutral-100"
          />
        </label>
        <button
          onClick={load}
          className="rounded-lg bg-brand px-4 py-2 font-bold text-neutral-950 transition active:scale-[0.98]"
        >
          Filtrer
        </button>
        <button
          onClick={exportCsv}
          disabled={orders.length === 0}
          className="rounded-lg bg-neutral-800 px-4 py-2 font-medium text-neutral-200 transition active:scale-[0.98] disabled:opacity-40"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Totaux */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Commandes</div>
          <div className="text-2xl font-extrabold">{count}</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Dont refusées</div>
          <div className="text-2xl font-extrabold text-red-400">{refusedCount}</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Chiffre d&apos;affaires</div>
          <div className="text-2xl font-extrabold text-brand">
            {formatPrice(revenue)}
          </div>
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <p className="text-neutral-500">Chargement…</p>
      ) : orders.length === 0 ? (
        <p className="text-neutral-500">Aucune commande sur cette période.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left text-neutral-400">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Articles</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-neutral-800 align-top">
                  <td className="px-3 py-2 font-bold text-brand">#{o.id}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-neutral-300">
                    {dateTimeLabel(o.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-neutral-300">{modeLabel(o.mode)}</td>
                  <td className="px-3 py-2 text-neutral-300">
                    {o.customerName}
                    <span className="block text-xs text-neutral-500">
                      {formatBeMobile(o.phone)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {STATUS_META[o.status].emoji} {STATUS_META[o.status].label}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatPrice(o.total)}
                  </td>
                  <td className="px-3 py-2 text-neutral-400">{itemsSummary(o)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
