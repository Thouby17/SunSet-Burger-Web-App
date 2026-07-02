"use client";

// Historique des commandes pour le restaurant :
//   - filtre par plage de dates,
//   - totaux (nombre de commandes + chiffre d'affaires de la période),
//   - export CSV (compta / tableur).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderDTO } from "@/lib/types";
import { formatPrice, modeKey, relabelOption, statusKey, STATUS_EMOJI } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { useI18n } from "@/i18n/client";
import { LOCALE_BCP47 } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";

/** Date du jour au format YYYY-MM-DD (pour les <input type="date">). */
function todayStr(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export default function HistoryView({
  labelMap,
  locationId,
  locationName,
}: {
  labelMap?: Record<string, string>;
  locationId: string;
  locationName: string;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();

  const dateTimeLabel = (iso: string) =>
    new Date(iso).toLocaleString(LOCALE_BCP47[locale], {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  /** Résumé textuel des items d'une commande (pour table + CSV). */
  const itemsSummary = (o: OrderDTO): string =>
    o.items
      .map((l) => {
        const opts = l.options.length
          ? ` (${l.options.map((x) => relabelOption(x.id, x.label, labelMap)).join(", ")})`
          : "";
        const note = l.note ? ` [${l.note}]` : "";
        return `${l.qty}× ${l.name}${opts}${note}`;
      })
      .join(" ; ");

  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders?from=${from}&to=${to}&location=${encodeURIComponent(locationId)}`,
        { cache: "no-store" },
      );
      if (res.status === 401) {
        router.push("/staff/login");
        return;
      }
      setOrders((await res.json()) as OrderDTO[]);
    } finally {
      setLoading(false);
    }
  }, [from, to, router, locationId]);

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
    const header = (
      [
        "csv.number",
        "csv.date",
        "csv.mode",
        "csv.firstName",
        "csv.phone",
        "csv.status",
        "csv.totalEur",
        "csv.items",
      ] as MessageKey[]
    ).map((k) => t(k));
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
        t(modeKey(o.mode)),
        o.customerName,
        formatPhone(o.phone),
        t(statusKey(o.status)),
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
    a.download = `commandes_${locationId}_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          {t("history.title")} <span className="text-brand">{t("staff.staffSuffix")}</span>
          <span className="ml-3 rounded-full bg-neutral-800 px-3 py-1 align-middle text-sm font-semibold text-neutral-200">
            {locationName}
          </span>
        </h1>
        <Link
          href="/staff"
          className="rounded-full bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:text-neutral-100"
        >
          {t("history.liveScreen")}
        </Link>
      </header>

      {/* Filtres */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm text-neutral-400">
          {t("history.from")}
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-neutral-100"
          />
        </label>
        <label className="flex flex-col text-sm text-neutral-400">
          {t("history.to")}
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
          {t("history.filter")}
        </button>
        <button
          onClick={exportCsv}
          disabled={orders.length === 0}
          className="rounded-lg bg-neutral-800 px-4 py-2 font-medium text-neutral-200 transition active:scale-[0.98] disabled:opacity-40"
        >
          {t("history.exportCsv")}
        </button>
      </div>

      {/* Totaux */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">{t("history.ordersCount")}</div>
          <div className="text-2xl font-extrabold">{count}</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">{t("history.refusedOf")}</div>
          <div className="text-2xl font-extrabold text-red-400">{refusedCount}</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">{t("history.revenue")}</div>
          <div className="text-2xl font-extrabold text-brand">
            {formatPrice(revenue, locale)}
          </div>
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <p className="text-neutral-500">{t("common.loading")}</p>
      ) : orders.length === 0 ? (
        <p className="text-neutral-500">{t("history.none")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left text-neutral-400">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">{t("history.colDate")}</th>
                <th className="px-3 py-2">{t("history.colMode")}</th>
                <th className="px-3 py-2">{t("history.colClient")}</th>
                <th className="px-3 py-2">{t("history.colStatus")}</th>
                <th className="px-3 py-2 text-right">{t("history.colTotal")}</th>
                <th className="px-3 py-2">{t("history.colItems")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-neutral-800 align-top">
                  <td className="px-3 py-2 font-bold text-brand">#{o.id}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-neutral-300">
                    {dateTimeLabel(o.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-neutral-300">{t(modeKey(o.mode))}</td>
                  <td className="px-3 py-2 text-neutral-300">
                    {o.customerName}
                    <span className="block text-xs text-neutral-500">
                      {formatPhone(o.phone)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {STATUS_EMOJI[o.status]} {t(statusKey(o.status))}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatPrice(o.total, locale)}
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
