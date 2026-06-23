// /api/orders/track/[token]
//   GET : suivi PUBLIC d'une commande via son jeton non devinable.
//
// C'est le SEUL accès public aux détails d'une commande. On passe par un jeton
// aléatoire (et non l'id séquentiel) pour éviter qu'on puisse énumérer les
// commandes et récupérer les coordonnées des clients.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeOrder } from "@/lib/order";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Jeton invalide." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { token } });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  return NextResponse.json(serializeOrder(order));
}
