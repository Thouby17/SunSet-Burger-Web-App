// Page /staff/historique (protégée par le middleware comme /staff).
// Scopée à la cuisine sélectionnée sur la tablette (cookie staff_location) ;
// sans cuisine choisie, on renvoie vers /staff pour en choisir une.

import { redirect } from "next/navigation";
import HistoryView from "@/components/HistoryView";
import { getOrderLabelMap } from "@/lib/menu";
import { getLocation, getStaffLocationId } from "@/lib/config";
import { getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function HistoriquePage() {
  const staffLocationId = await getStaffLocationId();
  if (!staffLocationId) redirect("/staff");

  const location = await getLocation(staffLocationId);
  const labelMap = await getOrderLabelMap(await getLocale());
  return (
    <HistoryView labelMap={labelMap} locationId={location!.id} locationName={location!.name} />
  );
}
