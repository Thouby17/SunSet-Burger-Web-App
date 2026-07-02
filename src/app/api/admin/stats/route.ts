// /api/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
//   GET : statistiques de ventes + commandes pour une plage de dates.
//   Réservé à l'admin (le middleware vérifie le cookie admin_auth).

import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { getRangeData } from "@/lib/stats";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: "Plage de dates invalide." }, { status: 400 });
  }

  const config = await getConfig();
  const locations = config.locations.map((l) => ({ id: l.id, name: l.name }));
  const data = await getRangeData(locations, from, to);
  return NextResponse.json(data);
}
