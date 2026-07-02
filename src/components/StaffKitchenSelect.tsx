"use client";

// Sélection de la cuisine sur une tablette staff (app multi-points).
// Le choix est mémorisé dans le cookie `staff_location` ; l'écran staff ne
// recevra ALORS que les commandes de cet établissement (filtrage serveur).
// À faire une seule fois par tablette.

import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import LangSwitcher from "@/components/LangSwitcher";

type Loc = { id: string; name: string; address?: string };

export default function StaffKitchenSelect({ locations }: { locations: Loc[] }) {
  const router = useRouter();
  const { t } = useI18n();

  function choose(id: string) {
    document.cookie = `staff_location=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-6">
      <div className="flex justify-center">
        <LangSwitcher />
      </div>
      <h1 className="text-center text-2xl font-extrabold">{t("staff.chooseKitchen")}</h1>
      <p className="text-center text-sm text-neutral-400">{t("staff.kitchenHint")}</p>
      <div className="flex flex-col gap-3">
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => choose(loc.id)}
            className="flex w-full flex-col gap-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-left transition active:scale-[0.98]"
          >
            <span className="text-lg font-bold">{loc.name}</span>
            {loc.address && <span className="text-sm text-neutral-400">{loc.address}</span>}
          </button>
        ))}
      </div>
    </main>
  );
}
