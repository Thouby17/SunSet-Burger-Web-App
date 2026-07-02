// /api/push/subscribe
//   POST : enregistre (ou met à jour) un abonnement Web Push.
//   PUBLIC : l'endpoint fourni par le navigateur n'est pas devinable et ne
//   contient pas de donnée sensible ; on autorise donc staff comme client.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    role?: string;
    location?: string | null;
    token?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { endpoint, keys, role } = body;
  if (
    !endpoint ||
    !keys?.p256dh ||
    !keys?.auth ||
    (role !== "staff" && role !== "client")
  ) {
    return NextResponse.json({ error: "Abonnement invalide." }, { status: 400 });
  }

  const data = {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    role,
    location: body.location ?? null,
    token: body.token ?? null,
  };

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: data,
    create: data,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
