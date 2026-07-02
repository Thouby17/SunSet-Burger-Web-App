// Logique métier des commandes côté serveur :
//  - recalcul des prix à partir du menu (on ne fait JAMAIS confiance aux prix
//    envoyés par le client),
//  - sérialisation d'une commande Prisma vers le DTO renvoyé par l'API.

import { getMenu, findOption } from "./menu";
import { getPriceOverrides, applyPriceOverridesToMenu } from "./pricing";
import type { MenuItem, OrderDTO, OrderLine, OrderMode, OrderStatus } from "./types";

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
  location: string,
): Promise<{ lines: OrderLine[]; total: number }> {
  const lines: OrderLine[] = [];

  // Libellés figés en FR (langue de référence) ; ré-traduits à l'affichage via
  // getOrderLabelMap(). On charge le menu UNE fois et on indexe par id (au lieu
  // de relire/retraduire le menu pour chaque ligne du panier).
  const [rawMenu, priceOverrides] = await Promise.all([
    getMenu("fr"),
    getPriceOverrides(location),
  ]);
  // Menu avec prix surchargés (plats + suppléments + choix) : tout le recalcul
  // se base dessus, donc les surcharges admin sont prises en compte dans le total.
  const menu = applyPriceOverridesToMenu(rawMenu, priceOverrides);
  const itemById = new Map<string, MenuItem>();
  for (const cat of menu.categories) {
    for (const it of cat.items) itemById.set(it.id, it);
  }

  for (const raw of incoming) {
    const item = itemById.get(raw.menuItemId);
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
  location: string;
  mode: string;
  customerName: string;
  phone: string;
  address: string | null;
  items: string;
  total: number;
  status: string;
  waitTime: number | null;
  staffMessage: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Transforme un enregistrement Prisma en DTO (items décodés). */
export function serializeOrder(o: OrderRecord): OrderDTO {
  return {
    id: o.id,
    token: o.token,
    location: o.location,
    mode: o.mode as OrderMode,
    customerName: o.customerName,
    phone: o.phone,
    address: o.address,
    items: JSON.parse(o.items) as OrderLine[],
    total: o.total,
    status: o.status as OrderStatus,
    waitTime: o.waitTime,
    staffMessage: o.staffMessage,
    source: o.source,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
