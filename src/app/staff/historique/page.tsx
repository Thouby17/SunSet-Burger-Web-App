// Page /staff/historique (protégée par le middleware comme /staff).

import HistoryView from "@/components/HistoryView";

export const dynamic = "force-dynamic";

export default function HistoriquePage() {
  return <HistoryView />;
}
