// Disponibilité des plats, par établissement.
// Un plat "désactivé" reste visible au menu mais n'est pas commandable
// (rupture de stock temporaire). Le staff/admin gère ça depuis /staff/menu.
// Serveur uniquement (accède à la base).

import { prisma } from "./db";

/** Ids des plats actuellement indisponibles pour un établissement. */
export async function getDisabledItemIds(location: string): Promise<string[]> {
  const rows = await prisma.disabledItem.findMany({
    where: { location },
    select: { menuItemId: true },
  });
  return rows.map((r) => r.menuItemId);
}

/** Active (disabled=false) ou désactive (disabled=true) un plat pour un établissement. */
export async function setItemDisabled(
  location: string,
  menuItemId: string,
  disabled: boolean,
): Promise<void> {
  if (disabled) {
    await prisma.disabledItem.upsert({
      where: { location_menuItemId: { location, menuItemId } },
      create: { location, menuItemId },
      update: {},
    });
  } else {
    await prisma.disabledItem.deleteMany({ where: { location, menuItemId } });
  }
}
