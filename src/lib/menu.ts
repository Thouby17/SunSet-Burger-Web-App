// Lecture du menu depuis data/menu.json, avec résolution des langues.
//
// Dans le JSON, les textes (nom, description, libellés de catégories et de
// choix) peuvent être une simple chaîne ou un objet { fr, nl, en }. On lit le
// fichier à chaque requête (pas d'import de module) pour que toute modif de
// data/menu.json soit prise en compte au rechargement. Serveur uniquement.

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ChoiceGroup, Menu, MenuItem, MenuOption } from "./types";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localize, type Localized } from "@/i18n/localize";

const MENU_PATH = path.join(process.cwd(), "data", "menu.json");

// --- Formes "brutes" du JSON (textes potentiellement multilingues) ---
interface RawChoice { id: string; label: Localized; price: number }
interface RawChoiceGroup {
  id: string;
  label: Localized;
  min: number;
  max: number;
  choices: RawChoice[];
}
interface RawOption { id: string; label: Localized; price: number }
interface RawChoiceGroupRef { ref: string; min?: number; max?: number; label?: Localized }
interface RawItem {
  id: string;
  name: Localized;
  description: Localized;
  price: number;
  image: string | null;
  badges: string[];
  options: RawOption[];
  choiceGroups?: RawChoiceGroup[];
  choiceGroupRefs?: (string | RawChoiceGroupRef)[];
}
interface RawCategory { id: string; label: Localized; items: RawItem[] }
interface RawMenu {
  sharedChoiceGroups?: Record<string, RawChoiceGroup>;
  categories: RawCategory[];
}

function resolveChoiceGroup(
  g: RawChoiceGroup,
  locale: Locale,
  overrides?: { min?: number; max?: number; label?: Localized },
) {
  return {
    id: g.id,
    label: localize(overrides?.label ?? g.label, locale),
    min: overrides?.min ?? g.min,
    max: overrides?.max ?? g.max,
    choices: g.choices.map((c) => ({
      id: c.id,
      label: localize(c.label, locale),
      price: c.price,
    })),
  };
}

// En prod, data/menu.json est statique (figé au déploiement). On met en cache
// le JSON brut ET le menu déjà résolu par langue, au niveau module, pour éviter
// de relire/parser/traduire le menu à chaque appel (et il est appelé plusieurs
// fois par requête : page, suivi, et 1× par ligne lors d'une commande).
// En dev, pas de cache (toute modif de data/menu.json est prise en compte).
const IS_PROD = process.env.NODE_ENV === "production";
let _rawMenuCache: RawMenu | null = null;
const _resolvedMenuCache = new Map<Locale, Menu>();

async function loadRawMenu(): Promise<RawMenu> {
  if (_rawMenuCache && IS_PROD) return _rawMenuCache;
  _rawMenuCache = JSON.parse(await readFile(MENU_PATH, "utf-8")) as RawMenu;
  return _rawMenuCache;
}

/** Charge le menu résolu dans la langue voulue (groupes partagés inclus). */
export async function getMenu(locale: Locale = DEFAULT_LOCALE): Promise<Menu> {
  if (IS_PROD) {
    const cached = _resolvedMenuCache.get(locale);
    if (cached) return cached;
  }
  const raw = await loadRawMenu();
  const shared = raw.sharedChoiceGroups ?? {};

  const categories = raw.categories.map((cat) => ({
    id: cat.id,
    label: localize(cat.label, locale),
    items: cat.items.map((item) => {
      // Résolution des références vers les groupes partagés (+ surcharges).
      const fromRefs = (item.choiceGroupRefs ?? [])
        .map((entry) => {
          const refId = typeof entry === "string" ? entry : entry.ref;
          const base = shared[refId];
          if (!base) return null;
          return typeof entry === "string"
            ? resolveChoiceGroup(base, locale)
            : resolveChoiceGroup(base, locale, entry);
        })
        .filter((g): g is NonNullable<typeof g> => Boolean(g));
      const inline = (item.choiceGroups ?? []).map((g) =>
        resolveChoiceGroup(g, locale),
      );

      return {
        id: item.id,
        name: localize(item.name, locale),
        description: localize(item.description, locale),
        price: item.price,
        image: item.image,
        badges: item.badges,
        options: item.options.map((o) => ({
          id: o.id,
          label: localize(o.label, locale),
          price: o.price,
        })),
        choiceGroups: [...fromRefs, ...inline],
      };
    }),
  }));

  // Groupes partagés résolus (une seule fois, quel que soit le nombre de plats
  // qui les référencent) : sert notamment à l'admin (édition des prix) pour ne
  // pas afficher "Sauce" en double pour chaque plat qui la propose.
  const sharedChoiceGroups: Record<string, ChoiceGroup> = {};
  for (const [id, g] of Object.entries(shared)) {
    sharedChoiceGroups[id] = resolveChoiceGroup(g, locale);
  }

  const menu: Menu = { categories, sharedChoiceGroups };
  if (IS_PROD) _resolvedMenuCache.set(locale, menu);
  return menu;
}

/** Retrouve un plat par son id (résolu dans la langue voulue). */
export async function findMenuItem(
  id: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<MenuItem | undefined> {
  const menu = await getMenu(locale);
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

/**
 * Construit la table id -> libellé traduit, pour ré-afficher une commande
 * (dont les libellés ont été figés en FR) dans la langue du lecteur.
 *   - choix  : "groupId:choiceId" -> "Libellé groupe : Libellé choix"
 *   - suppl. : "optionId"         -> "Libellé supplément"
 */
export async function getOrderLabelMap(
  locale: Locale,
): Promise<Record<string, string>> {
  const menu = await getMenu(locale);
  const map: Record<string, string> = {};
  for (const cat of menu.categories) {
    for (const item of cat.items) {
      for (const o of item.options) map[o.id] = o.label;
      for (const g of item.choiceGroups ?? []) {
        for (const c of g.choices) {
          map[`${g.id}:${c.id}`] = `${g.label} : ${c.label}`;
        }
      }
    }
  }
  return map;
}
