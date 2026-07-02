// Page d'accueil : logo + choix de l'établissement (app multi-points).
// (Server Component : lit la config et l'état d'ouverture de chaque point.)

import { getConfig, isLocationOpenNow } from "@/lib/config";
import LocationChooser from "@/components/LocationChooser";

export const dynamic = "force-dynamic"; // relit l'état d'ouverture à chaque visite

export default async function HomePage() {
  const config = await getConfig();
  const locations = await Promise.all(
    config.locations.map(async (l) => ({
      id: l.id,
      name: l.name,
      address: l.address,
      open: await isLocationOpenNow(l),
    })),
  );

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col items-center justify-center gap-8 px-6 py-16 md:max-w-2xl">
      <div className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt={config.restaurantName}
          className="h-44 w-44 rounded-3xl bg-white object-contain p-4 shadow-lg sm:h-52 sm:w-52"
        />
        {config.tagline && (
          <p className="mt-4 text-center text-neutral-400">{config.tagline}</p>
        )}
      </div>

      <LocationChooser locations={locations} single={locations.length === 1} />
    </main>
  );
}
