// Page d'accueil minimale : présente le resto et envoie vers la commande.
// (Server Component : lit la config et l'état d'ouverture.)

import Link from "next/link";
import { getConfig, isOpen } from "@/lib/config";

export default async function HomePage() {
  const config = await getConfig();
  const open = isOpen(config);

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-brand">
          {config.restaurantName}
        </h1>
        <p className="mt-2 text-neutral-400">{config.tagline}</p>
      </div>

      <div
        className={`rounded-full px-4 py-1.5 text-sm font-medium ${
          open
            ? "bg-green-500/15 text-green-400"
            : "bg-red-500/15 text-red-400"
        }`}
      >
        {open ? "● Ouvert — on prend les commandes" : "● Fermé pour le moment"}
      </div>

      <Link
        href="/commander"
        className="w-full rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-neutral-950 transition active:scale-[0.98]"
      >
        Commander
      </Link>
    </main>
  );
}
