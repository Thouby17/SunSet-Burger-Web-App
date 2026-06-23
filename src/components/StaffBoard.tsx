"use client";

// Tableau de bord staff : liste des commandes en quasi temps réel (polling 4 s),
// séparées entre "à traiter" et "traitées", triées par heure d'arrivée.
// + Son et titre d'onglet à chaque nouvelle commande, + déconnexion.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderDTO } from "@/lib/types";
import { playBeep } from "@/lib/notify";
import { useI18n } from "@/i18n/client";
import StaffOrderCard from "./StaffOrderCard";
import LangSwitcher from "./LangSwitcher";

const POLL_MS = 4000;

export default function StaffBoard({
  defaultWaitTime,
  labelMap,
}: {
  defaultWaitTime: number;
  labelMap?: Record<string, string>;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  // Pour éviter d'écraser un changement optimiste juste après une action.
  const skipNextPoll = useRef(false);
  // Ids déjà vus : sert à détecter les NOUVELLES commandes.
  const knownIds = useRef<Set<number>>(new Set());
  const firstLoad = useRef(true);
  const soundOnRef = useRef(false);

  const fetchOrders = useCallback(async () => {
    try {
      // ?live=1 : commandes actives + traitées du jour (l'écran ne se remplit
      // pas à l'infini ; l'historique complet est sur /staff/historique).
      const res = await fetch("/api/orders?live=1", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/staff/login");
        return;
      }
      const data = (await res.json()) as OrderDTO[];

      // Détection des nouvelles commandes (hors tout premier chargement).
      const newOnes = data.filter((o) => !knownIds.current.has(o.id));
      if (!firstLoad.current && newOnes.length > 0 && soundOnRef.current) {
        playBeep();
      }
      data.forEach((o) => knownIds.current.add(o.id));
      firstLoad.current = false;

      setOrders(data);
      setLoaded(true);
    } catch {
      // on réessaiera au prochain tick
    }
  }, [router]);

  // Polling.
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      if (skipNextPoll.current) {
        skipNextPoll.current = false;
        return;
      }
      fetchOrders();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Action staff -> PATCH -> rafraîchit la liste.
  const onAction = useCallback(
    async (
      id: number,
      body: { action: string; waitTime?: number; message?: string },
    ) => {
      skipNextPoll.current = true;
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        router.push("/staff/login");
        return;
      }
      if (res.ok) {
        const updated = (await res.json()) as OrderDTO;
        setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      } else {
        fetchOrders();
      }
    },
    [fetchOrders, router],
  );

  // Séparation à traiter / traitées + tri par heure d'arrivée (ancien -> récent).
  const sortAsc = (a: OrderDTO, b: OrderDTO) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  const toHandle = orders
    .filter((o) => o.status === "pending" || o.status === "accepted")
    .sort(sortAsc);
  const handled = orders
    .filter((o) => o.status === "ready" || o.status === "refused")
    .sort(sortAsc)
    .reverse(); // traitées : plus récentes en premier

  // Commandes à traiter, séparées par mode (deux colonnes).
  const dineIn = toHandle.filter((o) => o.mode === "dine_in");
  const takeaway = toHandle.filter((o) => o.mode === "takeaway");

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  // Rendu d'une carte de commande (évite la répétition).
  const renderCard = (o: OrderDTO) => (
    <StaffOrderCard
      key={o.id}
      order={o}
      defaultWaitTime={defaultWaitTime}
      onAction={onAction}
      labelMap={labelMap}
    />
  );

  // Titre d'onglet = nombre de commandes en attente (repère même hors écran).
  useEffect(() => {
    document.title =
      pendingCount > 0
        ? t("staff.tabTitleCount", { n: pendingCount })
        : t("staff.tabTitle");
  }, [pendingCount, t]);

  // Activer le son nécessite un geste utilisateur (politique navigateur).
  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    soundOnRef.current = next;
    if (next) playBeep(120); // petit bip de confirmation = débloque l'audio
  }

  async function logout() {
    await fetch("/api/staff/login", { method: "DELETE" });
    router.push("/staff/login");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          {t("staff.orders")} <span className="text-brand">{t("staff.staffSuffix")}</span>
          {pendingCount > 0 && (
            <span className="ml-3 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-2 text-sm font-bold text-neutral-950">
              {pendingCount}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <LangSwitcher />
          <span className="flex items-center gap-2 text-neutral-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            {t("staff.realtime")}
          </span>
          <Link
            href="/staff/historique"
            className="rounded-full bg-neutral-800 px-3 py-1.5 text-neutral-300 hover:text-white"
          >
            {t("staff.history")}
          </Link>
          <button
            onClick={toggleSound}
            className={`rounded-full px-3 py-1.5 font-medium transition ${
              soundOn
                ? "bg-brand text-neutral-950"
                : "bg-neutral-800 text-neutral-300"
            }`}
          >
            {soundOn ? t("staff.soundOn") : t("staff.soundOff")}
          </button>
          <button
            onClick={logout}
            className="rounded-full bg-neutral-800 px-3 py-1.5 text-neutral-300"
          >
            {t("staff.logout")}
          </button>
        </div>
      </header>

      {!loaded ? (
        <p className="text-neutral-500">{t("common.loading")}</p>
      ) : orders.length === 0 ? (
        <p className="text-neutral-500">{t("staff.noOrders")}</p>
      ) : (
        <div className="space-y-8">
          {/* À traiter — deux colonnes par mode */}
          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {t("staff.dineIn")} ({dineIn.length})
              </h2>
              {dineIn.length === 0 ? (
                <p className="text-sm text-neutral-600">{t("staff.none")}</p>
              ) : (
                <div className="flex flex-col gap-4">{dineIn.map(renderCard)}</div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {t("staff.takeaway")} ({takeaway.length})
              </h2>
              {takeaway.length === 0 ? (
                <p className="text-sm text-neutral-600">{t("staff.none")}</p>
              ) : (
                <div className="flex flex-col gap-4">{takeaway.map(renderCard)}</div>
              )}
            </section>
          </div>

          {/* Traitées */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t("staff.handled")} ({handled.length})
            </h2>
            {handled.length === 0 ? (
              <p className="text-sm text-neutral-600">{t("staff.handledNone")}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {handled.map(renderCard)}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
