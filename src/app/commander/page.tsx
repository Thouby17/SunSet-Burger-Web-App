// Page /commander (Server Component) :
// charge le menu + la config sur le serveur, puis délègue tout l'interactif
// au composant client OrderFlow.

import { getMenu } from "@/lib/menu";
import { getConfig, isOpen } from "@/lib/config";
import { getLocale } from "@/i18n/server";
import OrderFlow from "@/components/OrderFlow";

export const dynamic = "force-dynamic"; // relit menu/config et l'état d'ouverture à chaque visite

export default async function CommanderPage() {
  const locale = await getLocale();
  const [menu, config] = await Promise.all([getMenu(locale), getConfig()]);
  const open = isOpen(config);

  return (
    <OrderFlow
      menu={menu}
      open={open}
      restaurantName={config.restaurantName}
      phoneDisclaimer={config.phoneDisclaimer}
    />
  );
}
