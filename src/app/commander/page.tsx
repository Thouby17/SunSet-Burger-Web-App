// Page /commander (Server Component) :
// charge le menu + l'établissement actif (cookie) sur le serveur, puis délègue
// tout l'interactif au composant client OrderFlow.
// Si aucun établissement n'est choisi -> retour à l'accueil pour en choisir un.

import { redirect } from "next/navigation";
import { getMenu } from "@/lib/menu";
import { getConfig, getActiveLocation, isLocationOpenNow } from "@/lib/config";
import { getDisabledItemIds } from "@/lib/availability";
import { getPriceOverrides, applyPriceOverridesToMenu } from "@/lib/pricing";
import { getLocale } from "@/i18n/server";
import OrderFlow from "@/components/OrderFlow";

export const dynamic = "force-dynamic"; // relit menu/établissement et l'état d'ouverture

export default async function CommanderPage() {
  const locale = await getLocale();
  const location = await getActiveLocation();
  if (!location) redirect("/");

  const [menu, config, disabledItemIds, priceOverrides, open] = await Promise.all([
    getMenu(locale),
    getConfig(),
    getDisabledItemIds(location.id),
    getPriceOverrides(location.id),
    isLocationOpenNow(location),
  ]);
  const pricedMenu = applyPriceOverridesToMenu(menu, priceOverrides);

  return (
    <OrderFlow
      menu={pricedMenu}
      open={open}
      restaurantName={config.restaurantName}
      locationId={location.id}
      locationName={location.name}
      phoneDisclaimer={config.phoneDisclaimer}
      disabledItemIds={disabledItemIds}
      modes={location.modes}
    />
  );
}
