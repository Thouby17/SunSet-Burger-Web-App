// Page /admin : tableau de bord administrateur (protégé par le middleware,
// cookie admin_auth = ADMIN_PASSWORD). Ventes + commandes par période, suppression.

import { getConfig } from "@/lib/config";
import { getRangeData } from "@/lib/stats";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

/** Date du jour "YYYY-MM-DD" à l'heure de Bruxelles. */
function todayBrussels(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(
    new Date(),
  );
}

export default async function AdminPage() {
  const config = await getConfig();
  const locations = config.locations.map((l) => ({ id: l.id, name: l.name }));

  const today = todayBrussels();
  const { stats, orders } = await getRangeData(locations, today, today);

  return (
    <AdminDashboard
      initialStats={stats}
      initialOrders={orders}
      initialDate={today}
      multiLocation={locations.length > 1}
    />
  );
}
