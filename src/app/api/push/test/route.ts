// /api/push/test
//   POST { location } : envoie une notification de TEST aux appareils staff
//   abonnés de cet établissement, et renvoie un diagnostic précis.
//   Réservé au staff/admin (vérifié via cookie d'auth).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sendTestToStaff } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Garde simple : seul un staff/admin connecté peut déclencher un test.
  const store = await cookies();
  const isStaff =
    (!!process.env.STAFF_PASSWORD &&
      store.get("staff_auth")?.value === process.env.STAFF_PASSWORD) ||
    (!!process.env.ADMIN_PASSWORD &&
      store.get("admin_auth")?.value === process.env.ADMIN_PASSWORD);
  if (!isStaff) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: { location?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const location = (body.location ?? "").trim();
  if (!location) {
    return NextResponse.json({ error: "Établissement manquant." }, { status: 400 });
  }

  const diag = await sendTestToStaff(location);
  return NextResponse.json(diag);
}
