// Page /staff (desktop) : protégée par le middleware (mot de passe).
// App multi-points : si la cuisine n'est pas encore choisie sur cette tablette,
// on demande de la sélectionner ; sinon on affiche le tableau temps réel
// SCOPÉ à cet établissement (filtrage serveur des commandes).

import { getConfig, getStaffLocationId, getLocation } from "@/lib/config";
import { getOrderLabelMap } from "@/lib/menu";
import { getLocale } from "@/i18n/server";
import StaffBoard from "@/components/StaffBoard";
import StaffKitchenSelect from "@/components/StaffKitchenSelect";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const config = await getConfig();
  const staffLocationId = await getStaffLocationId();

  // Pas de cuisine choisie sur cette tablette -> sélection (une seule fois).
  if (!staffLocationId) {
    const locations = config.locations.map((l) => ({
      id: l.id,
      name: l.name,
      address: l.address,
    }));
    return <StaffKitchenSelect locations={locations} />;
  }

  const location = await getLocation(staffLocationId);
  const labelMap = await getOrderLabelMap(await getLocale());
  return (
    <StaffBoard
      defaultWaitTime={config.defaultWaitTime}
      labelMap={labelMap}
      locationId={location!.id}
      locationName={location!.name}
      restaurantName={config.restaurantName}
    />
  );
}
