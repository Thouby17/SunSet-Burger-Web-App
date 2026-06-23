// Page d'accueil minimale : présente le resto et envoie vers la commande.
// (Server Component : lit la config et l'état d'ouverture.)

import Link from "next/link";
import { getConfig, isOpen } from "@/lib/config";
import { getT } from "@/i18n/server";

export default async function HomePage() {
  const config = await getConfig();
  const open = isOpen(config);
  const t = await getT();

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt={config.restaurantName}
          className="h-56 w-56 rounded-2xl object-contain sm:h-64 sm:w-64"
        />
        <p className="mt-4 text-neutral-400">{config.tagline}</p>
      </div>

      <div
        className={`rounded-full px-4 py-1.5 text-sm font-medium ${
          open
            ? "bg-green-500/15 text-green-400"
            : "bg-red-500/15 text-red-400"
        }`}
      >
        {open ? t("home.open") : t("home.closed")}
      </div>

      <Link
        href="/commander"
        className="w-full rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-neutral-950 transition active:scale-[0.98]"
      >
        {t("home.order")}
      </Link>
    </main>
  );
}
