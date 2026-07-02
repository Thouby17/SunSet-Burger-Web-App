"use client";

// Contrôle UNIQUE des alertes staff = son (page ouverte) + notifications push
// (écran verrouillé / app fermée / onglet caché), réunis dans un seul bouton.
//
// IMPORTANT : l'état du bouton reflète l'abonnement NOTIFICATIONS (push), pas
// seulement le son. Tant que l'appareil n'a pas autorisé les notifications, le
// bouton reste orange "Activer les alertes" — chaque appareil (téléphone ET PC)
// doit donc être activé explicitement. C'est la notification push qui alerte de
// façon fiable quand l'onglet n'est pas au premier plan (le son in-app est gelé
// par le navigateur dans un onglet caché).

import { useEffect, useState } from "react";
import { enablePush } from "@/lib/pushClient";
import { useI18n } from "@/i18n/client";

type Push =
  | "loading"
  | "unsupported"
  | "ios-needs-install"
  | "default" // supporté, pas encore autorisé
  | "working"
  | "granted"
  | "denied";

export default function AlertsControl({
  soundOn,
  onToggleSound,
  location,
}: {
  soundOn: boolean;
  onToggleSound: () => void;
  location: string;
}) {
  const { t } = useI18n();
  const [push, setPush] = useState<Push>("loading");
  const [testMsg, setTestMsg] = useState<string | null>(null);

  // Détection du support + réabonnement silencieux si déjà autorisé.
  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!supported) {
      const ua = navigator.userAgent;
      const isIOS =
        /iphone|ipad|ipod/i.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      setPush(isIOS && !standalone ? "ios-needs-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPush("denied");
      return;
    }
    if (Notification.permission === "granted") {
      enablePush({ role: "staff", location }).then((ok) =>
        setPush(ok ? "granted" : "default"),
      );
      return;
    }
    setPush("default");
  }, [location]);

  // Active les notifications (permission + abonnement) + s'assure que le son est on.
  async function activate() {
    if (!soundOn) onToggleSound();
    if (push === "granted" || push === "working") return;
    setTestMsg(null);
    setPush("working");
    const ok = await enablePush({ role: "staff", location });
    if (ok) {
      setPush("granted");
    } else if (Notification.permission === "denied") {
      setPush("denied");
    } else {
      // Permission restée "default" : le navigateur n'a affiché AUCUNE fenêtre
      // (demande déjà ignorée plusieurs fois, ou notifications désactivées dans
      // le navigateur/Windows). On explique comment autoriser manuellement.
      setPush("default");
      setTestMsg(t("alerts.noPrompt"));
    }
  }

  if (push === "loading") return null;

  // Élément de contrôle selon l'état (le message d'aide est affiché en dessous,
  // commun à tous les états).
  let control: React.ReactNode;

  if (push === "granted") {
    // Un seul bouton : indique que les alertes sont actives ET sert à couper /
    // remettre le SON (les notifications push restent actives dans tous les cas).
    control = (
      <button
        onClick={onToggleSound}
        title={soundOn ? t("alerts.muteSound") : t("alerts.unmuteSound")}
        className={`rounded-full px-3 py-1.5 font-semibold transition ${
          soundOn ? "bg-green-600 text-white" : "bg-neutral-700 text-neutral-200"
        }`}
      >
        {soundOn ? t("alerts.on") : t("alerts.onMuted")}
      </button>
    );
  } else if (push === "denied") {
    control = (
      <span
        title={t("alerts.blocked")}
        className="rounded-full bg-neutral-800 px-3 py-1.5 font-medium text-amber-400"
      >
        {t("alerts.blockedShort")}
      </span>
    );
  } else if (push === "ios-needs-install") {
    control = (
      <span className="max-w-[14rem] rounded-full bg-neutral-800 px-3 py-1.5 text-right text-xs font-medium text-amber-400">
        {t("alerts.iosInstall")}
      </span>
    );
  } else if (push === "unsupported") {
    control = (
      <button
        onClick={onToggleSound}
        className={`rounded-full px-3 py-1.5 font-semibold transition ${
          soundOn ? "bg-green-600 text-white" : "bg-amber-500 text-neutral-950"
        }`}
      >
        {soundOn ? t("alerts.soundOnly") : t("alerts.activate")}
      </button>
    );
  } else {
    // default / working : à activer (orange = action requise, bien visible).
    control = (
      <button
        onClick={activate}
        disabled={push === "working"}
        className="animate-pulse rounded-full bg-amber-500 px-4 py-1.5 font-bold text-neutral-950 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        {push === "working" ? t("common.loading") : t("alerts.activate")}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {control}
      {(push === "denied" || push === "ios-needs-install") && (
        <span className="max-w-[18rem] text-right text-xs text-amber-400/90">
          {push === "denied" ? t("alerts.blocked") : t("alerts.iosInstall")}
        </span>
      )}
      {testMsg && (
        <span className="max-w-[18rem] text-right text-xs text-neutral-300">{testMsg}</span>
      )}
    </div>
  );
}
