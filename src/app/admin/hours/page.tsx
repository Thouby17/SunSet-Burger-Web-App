// Page /admin/hours : édition des horaires d'ouverture (admin).
// Protégée par le middleware (cookie admin_auth).

import HoursManager from "@/components/HoursManager";
import { getConfig, getEffectiveHours } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AdminHoursPage() {
  const config = await getConfig();
  const location = config.locations[0]; // un seul établissement aujourd'hui
  const hours = await getEffectiveHours(location);

  return (
    <HoursManager
      initialHours={hours}
      locationId={location.id}
      locationName={location.name}
    />
  );
}
