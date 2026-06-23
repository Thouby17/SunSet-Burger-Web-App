// Lecture du menu depuis data/menu.json.
//
// On lit le fichier sur le disque (fs) plutôt que de l'importer en module :
// ainsi tu peux modifier data/menu.json et voir les changements au rechargement
// sans toucher au code. Ces fonctions s'exécutent UNIQUEMENT côté serveur.

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Menu, MenuItem, MenuOption } from "./types";

const MENU_PATH = path.join(process.cwd(), "data", "menu.json");

/** Charge et renvoie le menu complet (groupes de choix partagés résolus). */
export async function getMenu(): Promise<Menu> {
  const raw = await readFile(MENU_PATH, "utf-8");
  const menu = JSON.parse(raw) as Menu;
  const shared = menu.sharedChoiceGroups ?? {};

  // On résout choiceGroupRefs -> choiceGroups complets, pour que le reste du
  // code (fiche plat, validation serveur) n'ait à manipuler que choiceGroups.
  // Une référence peut surcharger min/max/label pour le plat concerné.
  for (const cat of menu.categories) {
    for (const item of cat.items) {
      const fromRefs = (item.choiceGroupRefs ?? [])
        .map((entry) => {
          const refId = typeof entry === "string" ? entry : entry.ref;
          const base = shared[refId];
          if (!base) return null;
          if (typeof entry === "string") return base;
          // Surcharge éventuelle de min / max / label.
          return {
            ...base,
            ...(entry.min !== undefined ? { min: entry.min } : {}),
            ...(entry.max !== undefined ? { max: entry.max } : {}),
            ...(entry.label !== undefined ? { label: entry.label } : {}),
          };
        })
        .filter((g): g is NonNullable<typeof g> => Boolean(g));
      item.choiceGroups = [...fromRefs, ...(item.choiceGroups ?? [])];
    }
  }
  return menu;
}

/** Retrouve un plat par son id (utile pour recalculer les prix côté serveur). */
export async function findMenuItem(id: string): Promise<MenuItem | undefined> {
  const menu = await getMenu();
  for (const cat of menu.categories) {
    const found = cat.items.find((it) => it.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Retrouve un supplément d'un plat par son id. */
export function findOption(item: MenuItem, optionId: string): MenuOption | undefined {
  return item.options.find((o) => o.id === optionId);
}
