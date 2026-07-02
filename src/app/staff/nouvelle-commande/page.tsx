// Page /staff/nouvelle-commande : le staff saisit une commande pour un client
// au comptoir (téléphone facultatif). Réutilise le parcours OrderFlow en mode
// "staff". Scopée à la cuisine sélectionnée (cookie staff_location).

import { redirect } from "next/navigation";
import OrderFlow from "@/components/OrderFlow";
import { getMenu } from "@/lib/menu";
import { getDisabledItemIds } from "@/lib/availability";
import { getPriceOverrides, applyPriceOverridesToMenu } from "@/lib/pricing";
import { getConfig, getLocation, getStaffLocationId } from "@/lib/config";
import { getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function StaffNewOrderPage() {
  const staffLocationId = await getStaffLocationId();
  if (!staffLocationId) redirect("/staff");

  const location = await getLocation(staffLocationId);
  const locale = await getLocale();
  const [menu, config, disabledItemIds, priceOverrides] = await Promise.all([
    getMenu(locale),
    getConfig(),
    getDisabledItemIds(location!.id),
    getPriceOverrides(location!.id),
  ]);
  const pricedMenu = applyPriceOverridesToMenu(menu, priceOverrides);

  return (
    <OrderFlow
      menu={pricedMenu}
      open={true}
      restaurantName={config.restaurantName}
      locationId={location!.id}
      locationName={location!.name}
      phoneDisclaimer={config.phoneDisclaimer}
      disabledItemIds={disabledItemIds}
      modes={location!.modes}
      staff
    />
  );
}
