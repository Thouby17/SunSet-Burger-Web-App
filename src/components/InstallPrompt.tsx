"use client";

// Assistant d'installation (PWA) :
//  - Android/Chrome : capte l'événement `beforeinstallprompt` et propose un
//    bouton "Installer" qui ouvre la boîte de dialogue native.
//  - iPhone/Safari : iOS n'expose aucune API -> on affiche le geste à faire
//    (Partager -> "Sur l'écran d'accueil").
// Ne s'affiche pas si l'app est déjà installée (mode standalone) ni si le
// client l'a déjà fermé (mémorisé sur l'appareil).

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";

const DISMISS_KEY = "sunset-burger-install-dismissed";

// Type minimal de l'événement Chrome (non standard, absent des types DOM).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const { t } = useI18n();
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Déjà fermé par l'utilisateur ?
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* localStorage indisponible : on continue */
    }

    // Déjà installée (lancée en plein écran) ? -> rien à proposer.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // iOS (iPhone/iPad) : pas d'API d'installation -> on guide.
    const ua = navigator.userAgent;
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS) {
      setPlatform("ios");
      return;
    }

    // Android & autres : on attend le signal d'installabilité du navigateur.
    const onPrompt = (e: Event) => {
      e.preventDefault(); // empêche la mini-infobar par défaut
      setDeferred(e as BeforeInstallPromptEvent);
      setPlatform("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setPlatform(null);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setPlatform(null);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setPlatform(null);
  }

  if (!platform) return null;

  return (
    <div className="mx-auto max-w-md px-4 pt-3">
      <div className="relative flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />

        {platform === "android" ? (
          <>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{t("install.title")}</div>
              <div className="text-xs text-neutral-400">{t("install.subtitle")}</div>
            </div>
            <button
              onClick={install}
              className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-neutral-950 transition active:scale-[0.97]"
            >
              {t("install.button")}
            </button>
          </>
        ) : (
          <div className="min-w-0 flex-1 pr-5">
            <div className="text-sm font-semibold">{t("install.iosTitle")}</div>
            <div className="mt-0.5 text-xs text-neutral-300">
              {t("install.iosStep1")}{" "}
              <span aria-hidden className="text-brand">⬆️</span>{" "}
              {t("install.iosStep2")}{" "}
              <span className="text-neutral-100">{t("install.iosAction")}</span>
            </div>
          </div>
        )}

        <button
          onClick={dismiss}
          aria-label={t("common.close")}
          className="absolute right-2 top-2 text-neutral-500 transition hover:text-neutral-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
