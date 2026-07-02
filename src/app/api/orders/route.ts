// /api/orders
//   POST : créer une commande (côté client)
//   GET  : lister toutes les commandes (écran staff)

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getLocation, isLocationOpenNow } from "@/lib/config";
import { buildOrderLines, serializeOrder, type IncomingLine } from "@/lib/order";
import { getDisabledItemIds } from "@/lib/availability";
import { isResolvableAddress } from "@/lib/geocode";
import { notifyStaffNewOrder } from "@/lib/push";
import { normalizePhone } from "@/lib/phone";
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
    location?: string;
    mode?: OrderMode;
    customerName?: string;
    phone?: string;
    address?: string;
    items?: IncomingLine[];
    staffEntry?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: err("err.invalidRequest") }, { status: 400 });
  }

  // Commande saisie par le staff/admin AU COMPTOIR ? On exige À LA FOIS le cookie
  // d'auth ET le drapeau `staffEntry` (envoyé uniquement par /staff/nouvelle-commande).
  // Sinon, une commande client passée depuis un navigateur où le staff est aussi
  // connecté serait marquée "staff" -> et la notification au staff serait sautée.
  const store = await cookies();
  const hasStaffCookie =
    (!!process.env.STAFF_PASSWORD &&
      store.get("staff_auth")?.value === process.env.STAFF_PASSWORD) ||
    (!!process.env.ADMIN_PASSWORD &&
      store.get("admin_auth")?.value === process.env.ADMIN_PASSWORD);
  const isStaffOrder = hasStaffCookie && body.staffEntry === true;

  // Établissement : doit être connu (sinon la commande n'a pas de cuisine cible).
  const location = await getLocation(body.location);
  if (!location) {
    return NextResponse.json({ error: err("err.invalidLocation") }, { status: 400 });
  }
  // Cet établissement est-il ouvert MAINTENANT ? (horaires propres au point,
  // surcharge admin incluse)
  if (!(await isLocationOpenNow(location))) {
    return NextResponse.json({ error: err("err.closed") }, { status: 409 });
  }

  // Modes autorisés pour cet établissement (par défaut sur place + à emporter).
  const allowedModes: OrderMode[] = location.modes ?? ["dine_in", "takeaway"];
  const mode = body.mode;
  if (!mode || !allowedModes.includes(mode)) {
    return NextResponse.json({ error: err("err.invalidMode") }, { status: 400 });
  }
  const isDelivery = mode === "delivery";

  const customerName = (body.customerName ?? "").trim();
  if (!customerName) {
    return NextResponse.json({ error: err("err.nameRequired") }, { status: 400 });
  }

  // Téléphone (mobile belge canonique) :
  //  - obligatoire pour le client et pour TOUTE livraison (contact livreur),
  //  - facultatif pour une commande staff au comptoir (sur place / à emporter).
  const rawPhone = (body.phone ?? "").trim();
  const phone = normalizePhone(rawPhone);
  const phoneRequired = isDelivery || !isStaffOrder;
  if (phoneRequired && !phone) {
    return NextResponse.json({ error: err("err.invalidPhone") }, { status: 400 });
  }
  if (rawPhone && !phone) {
    // Un numéro a été saisi mais il est invalide.
    return NextResponse.json({ error: err("err.invalidPhone") }, { status: 400 });
  }

  // Adresse de livraison : requise et vérifiée (géocodage) en mode livraison.
  let address: string | null = null;
  if (isDelivery) {
    const a = (body.address ?? "").trim();
    if (!a) {
      return NextResponse.json({ error: err("err.addressRequired") }, { status: 400 });
    }
    if (!(await isResolvableAddress(a))) {
      return NextResponse.json({ error: err("checkout.addressError") }, { status: 400 });
    }
    address = a.slice(0, 160);
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: err("err.emptyCart") }, { status: 400 });
  }

  // Refus si un plat du panier a été rendu indisponible pour cet établissement.
  const disabled = new Set(await getDisabledItemIds(location.id));
  if (body.items.some((it) => disabled.has(it.menuItemId))) {
    return NextResponse.json({ error: err("err.itemUnavailable") }, { status: 409 });
  }

  // Anti-spam : par numéro et par IP. Ignoré pour les commandes staff (authentifiées).
  if (!isStaffOrder) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (
      (phone && !rateLimit(`phone:${phone}`, MAX_PER_PHONE, WINDOW_MS)) ||
      !rateLimit(`ip:${ip}`, MAX_PER_IP, WINDOW_MS)
    ) {
      return NextResponse.json({ error: err("err.tooMany") }, { status: 429 });
    }
  }

  // Recalcul des prix côté serveur (sécurité).
  let lines, total;
  try {
    ({ lines, total } = await buildOrderLines(body.items, location.id));
  } catch {
    return NextResponse.json({ error: err("err.invalidCart") }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      location: location.id, // cuisine cible — fige l'établissement de la commande
      mode,
      customerName: customerName.slice(0, 60),
      phone: phone ?? "", // "" pour une commande comptoir sans téléphone
      address,
      items: JSON.stringify(lines),
      total,
      source: isStaffOrder ? "staff" : "client",
    },
  });

  // Notifie le staff de cette cuisine (push écran verrouillé) pour une commande
  // passée en ligne par un client. Envoi ATTENDU (et non via `after`) pour
  // garantir qu'il parte de façon fiable sur serverless ; les échecs n'empêchent
  // jamais la validation de la commande. Les commandes saisies au comptoir par
  // le staff lui-même ne le notifient pas.
  if (order.source === "client") {
    await notifyStaffNewOrder(location.id, {
      title: `🍔 Nouvelle commande #${order.id}`,
      body: `${order.customerName} · ${total.toFixed(2)} €`,
      url: "/staff",
      tag: `order-${order.id}`,
    }).catch(() => {});
  }

  // On renvoie le jeton (lien de suivi non devinable), pas seulement l'id.
  return NextResponse.json({ id: order.id, token: order.token }, { status: 201 });
}

// GET /api/orders (staff, protégé par le middleware)
//   ?live=1                 -> écran live : commandes actives + traitées du jour
//   ?from=YYYY-MM-DD&to=... -> historique sur une plage de dates
//   (aucun paramètre)       -> toutes les commandes
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Isolation des cuisines : on ne renvoie QUE les commandes de l'établissement
  // demandé. Sans établissement valide -> liste vide (jamais de fuite croisée).
  const location = await getLocation(searchParams.get("location"));
  if (!location) return NextResponse.json([]);

  // Toutes les requêtes sont déjà filtrées sur l'établissement (ANDé en Prisma).
  const where: Record<string, unknown> = { location: location.id };

  if (searchParams.get("live")) {
    // Début de la journée courante (heure serveur).
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    // On garde TOUTES les commandes encore actives (jamais masquées),
    // + les commandes traitées depuis le début de la journée.
    where.OR = [
      { status: { in: ["pending", "accepted"] } },
      { createdAt: { gte: startOfToday } },
    ];
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
    if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders.map(serializeOrder));
}
