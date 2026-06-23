// /api/orders
//   POST : créer une commande (côté client)
//   GET  : lister toutes les commandes (écran staff)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConfig, isOpen } from "@/lib/config";
import { buildOrderLines, serializeOrder, type IncomingLine } from "@/lib/order";
import { normalizeBeMobile } from "@/lib/phone";
import { rateLimit } from "@/lib/rateLimit";
import type { OrderMode } from "@/lib/types";
import { getLocale } from "@/i18n/server";
import { translate, type MessageKey } from "@/i18n/messages";

// Garde-fous anti-spam : par numéro et par IP.
const MAX_PER_PHONE = 5; // commandes max
const MAX_PER_IP = 12;
const WINDOW_MS = 10 * 60 * 1000; // sur 10 minutes

// Toujours dynamique : on lit la base à chaque requête.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const locale = await getLocale();
  const err = (key: MessageKey) => translate(locale, key);

  let body: {
    mode?: OrderMode;
    customerName?: string;
    phone?: string;
    items?: IncomingLine[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: err("err.invalidRequest") }, { status: 400 });
  }

  // Restaurant fermé -> on refuse la création.
  const config = await getConfig();
  if (!isOpen(config)) {
    return NextResponse.json({ error: err("err.closed") }, { status: 409 });
  }

  // Validations de base.
  const mode = body.mode;
  if (mode !== "dine_in" && mode !== "takeaway") {
    return NextResponse.json({ error: err("err.invalidMode") }, { status: 400 });
  }
  const customerName = (body.customerName ?? "").trim();
  if (!customerName) {
    return NextResponse.json({ error: err("err.nameRequired") }, { status: 400 });
  }
  // Téléphone : on n'accepte qu'un mobile belge, stocké en forme canonique.
  const phone = normalizeBeMobile((body.phone ?? "").trim());
  if (!phone) {
    return NextResponse.json({ error: err("err.invalidPhone") }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: err("err.emptyCart") }, { status: 400 });
  }

  // Anti-spam : on limite par numéro et par IP.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (
    !rateLimit(`phone:${phone}`, MAX_PER_PHONE, WINDOW_MS) ||
    !rateLimit(`ip:${ip}`, MAX_PER_IP, WINDOW_MS)
  ) {
    return NextResponse.json({ error: err("err.tooMany") }, { status: 429 });
  }

  // Recalcul des prix côté serveur (sécurité).
  let lines, total;
  try {
    ({ lines, total } = await buildOrderLines(body.items));
  } catch {
    return NextResponse.json({ error: err("err.invalidCart") }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      mode,
      customerName: customerName.slice(0, 60),
      phone, // déjà normalisé "+324XXXXXXXX"
      items: JSON.stringify(lines),
      total,
    },
  });

  // On renvoie le jeton (lien de suivi non devinable), pas seulement l'id.
  return NextResponse.json({ id: order.id, token: order.token }, { status: 201 });
}

// GET /api/orders (staff, protégé par le middleware)
//   ?live=1                 -> écran live : commandes actives + traitées du jour
//   ?from=YYYY-MM-DD&to=... -> historique sur une plage de dates
//   (aucun paramètre)       -> toutes les commandes
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  let where: Record<string, unknown> | undefined;

  if (searchParams.get("live")) {
    // Début de la journée courante (heure serveur).
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    // On garde TOUTES les commandes encore actives (jamais masquées),
    // + les commandes traitées depuis le début de la journée.
    where = {
      OR: [
        { status: { in: ["pending", "accepted"] } },
        { createdAt: { gte: startOfToday } },
      ],
    };
  } else {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const createdAt: { gte?: Date; lte?: Date } = {};
    // On parse "YYYY-MM-DD" en heure LOCALE (cohérent avec le mode live),
    // sinon "new Date('YYYY-MM-DD')" serait interprété en UTC.
    if (from) {
      const d = new Date(`${from}T00:00:00`);
      if (!isNaN(d.getTime())) createdAt.gte = d;
    }
    if (to) {
      const d = new Date(`${to}T23:59:59.999`); // borne de fin inclusive
      if (!isNaN(d.getTime())) createdAt.lte = d;
    }
    if (createdAt.gte || createdAt.lte) where = { createdAt };
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders.map(serializeOrder));
}
