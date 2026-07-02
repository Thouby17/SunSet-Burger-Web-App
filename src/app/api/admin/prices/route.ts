// /api/admin/prices
//   POST { location, menuItemId, price }  -> price=number : surcharge le prix ;
//                                            price=null   : retour au prix par défaut.
//   Réservé à l'admin (protégé par le middleware /api/admin/*).

import { NextResponse } from "next/server";
import { setPriceOverride } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { location?: string; menuItemId?: string; price?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { location, menuItemId } = body;
  if (!location || !menuItemId) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  // price : soit null (réinitialiser), soit un nombre >= 0.
  let price: number | null = null;
  if (body.price !== null && body.price !== undefined) {
    const n = Number(body.price);
    if (!Number.isFinite(n) || n < 0 || n > 10000) {
      return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
    }
    price = Math.round(n * 100) / 100; // 2 décimales
  }

  await setPriceOverride(location, menuItemId, price);
  return NextResponse.json({ ok: true });
}
