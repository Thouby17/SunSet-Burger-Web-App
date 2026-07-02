"use client";

// Assistant d'installation (PWA) :
//  - Android/Chrome : capte l'événement `beforeinstallprompt` et propose un
//    bouton "Installer" qui ouvre la boîte de dialogue native.
//  - iPhone/Safari : iOS n'expose aucune API -> on montre le geste exact, en
//    3 étapes (Partager -> "Sur l'écran d'accueil" -> "Ajouter").
// Ne s'affiche pas si l'app est déjà installée (mode standalone) ni si le
// client l'a déjà fermé (mémorisé sur l'appareil).

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";

const DISMISS_KEY = "restaurant-app-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Icône iOS "Partager" (carré ouvert + flèche vers le haut).
function ShareIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

// Icône iOS "Sur l'écran d'accueil" (carré avec un +).
function AddHomeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export default function InstallPrompt() {
  const { t } = useI18n();
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* localStorage indisponible : on continue */
    }

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = navigator.userAgent;
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /android/i.test(ua);

    // Pas un mobile → ne pas afficher (desktop Chrome peut aussi émettre beforeinstallprompt)
    if (!isIOS && !isAndroid) return;

    if (isIOS) {
      setPlatform("ios");
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
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
      <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900 p-3">
        <button
          onClick={dismiss}
          aria-label={t("common.close")}
          className="absolute right-2 top-2 text-neutral-500 transition hover:text-neutral-300"
        >
          ✕
        </button>

        {platform === "android" ? (
          <div className="flex items-center gap-3 pr-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-app.png" alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
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
          </div>
        ) : (
          <div className="pr-5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-app.png" alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              <div className="text-sm font-semibold">{t("install.iosTitle")}</div>
            </div>

            <ol className="mt-3 flex flex-col gap-2">
              <li className="flex items-center gap-2.5 text-xs text-neutral-200">
                <Step n={1} />
                <span className="flex-1">{t("install.iosStep1")}</span>
                <ShareIcon className="h-5 w-5 shrink-0 text-brand" />
              </li>
              <li className="flex items-center gap-2.5 text-xs text-neutral-200">
                <Step n={2} />
                <span className="flex-1">{t("install.iosStep2")}</span>
                <AddHomeIcon className="h-5 w-5 shrink-0 text-brand" />
              </li>
              <li className="flex items-center gap-2.5 text-xs text-neutral-200">
                <Step n={3} />
                <span className="flex-1">{t("install.iosStep3")}</span>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

// Pastille numérotée d'une étape.
function Step({ n }: { n: number }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-neutral-950">
      {n}
    </span>
  );
}
