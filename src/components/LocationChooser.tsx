"use client";

// Choix de l'établissement sur l'accueil (app multi-points).
//  - clic sur un établissement -> mémorise le choix (cookie `location`) puis
//    redirige vers la commande,
//  - lien profond QR `/?l=koekelberg` -> sélection automatique (sans clic).
// Le cookie est relu côté serveur pour scoper la commande au bon établissement.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";

type Loc = { id: string; name: string; address?: string; open: boolean };

function setLocationCookie(id: string) {
  document.cookie = `location=${id}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

export default function LocationChooser({
  locations,
  single = false,
}: {
  locations: Loc[];
  single?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [redirecting, setRedirecting] = useState(false);

  function choose(id: string) {
    setLocationCookie(id);
    router.push("/commander");
  }

  // Lien profond : /?l=<id> (QR code d'un établissement précis).
  useEffect(() => {
    const l = new URLSearchParams(window.location.search).get("l");
    if (l && locations.some((x) => x.id === l)) {
      setRedirecting(true);
      choose(l);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (redirecting) return null;

  // Établissement unique : pas de « choix » d'établissement (ce serait confus).
  // On affiche directement un grand bouton « Commander ».
  if (single && locations[0]) {
    const loc = locations[0];
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
        <button
          onClick={() => choose(loc.id)}
          className="w-full rounded-2xl bg-brand px-6 py-5 text-center text-lg font-bold text-neutral-950 shadow-md shadow-brand/20 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-lg hover:shadow-brand/30 active:scale-[0.98]"
        >
          {t("home.order")}
        </button>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            loc.open ? "bg-green-500/15 text-green-700" : "bg-red-500/15 text-red-700"
          }`}
        >
          {loc.open ? t("contact.openNow") : t("contact.closedNow")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-center text-sm font-medium text-neutral-400">
        {t("home.chooseLocation")}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
      {locations.map((loc) => (
        <button
          key={loc.id}
          onClick={() => choose(loc.id)}
          className="flex h-full w-full flex-col gap-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-left transition hover:border-brand active:scale-[0.98]"
        >
          <span className="flex items-center justify-between gap-2">
            <span className="text-lg font-bold">{loc.name}</span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                loc.open ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
              }`}
            >
              {loc.open ? t("contact.openNow") : t("contact.closedNow")}
            </span>
          </span>
          {loc.address && <span className="text-sm text-neutral-400">{loc.address}</span>}
        </button>
      ))}
      </div>
    </div>
  );
}
