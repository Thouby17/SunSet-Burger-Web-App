// Page /admin/menu : gestion de la disponibilité des plats, côté ADMIN.
// Réutilise MenuManager (même logique que /staff/menu) mais en contexte admin :
// retour vers le dashboard et redirection de login vers /admin/login.
// Protégée par le middleware (cookie admin_auth).

import MenuManager from "@/components/MenuManager";
import { getMenu } from "@/lib/menu";
import { getDisabledItemIds } from "@/lib/availability";
import { getPriceOverrides, applyPriceOverridesToMenu } from "@/lib/pricing";
import { getConfig } from "@/lib/config";
import { getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  // Un seul établissement aujourd'hui : on prend le premier de la config.
  const config = await getConfig();
  const location = config.locations[0];

  const [menu, disabled, priceOverrides] = await Promise.all([
    getMenu(await getLocale()),
    getDisabledItemIds(location.id),
    getPriceOverrides(location.id),
  ]);
  const pricedMenu = applyPriceOverridesToMenu(menu, priceOverrides);

  return (
    <MenuManager
      menu={pricedMenu}
      initialDisabled={disabled}
      locationId={location.id}
      locationName={location.name}
      backHref={null}
      loginHref="/admin/login"
    />
  );
}
