"use client";

// Tableau de bord administrateur : ventes + commandes pour une période choisie
// (raccourcis aujourd'hui/hier/7j/30j/ce mois/mois dernier/12 mois OU plage de
// dates via le calendrier). Stats ET liste suivent dynamiquement la période.
// Statuts colorés, panneau de détail au clic, modale de confirmation de
// suppression (suppression définitive, réservée à l'admin).

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderDTO, OrderStatus } from "@/lib/types";
import type { PeriodStats } from "@/lib/stats";
import { formatPrice, modeKey, statusKey, STATUS_EMOJI } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { LOCALE_BCP47 } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";

/** Date "YYYY-MM-DD" à l'heure de Bruxelles (cohérent avec le calcul serveur). */
function brusselsDateStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(d);
}
const pad = (n: number) => String(n).padStart(2, "0");

type Range = { from: string; to: string };
function dayRange(daysAgo: number): Range {
  const s = brusselsDateStr(new Date(Date.now() - daysAgo * 86_400_000));
  return { from: s, to: s };
}
function lastNDays(n: number): Range {
  return {
    from: brusselsDateStr(new Date(Date.now() - n * 86_400_000)),
    to: brusselsDateStr(),
  };
}
function thisMonthRange(): Range {
  const [y, m] = brusselsDateStr().split("-").map(Number);
  return { from: `${y}-${pad(m)}-01`, to: brusselsDateStr() };
}
function lastMonthRange(): Range {
  const [y, m] = brusselsDateStr().split("-").map(Number);
  let py = y;
  let pm = m - 1;
  if (pm === 0) {
    pm = 12;
    py = y - 1;
  }
  const last = new Date(py, pm, 0).getDate(); // dernier jour du mois pm (1-based)
  return { from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(last)}` };
}

const PRESETS: { id: string; labelKey: MessageKey; range: () => Range }[] = [
  { id: "today", labelKey: "admin.today", range: () => dayRange(0) },
  { id: "yesterday", labelKey: "admin.yesterday", range: () => dayRange(1) },
  { id: "week", labelKey: "admin.week", range: () => lastNDays(6) },
  { id: "month", labelKey: "admin.month", range: () => lastNDays(29) },
  { id: "thisMonth", labelKey: "admin.thisMonth", range: thisMonthRange },
  { id: "lastMonth", labelKey: "admin.lastMonth", range: lastMonthRange },
  { id: "year", labelKey: "admin.year", range: () => lastNDays(364) },
];

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  accepted: "bg-sky-500/15 text-sky-400",
  ready: "bg-green-500/15 text-green-400",
  refused: "bg-red-500/15 text-red-400",
};

export default function AdminDashboard({
  initialStats,
  initialOrders,
  initialDate,
  multiLocation,
}: {
  initialStats: PeriodStats;
  initialOrders: OrderDTO[];
  initialDate: string;
  multiLocation: boolean;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [period, setPeriod] = useState<string>("today"); // id de raccourci ou "custom"
  const [from, setFrom] = useState(initialDate);
  const [to, setTo] = useState(initialDate);
  const [stats, setStats] = useState<PeriodStats>(initialStats);
  const [orders, setOrders] = useState<OrderDTO[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState<OrderDTO | null>(null);

  const s = stats;

  const dateLabel = (iso: string) =>
    new Date(iso).toLocaleString(LOCALE_BCP47[locale], {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Libellé lisible de la période sélectionnée (ex. "jeudi 26 juin").
  const human = (str: string, weekday: boolean) =>
    new Date(`${str}T12:00:00`).toLocaleDateString(
      LOCALE_BCP47[locale],
      weekday
        ? { weekday: "long", day: "numeric", month: "long" }
        : { day: "numeric", month: "long" },
    );
  const periodLabel = from === to ? human(from, true) : `${human(from, false)} → ${human(to, false)}`;

  // Ouvre le calendrier natif au clic n'importe où sur le champ.
  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.();
    } catch {
      /* ignore */
    }
  };

  const loadRange = useCallback(
    async (f: string, tt: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/stats?from=${f}&to=${tt}`, {
          cache: "no-store",
        });
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as { stats: PeriodStats; orders: OrderDTO[] };
          setStats(data.stats);
          setOrders(data.orders);
        }
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  function selectPreset(preset: (typeof PRESETS)[number]) {
    const r = preset.range();
    setPeriod(preset.id);
    setFrom(r.from);
    setTo(r.to);
    loadRange(r.from, r.to);
  }
  function changeFrom(v: string) {
    if (!v) return;
    setPeriod("custom");
    setFrom(v);
    loadRange(v, to);
  }
  function changeTo(v: string) {
    if (!v) return;
    setPeriod("custom");
    setTo(v);
    loadRange(from, v);
  }

  async function confirmRemove() {
    if (confirmDelete == null) return;
    const id = confirmDelete;
    setDeleting(true);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== id));
        setConfirmDelete(null);
        loadRange(from, to); // recalcule KPI + liste pour la période courante
      }
    } finally {
      setDeleting(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          {t("admin.title")} <span className="text-brand">{t("admin.suffix")}</span>
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={logout}
            className="rounded-full bg-neutral-800 px-3 py-1.5 text-neutral-300"
          >
            {t("admin.logout")}
          </button>
        </div>
      </header>

      {/* Sélection de période : raccourcis + plage personnalisée (calendrier) */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => selectPreset(p)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                period === p.id
                  ? "bg-brand text-neutral-950"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-3">
          <label className="flex flex-col text-xs text-neutral-400">
            {t("history.from")}
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => changeFrom(e.target.value)}
              onClick={openPicker}
              className="mt-1 cursor-pointer rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col text-xs text-neutral-400">
            {t("history.to")}
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => changeTo(e.target.value)}
              onClick={openPicker}
              className="mt-1 cursor-pointer rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-brand"
            />
          </label>
        </div>
      </div>

      {/* Libellé lisible de la période active */}
      <p className="mb-5 text-sm text-neutral-400">
        📅 <span className="font-semibold capitalize text-neutral-200">{periodLabel}</span>
        {loading && <span className="ml-2 text-neutral-500">· {t("common.loading")}</span>}
      </p>

      {/* Cartes de stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("admin.revenue")} value={formatPrice(s.revenue, locale)} accent />
        <StatCard label={t("admin.received")} value={String(s.received)} />
        <StatCard label={t("admin.validated")} value={String(s.validated)} />
        <StatCard label={t("admin.pending")} value={String(s.pending)} />
        <StatCard label={t("admin.refusedCount")} value={String(s.refused)} danger />
        <StatCard label={t("admin.avgBasket")} value={formatPrice(s.avgBasket, locale)} />
      </div>

      {/* Ventilation par établissement (si plusieurs) */}
      {multiLocation && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {t("admin.byLocation")}
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="px-3 py-2 text-left"></th>
                  <th className="px-3 py-2 text-right">{t("admin.revenue")}</th>
                  <th className="px-3 py-2 text-right">{t("admin.received")}</th>
                  <th className="px-3 py-2 text-right">{t("admin.validated")}</th>
                  <th className="px-3 py-2 text-right">{t("admin.pending")}</th>
                  <th className="px-3 py-2 text-right">{t("admin.refusedCount")}</th>
                </tr>
              </thead>
              <tbody>
                {s.byLocation.map((loc) => (
                  <tr key={loc.id} className="border-t border-neutral-800 bg-neutral-900">
                    <td className="px-3 py-2 font-medium">{loc.name}</td>
                    <td className="px-3 py-2 text-right font-semibold text-brand">
                      {formatPrice(loc.revenue, locale)}
                    </td>
                    <td className="px-3 py-2 text-right">{loc.received}</td>
                    <td className="px-3 py-2 text-right">{loc.validated}</td>
                    <td className="px-3 py-2 text-right text-amber-400">{loc.pending}</td>
                    <td className="px-3 py-2 text-right text-red-400">{loc.refused}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Commandes de la période (clic = détail) */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t("admin.recentOrders")}
        </h2>
        {loading ? (
          <p className="text-neutral-500">{t("common.loading")}</p>
        ) : orders.length === 0 ? (
          <p className="text-neutral-500">{t("admin.noOrders")}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-neutral-800">
            <table className="w-full text-sm">
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setDetail(o)}
                    className="cursor-pointer border-b border-neutral-800 transition last:border-0 hover:bg-neutral-900"
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-neutral-400">{dateLabel(o.createdAt)}</td>
                    <td className="px-3 py-2 text-neutral-300">{o.customerName}</td>
                    <td className="px-3 py-2 text-neutral-400">{t(modeKey(o.mode))}</td>
                    <td className="px-3 py-2">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[o.status]}`}>
                        {STATUS_EMOJI[o.status]} {t(statusKey(o.status))}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{formatPrice(o.total, locale)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(o.id);
                        }}
                        className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/25"
                      >
                        {t("admin.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modale de confirmation de suppression */}
      {confirmDelete != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl">🗑️</div>
            <h3 className="mt-3 text-lg font-bold">{t("admin.deleteTitle")}</h3>
            <p className="mt-1 text-sm text-neutral-400">{t("admin.deleteWarn")}</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 rounded-xl bg-neutral-800 px-4 py-3 font-semibold text-neutral-200 transition active:scale-[0.98] disabled:opacity-50"
              >
                {t("admin.cancel")}
              </button>
              <button
                onClick={confirmRemove}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {t("admin.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panneau de détail d'une commande */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-neutral-800 bg-neutral-900 p-6 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold">{t("admin.orderDetails")}</h3>
              <button
                onClick={() => setDetail(null)}
                className="text-neutral-500 transition hover:text-neutral-200"
                aria-label={t("admin.cancel")}
              >
                ✕
              </button>
            </div>

            <div className="mb-4 flex flex-col gap-1.5 text-sm">
              <Row label={t("history.colClient")} value={detail.customerName} />
              {detail.phone && <Row label={t("contact.phone")} value={detail.phone} />}
              <Row label={t("history.colMode")} value={t(modeKey(detail.mode))} />
              {detail.address && <Row label={t("contact.address")} value={detail.address} />}
              <div className="flex justify-between gap-3">
                <span className="text-neutral-400">{t("history.colStatus")}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[detail.status]}`}>
                  {STATUS_EMOJI[detail.status]} {t(statusKey(detail.status))}
                </span>
              </div>
              <Row label={t("history.colDate")} value={dateLabel(detail.createdAt)} />
            </div>

            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t("history.colItems")}
            </h4>
            <ul className="flex flex-col gap-2">
              {detail.items.map((l, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-neutral-800 pb-2 last:border-0">
                  <div>
                    <span className="font-medium">
                      {l.qty}× {l.name}
                    </span>
                    {l.options.length > 0 && (
                      <span className="block text-xs text-neutral-400">
                        {l.options.map((o) => o.label).join(", ")}
                      </span>
                    )}
                    {l.note && <span className="block text-xs italic text-neutral-500">“{l.note}”</span>}
                  </div>
                  <span className="shrink-0 text-neutral-300">{formatPrice(l.lineTotal, locale)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex justify-between border-t border-neutral-800 pt-3 text-lg font-bold">
              <span>{t("cart.total")}</span>
              <span className="text-brand">{formatPrice(detail.total, locale)}</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-neutral-400">{label}</span>
      <span className="text-right font-medium text-neutral-200">{value}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-xs text-neutral-400">{label}</div>
      <div
        className={`text-xl font-extrabold ${
          accent ? "text-brand" : danger ? "text-red-400" : "text-neutral-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
