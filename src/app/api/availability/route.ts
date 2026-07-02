// /api/availability
//   GET  ?location=<id>            -> { disabled: string[] }  (staff)
//   POST { location, menuItemId, disabled } -> bascule la dispo d'un plat (staff)
//
// Protégé par le middleware (cookie staff_auth). Sert à l'écran /staff/menu.

import { NextResponse } from "next/server";
import { getDisabledItemIds, setItemDisabled } from "@/lib/availability";
import { getLocation } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const location = await getLocation(searchParams.get("location"));
  if (!location) return NextResponse.json({ disabled: [] });
  return NextResponse.json({ disabled: await getDisabledItemIds(location.id) });
}

export async function POST(req: Request) {
  let body: { location?: string; menuItemId?: string; disabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const location = await getLocation(body.location);
  if (!location) {
    return NextResponse.json({ error: "Établissement invalide." }, { status: 400 });
  }
  if (!body.menuItemId || typeof body.menuItemId !== "string") {
    return NextResponse.json({ error: "Plat invalide." }, { status: 400 });
  }

  await setItemDisabled(location.id, body.menuItemId, Boolean(body.disabled));
  return NextResponse.json({ ok: true });
}
