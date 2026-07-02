// /api/orders/[id]
//   GET   : statut d'une commande (suivi client, polling)
//   PATCH : action staff (accepter / refuser / prête)

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { serializeOrder } from "@/lib/order";
import { notifyClient } from "@/lib/push";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  return NextResponse.json(serializeOrder(order));
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  let body: { action?: string; waitTime?: number; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // On construit la mise à jour selon l'action demandée.
  const data: {
    status?: OrderStatus;
    waitTime?: number | null;
    staffMessage?: string | null;
  } = {};

  switch (body.action) {
    case "accept": {
      const wait = Math.floor(Number(body.waitTime));
      if (!Number.isFinite(wait) || wait < 0) {
        return NextResponse.json(
          { error: "Temps d'attente invalide." },
          { status: 400 },
        );
      }
      data.status = "accepted";
      data.waitTime = wait;
      break;
    }
    case "refuse":
      data.status = "refused";
      data.staffMessage = (body.message ?? "").trim().slice(0, 200) || null;
      break;
    case "ready":
      data.status = "ready";
      break;
    case "revert": {
      // Annulation d'un missclick : on recule la commande d'un cran.
      //   prête -> acceptée · acceptée -> en attente · refusée -> en attente
      const current = await prisma.order.findUnique({ where: { id: orderId } });
      if (!current) {
        return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
      }
      switch (current.status as OrderStatus) {
        case "ready":
          data.status = "accepted";
          break;
        case "accepted":
          data.status = "pending";
          data.waitTime = null; // on oublie le temps d'attente saisi
          break;
        case "refused":
          data.status = "pending";
          data.staffMessage = null;
          break;
        default:
          return NextResponse.json(
            { error: "Rien à annuler pour cette commande." },
            { status: 409 },
          );
      }
      break;
    }
    default:
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  try {
    const updated = await prisma.order.update({ where: { id: orderId }, data });

    // Notifie le client (push écran verrouillé) quand sa commande est acceptée
    // ou prête. Envoi APRÈS la réponse (`after`) pour ne pas ralentir l'action staff.
    if (updated.status === "accepted" || updated.status === "ready") {
      const payload =
        updated.status === "ready"
          ? {
              title: "🍔 Commande prête !",
              body: `Votre commande #${updated.id} est prête.`,
            }
          : {
              title: "✅ Commande acceptée",
              body:
                updated.waitTime != null
                  ? `Commande #${updated.id} acceptée — prête dans ~${updated.waitTime} min.`
                  : `Votre commande #${updated.id} a été acceptée.`,
            };
      after(() =>
        notifyClient(updated.token, {
          ...payload,
          url: `/suivi/${updated.token}`,
          tag: `order-${updated.id}`,
        }).catch(() => {}),
      );
    }

    return NextResponse.json(serializeOrder(updated));
  } catch {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
}

// DELETE : suppression définitive d'une commande (réservé à l'admin — le
// middleware vérifie le cookie admin_auth avant d'atteindre ce handler).
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }
  try {
    await prisma.order.delete({ where: { id: orderId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
}
