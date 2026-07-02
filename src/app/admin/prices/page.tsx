// Page /admin/prices : édition des prix de base des plats (admin).
// Protégée par le middleware (cookie admin_auth).

import PriceManager from "@/components/PriceManager";
import { getMenu } from "@/lib/menu";
import { getPriceOverrides } from "@/lib/pricing";
import { getConfig } from "@/lib/config";
import { getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminPricesPage() {
  const config = await getConfig();
  const location = config.locations[0]; // un seul établissement aujourd'hui

  const [menu, overrides] = await Promise.all([
    getMenu(await getLocale()),
    getPriceOverrides(location.id),
  ]);

  return (
    <PriceManager
      menu={menu}
      initialOverrides={overrides}
      locationId={location.id}
      locationName={location.name}
    />
  );
}
