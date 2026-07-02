// Surcharge des prix de base des plats, par établissement.
// Le prix par défaut vient de data/menu.json ; l'admin peut le modifier depuis
// /admin/prices (stocké en base). Appliqué À LA FOIS à l'affichage du menu ET
// au recalcul serveur des commandes. Serveur uniquement.

import { prisma } from "./db";
import type { ChoiceGroup, Menu } from "./types";

/** Prix surchargés (menuItemId -> prix en €) pour un établissement. */
export async function getPriceOverrides(
  location: string,
): Promise<Record<string, number>> {
  const rows = await prisma.priceOverride.findMany({
    where: { location },
    select: { menuItemId: true, price: true },
  });
  const map: Record<string, number> = {};
  for (const r of rows) map[r.menuItemId] = r.price;
  return map;
}

/** Définit (price) ou retire (price=null -> retour au prix par défaut) une surcharge. */
export async function setPriceOverride(
  location: string,
  menuItemId: string,
  price: number | null,
): Promise<void> {
  if (price === null) {
    await prisma.priceOverride.deleteMany({ where: { location, menuItemId } });
  } else {
    await prisma.priceOverride.upsert({
      where: { location_menuItemId: { location, menuItemId } },
      create: { location, menuItemId, price },
      update: { price },
    });
  }
}

/**
 * Renvoie une copie du menu avec les prix surchargés (sinon le menu tel quel).
 * Surcharge le prix de base des plats ET le prix des suppléments (options) et
 * des choix tarifés (ex. "Steak Smash +3€"), tous identifiés par leur `id`.
 */
export function applyPriceOverridesToMenu(
  menu: Menu,
  overrides: Record<string, number>,
): Menu {
  if (Object.keys(overrides).length === 0) return menu;
  const ov = (id: string, fallback: number) =>
    id in overrides ? overrides[id] : fallback;
  const overrideGroup = (g: ChoiceGroup): ChoiceGroup => ({
    ...g,
    // Les choix sont clés par "groupe:choix" : un même id de choix peut
    // exister dans plusieurs groupes avec des prix différents (ex. "cheddar"
    // en sauce gratuite ET en supplément payant) — pas de collision ainsi.
    choices: g.choices.map((c) => ({ ...c, price: ov(`${g.id}:${c.id}`, c.price) })),
  });
  return {
    ...menu,
    categories: menu.categories.map((cat) => ({
      ...cat,
      items: cat.items.map((it) => ({
        ...it,
        price: ov(it.id, it.price),
        options: it.options.map((o) => ({ ...o, price: ov(o.id, o.price) })),
        choiceGroups: (it.choiceGroups ?? []).map(overrideGroup),
      })),
    })),
    sharedChoiceGroups: menu.sharedChoiceGroups
      ? Object.fromEntries(
          Object.entries(menu.sharedChoiceGroups).map(([id, g]) => [id, overrideGroup(g)]),
        )
      : menu.sharedChoiceGroups,
  };
}
