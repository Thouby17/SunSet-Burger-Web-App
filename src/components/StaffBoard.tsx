"use client";

// Tableau de bord staff : liste des commandes en quasi temps réel (polling 4 s),
// séparées entre "à traiter" et "traitées", triées par heure d'arrivée.
// + Son et titre d'onglet à chaque nouvelle commande, + déconnexion.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderDTO, OrderMode } from "@/lib/types";
import { playBeep, startAlarm, stopAlarm, isAudioUnlocked } from "@/lib/notify";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import StaffOrderCard from "./StaffOrderCard";
import LangSwitcher from "./LangSwitcher";
import AlertsControl from "./AlertsControl";

const POLL_MS = 4000;
// Préférence "son" mémorisée sur l'appareil (par défaut activé).
const SOUND_KEY = "staff-sound-enabled";

// Tri par heure d'arrivée (ancien -> récent) — constante hors composant.
const sortByArrivalAsc = (a: OrderDTO, b: OrderDTO) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

// Colonnes "à traiter" par mode (on n'affiche que les modes non vides).
const MODE_COLUMNS: { mode: OrderMode; labelKey: MessageKey }[] = [
  { mode: "dine_in", labelKey: "staff.dineIn" },
  { mode: "delivery", labelKey: "staff.delivery" },
  { mode: "takeaway", labelKey: "staff.takeaway" },
];

export default function StaffBoard({
  defaultWaitTime,
  labelMap,
  locationId,
  locationName,
  restaurantName,
}: {
  defaultWaitTime: number;
  labelMap?: Record<string, string>;
  locationId: string;
  locationName: string;
  restaurantName: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Son activé par défaut (le restaurateur n'a plus à cliquer). Mémorisé ; on
  // ne le coupe que s'il a explicitement choisi "off".
  const [soundOn, setSoundOn] = useState(true);
  // Le contexte audio est-il CONFIRMÉ débloqué (état "running") ? Tant que ce
  // n'est pas le cas, l'alarme peut se déclencher sans qu'aucun son ne sorte,
  // silencieusement (autoplay policy iOS). Affiche une bannière tant que faux.
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Pour éviter d'écraser un changement optimiste juste après une action.
  const skipNextPoll = useRef(false);
  // Ids déjà vus : sert à détecter les NOUVELLES commandes.
  const knownIds = useRef<Set<number>>(new Set());
  const firstLoad = useRef(true);
  const soundOnRef = useRef(true);

  const fetchOrders = useCallback(async () => {
    try {
      // ?live=1 : commandes actives + traitées du jour (l'écran ne se remplit
      // pas à l'infini ; l'historique complet est sur /staff/historique).
      // &location : isolation -> uniquement les commandes de CETTE cuisine.
      const res = await fetch(
        `/api/orders?live=1&location=${encodeURIComponent(locationId)}`,
        { cache: "no-store" },
      );
      if (res.status === 401) {
        router.push("/staff/login");
        return;
      }
      const data = (await res.json()) as OrderDTO[];

      // Détection des nouvelles commandes (hors tout premier chargement).
      const newOnes = data.filter((o) => !knownIds.current.has(o.id));
      if (!firstLoad.current && newOnes.length > 0 && soundOnRef.current) {
        startAlarm();
      }
      data.forEach((o) => knownIds.current.add(o.id));
      firstLoad.current = false;

      setOrders(data);
      setLoaded(true);
    } catch {
      // on réessaiera au prochain tick
    }
  }, [router, locationId]);

  // Écoute les messages du service worker : quand une notif push "NEW_ORDER_PUSH"
  // est reçue, on joue le son immédiatement sans attendre le prochain poll (4 s).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "NEW_ORDER_PUSH" && soundOnRef.current) {
        startAlarm();
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  // Acquittement : toucher l'écran (ou une touche) coupe l'alarme en cours.
  // On l'arrête aussi en quittant l'écran staff.
  useEffect(() => {
    const ack = () => stopAlarm();
    window.addEventListener("pointerdown", ack);
    window.addEventListener("keydown", ack);
    return () => {
      window.removeEventListener("pointerdown", ack);
      window.removeEventListener("keydown", ack);
      stopAlarm();
    };
  }, []);

  // Empêche l'écran de se VERROUILLER (mise en veille auto) tant que l'écran
  // staff est affiché : c'est un écran de cuisine, il doit rester allumé.
  // ⚠️ Si l'écran se verrouille quand même (Wake Lock non supporté, ou verrouillé
  // manuellement), iOS/Android SUSPEND l'exécution JS de la page : le polling
  // et donc l'alarme sonore s'arrêtent complètement tant que l'écran est éteint
  // — c'était la cause du "pas de son" même app ouverte. Le verrou est relâché
  // automatiquement par le navigateur quand l'onglet passe en arrière-plan ; on
  // le redemande donc à chaque retour au premier plan.
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    let released = false;

    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
          wakeLock.addEventListener("release", () => {
            wakeLock = null;
          });
        }
      } catch {
        // Non supporté, ou page pas au premier plan au moment de la demande —
        // sera retenté au prochain "visible".
      }
    }

    requestWakeLock();
    const onVisible = () => {
      if (!released && document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      wakeLock?.release().catch(() => {});
    };
  }, []);

  // Filet de sécurité : le Wake Lock officiel est PEU FIABLE sur iOS Safari
  // (peut réussir sans réellement empêcher le verrouillage, notamment en PWA
  // installée). Technique éprouvée (utilisée par la lib NoSleep.js) : une
  // vidéo MUETTE en boucle est presque toujours autorisée en lecture auto par
  // les navigateurs (contrairement à l'audio) et empêche l'écran de s'éteindre
  // tant qu'elle joue. `videoRef` pointe vers un `<video>` invisible (1x1 px)
  // dans le rendu ci-dessous.
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tryPlay = () => void video.play().catch(() => {});
    tryPlay();
    document.addEventListener("visibilitychange", tryPlay);
    window.addEventListener("pointerdown", tryPlay);
    return () => {
      document.removeEventListener("visibilitychange", tryPlay);
      window.removeEventListener("pointerdown", tryPlay);
    };
  }, []);

  // Polling. On continue MÊME quand l'onglet est en arrière-plan : c'est un
  // écran de cuisine, on veut le son/alerte dès qu'une commande arrive, sans
  // devoir revenir sur l'onglet. On rafraîchit aussi immédiatement au retour.
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      if (skipNextPoll.current) {
        skipNextPoll.current = false;
        return;
      }
      fetchOrders();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) fetchOrders();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchOrders]);

  // Préférence son (mémorisée) + déblocage de l'audio au geste utilisateur.
  // ⚠️ Les navigateurs bloquent le son tant que l'utilisateur n'a pas interagi,
  // ET `ctx.resume()` appelé HORS d'un geste (ex. depuis l'alarme déclenchée par
  // le polling) peut échouer SILENCIEUSEMENT sur iOS : le contexte reste bloqué
  // sans la moindre erreur, sans son, même app ouverte au premier plan. On tente
  // donc le déblocage à CHAQUE interaction (pas juste la première) tant qu'il
  // n'est pas confirmé actif, et on l'affiche clairement (bannière ci-dessous).
  useEffect(() => {
    let on = true;
    try {
      on = localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      /* ignore */
    }
    setSoundOn(on);
    soundOnRef.current = on;
    setAudioUnlocked(isAudioUnlocked());

    const tryUnlock = () => {
      if (isAudioUnlocked()) return;
      playBeep(1, 880, 0.0001); // bip quasi silencieux : tente de débloquer l'audio
      // resume() est asynchrone : on revérifie juste après pour mettre à jour la bannière.
      setTimeout(() => setAudioUnlocked(isAudioUnlocked()), 150);
    };
    window.addEventListener("pointerdown", tryUnlock);
    window.addEventListener("keydown", tryUnlock);
    return () => {
      window.removeEventListener("pointerdown", tryUnlock);
      window.removeEventListener("keydown", tryUnlock);
    };
  }, [locationId]);

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

  // Listes dérivées — mémoïsées : recalculées uniquement quand `orders` change
  // (et non à chaque rendu / chaque poll).
  const { columns, handled, pendingCount } = useMemo(() => {
    const toHandle = orders
      .filter((o) => o.status === "pending" || o.status === "accepted")
      .sort(sortByArrivalAsc);
    const handledList = orders
      .filter((o) => o.status === "ready" || o.status === "refused")
      .sort(sortByArrivalAsc)
      .reverse(); // traitées : plus récentes en premier
    const cols = MODE_COLUMNS.map((c) => ({
      ...c,
      list: toHandle.filter((o) => o.mode === c.mode),
    })).filter((c) => c.list.length > 0);
    return {
      columns: cols,
      handled: handledList,
      pendingCount: orders.filter((o) => o.status === "pending").length,
    };
  }, [orders]);

  // Rendu d'une carte de commande (évite la répétition).
  const renderCard = (o: OrderDTO) => (
    <StaffOrderCard
      key={o.id}
      order={o}
      defaultWaitTime={defaultWaitTime}
      onAction={onAction}
      labelMap={labelMap}
      restaurantName={restaurantName}
      locationName={locationName}
    />
  );

  // Titre d'onglet = nombre de commandes en attente (repère même hors écran).
  useEffect(() => {
    document.title =
      pendingCount > 0
        ? t("staff.tabTitleCount", { n: pendingCount })
        : t("staff.tabTitle");
  }, [pendingCount, t]);

  // Activer/couper le son (mémorisé). À l'activation, on débloque aussi l'audio
  // et les notifications push (écran verrouillé) via ce geste utilisateur.
  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    soundOnRef.current = next;
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      /* ignore */
    }
    if (next) {
      playBeep(120); // petit bip de confirmation = débloque l'audio
      setTimeout(() => setAudioUnlocked(isAudioUnlocked()), 150);
    }
  }

  // Bouton de la bannière : un VRAI clic garantit un déblocage fiable de
  // l'AudioContext (contrairement à une interaction accidentelle ailleurs).
  function activateSound() {
    playBeep(200, 880, 0.5); // bip audible = confirmation immédiate pour le staff
    setTimeout(() => setAudioUnlocked(isAudioUnlocked()), 150);
  }

  async function logout() {
    await fetch("/api/staff/login", { method: "DELETE" });
    router.push("/staff/login");
  }

  // Change la cuisine de cette tablette (oublie l'établissement sélectionné).
  function changeKitchen() {
    document.cookie = "staff_location=; path=/; max-age=0";
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      {/* Vidéo invisible (1x1 px) : voir le commentaire du useEffect ci-dessus,
          empêche l'écran de se verrouiller (filet de sécurité au Wake Lock). */}
      <video
        ref={videoRef}
        src="/nosleep.mp4"
        muted
        loop
        playsInline
        autoPlay
        aria-hidden
        className="pointer-events-none fixed bottom-0 right-0 h-px w-px opacity-0"
      />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          {t("staff.orders")} <span className="text-brand">{t("staff.staffSuffix")}</span>
          <span className="ml-3 rounded-full bg-neutral-800 px-3 py-1 align-middle text-sm font-semibold text-neutral-200">
            {locationName}
          </span>
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
            href="/staff/nouvelle-commande"
            className="rounded-full bg-brand px-3 py-1.5 font-semibold text-neutral-950 transition hover:opacity-90"
          >
            {t("staff.newOrder")}
          </Link>
          <Link
            href="/staff/menu"
            className="rounded-full bg-neutral-800 px-3 py-1.5 text-neutral-300 hover:text-neutral-100"
          >
            {t("staff.menu")}
          </Link>
          <Link
            href="/staff/historique"
            className="rounded-full bg-neutral-800 px-3 py-1.5 text-neutral-300 hover:text-neutral-100"
          >
            {t("staff.history")}
          </Link>
          <AlertsControl
            soundOn={soundOn}
            onToggleSound={toggleSound}
            location={locationId}
          />
          <button
            onClick={changeKitchen}
            className="rounded-full bg-neutral-800 px-3 py-1.5 text-neutral-300"
          >
            {t("staff.changeKitchen")}
          </button>
          <button
            onClick={logout}
            className="rounded-full bg-neutral-800 px-3 py-1.5 text-neutral-300"
          >
            {t("staff.logout")}
          </button>
        </div>
      </header>

      {/* Bannière : le son est activé mais le navigateur bloque encore l'audio
          (aucune interaction confirmée) — sans elle, l'alarme sonnerait dans le
          vide, silencieusement, sans que le staff s'en rende compte. */}
      {soundOn && !audioUnlocked && (
        <button
          onClick={activateSound}
          className="mb-6 flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-amber-500 bg-amber-500/10 px-4 py-3 text-left animate-pulse"
        >
          <span className="font-semibold text-amber-700">
            🔇 {t("staff.audioLockedTitle")}
          </span>
          <span className="shrink-0 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-neutral-950">
            {t("staff.audioLockedAction")}
          </span>
        </button>
      )}

      {!loaded ? (
        <p className="text-neutral-500">{t("common.loading")}</p>
      ) : orders.length === 0 ? (
        <p className="text-neutral-500">{t("staff.noOrders")}</p>
      ) : (
        <div className="space-y-8">
          {/* À traiter — une colonne par mode présent */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {columns.map((c) => (
              <section key={c.mode}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  {t(c.labelKey)} ({c.list.length})
                </h2>
                <div className="flex flex-col gap-4">{c.list.map(renderCard)}</div>
              </section>
            ))}
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
