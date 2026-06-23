// Page /staff (desktop) : charge le temps d'attente par défaut puis affiche le
// tableau de bord temps réel.
//
// ⚠️ Pas d'authentification pour l'instant (hors périmètre v1). En production,
// protéger cette route (mot de passe simple, IP, ou auth) avant ouverture.

import { getConfig } from "@/lib/config";
import { getOrderLabelMap } from "@/lib/menu";
import { getLocale } from "@/i18n/server";
import StaffBoard from "@/components/StaffBoard";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const config = await getConfig();
  const labelMap = await getOrderLabelMap(await getLocale());
  return <StaffBoard defaultWaitTime={config.defaultWaitTime} labelMap={labelMap} />;
}
