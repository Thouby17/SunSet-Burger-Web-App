// Page /staff/historique (protégée par le middleware comme /staff).

import HistoryView from "@/components/HistoryView";
import { getOrderLabelMap } from "@/lib/menu";
import { getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function HistoriquePage() {
  const labelMap = await getOrderLabelMap(await getLocale());
  return <HistoryView labelMap={labelMap} />;
}
