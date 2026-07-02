// Page /staff/menu : gestion de la disponibilité des plats (staff/admin).
// Scopée à la cuisine sélectionnée (cookie staff_location). Protégée par le
// middleware comme le reste de /staff.

import { redirect } from "next/navigation";
import MenuManager from "@/components/MenuManager";
import { getMenu } from "@/lib/menu";
import { getDisabledItemIds } from "@/lib/availability";
import { getPriceOverrides, applyPriceOverridesToMenu } from "@/lib/pricing";
import { getLocation, getStaffLocationId } from "@/lib/config";
import { getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function StaffMenuPage() {
  const staffLocationId = await getStaffLocationId();
  if (!staffLocationId) redirect("/staff");

  const location = await getLocation(staffLocationId);
  const [menu, disabled, priceOverrides] = await Promise.all([
    getMenu(await getLocale()),
    getDisabledItemIds(location!.id),
    getPriceOverrides(location!.id),
  ]);
  const pricedMenu = applyPriceOverridesToMenu(menu, priceOverrides);

  return (
    <MenuManager
      menu={pricedMenu}
      initialDisabled={disabled}
      locationId={location!.id}
      locationName={location!.name}
    />
  );
}
