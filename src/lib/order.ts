// Logique métier des commandes côté serveur :
//  - recalcul des prix à partir du menu (on ne fait JAMAIS confiance aux prix
//    envoyés par le client),
//  - sérialisation d'une commande Prisma vers le DTO renvoyé par l'API.

import { findMenuItem, findOption } from "./menu";
import type { OrderDTO, OrderLine, OrderMode, OrderStatus } from "./types";

/** Forme brute d'une ligne envoyée par le client. */
export interface IncomingLine {
  menuItemId: string;
  qty: number;
  note?: string;
  options?: { id: string }[];
  choices?: { groupId: string; choiceId: string }[];
}

/**
 * Recalcule chaque ligne à partir du menu officiel : prix de base + suppléments
 * valides uniquement. Renvoie les lignes complètes et le total.
 * Lève une erreur si un plat est inconnu ou une quantité invalide.
 */
export async function buildOrderLines(
  incoming: IncomingLine[],
): Promise<{ lines: OrderLine[]; total: number }> {
  const lines: OrderLine[] = [];

  for (const raw of incoming) {
    const item = await findMenuItem(raw.menuItemId);
    if (!item) {
      throw new Error(`Plat inconnu : ${raw.menuItemId}`);
    }
    const qty = Math.floor(Number(raw.qty));
    if (!Number.isFinite(qty) || qty < 1) {
      throw new Error(`Quantité invalide pour ${item.name}`);
    }

    // On ne garde que les suppléments réellement proposés pour ce plat.
    const options = (raw.options ?? [])
      .map((o) => findOption(item, o.id))
      .filter((o): o is NonNullable<typeof o> => Boolean(o))
      .map((o) => ({ id: o.id, label: o.label, price: o.price }));

    // Validation des groupes de choix (sauce, viande, taille…).
    const groups = item.choiceGroups ?? [];
    for (const g of groups) {
      const picked = (raw.choices ?? []).filter((c) => c.groupId === g.id);
      if (picked.length < g.min) {
        throw new Error(`Choix obligatoire manquant (${g.label}) pour ${item.name}`);
      }
      if (picked.length > g.max) {
        throw new Error(`Trop de choix (${g.label}) pour ${item.name}`);
      }
      for (const p of picked) {
        if (!g.choices.some((c) => c.id === p.choiceId)) {
          throw new Error(`Choix invalide (${g.label}) pour ${item.name}`);
        }
      }
    }

    // On transforme les choix retenus en "options" stockées (libellé composé).
    const choiceOptions = (raw.choices ?? []).flatMap((p) => {
      const g = groups.find((grp) => grp.id === p.groupId);
      const c = g?.choices.find((x) => x.id === p.choiceId);
      return g && c
        ? [{ id: `${g.id}:${c.id}`, label: `${g.label} : ${c.label}`, price: c.price }]
        : [];
    });

    // Suppléments + choix réunis dans la ligne (affichage + total).
    const allOptions = [...options, ...choiceOptions];
    const extrasTotal = allOptions.reduce((s, o) => s + o.price, 0);
    const unitPrice = item.price + extrasTotal;
    const lineTotal = unitPrice * qty;

    lines.push({
      menuItemId: item.id,
      name: item.name,
      qty,
      note: (raw.note ?? "").slice(0, 200), // garde-fou longueur
      options: allOptions,
      unitPrice,
      lineTotal,
    });
  }

  const total = lines.reduce((s, l) => s + l.lineTotal, 0);
  return { lines, total };
}

/** Type minimal d'un enregistrement Order tel que renvoyé par Prisma. */
interface OrderRecord {
  id: number;
  token: string;
  mode: string;
  customerName: string;
  phone: string;
  items: string;
  total: number;
  status: string;
  waitTime: number | null;
  staffMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Transforme un enregistrement Prisma en DTO (items décodés). */
export function serializeOrder(o: OrderRecord): OrderDTO {
  return {
    id: o.id,
    token: o.token,
    mode: o.mode as OrderMode,
    customerName: o.customerName,
    phone: o.phone,
    items: JSON.parse(o.items) as OrderLine[],
    total: o.total,
    status: o.status as OrderStatus,
    waitTime: o.waitTime,
    staffMessage: o.staffMessage,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
