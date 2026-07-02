// /api/geocode/suggest?q=...
//   GET : suggestions d'adresses (autocomplétion livraison). Proxy vers Photon
//   (OSM) côté serveur. Public, mais limité par IP pour éviter l'abus.

import { NextResponse } from "next/server";
import { suggestAddresses } from "@/lib/geocode";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // ~1 frappe/300 ms débouncée -> 60/min/IP est large mais borné.
  if (!rateLimit(`geo:${ip}`, 60, 60_000)) {
    return NextResponse.json({ suggestions: [] }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const suggestions = await suggestAddresses(q);
  return NextResponse.json({ suggestions });
}
