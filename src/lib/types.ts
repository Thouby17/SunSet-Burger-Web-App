// Types partagés entre le menu (JSON), le panier (client) et les commandes (API).

/** Un supplément payant attaché à un plat (ex. "Bacon +2€"). */
export interface MenuOption {
  id: string;
  label: string;
  price: number;
}

/** Une possibilité dans un groupe de choix (ex. "Andalouse", "33 cl"). */
export interface MenuChoice {
  id: string;
  label: string;
  price: number; // 0 si gratuit
}

/**
 * Un groupe de choix par plat (ex. "Sauce", "Viande", "Accompagnement", "Taille").
 * min/max bornent le nombre de sélections :
 *   - max = 1            -> boutons radio (un seul)
 *   - max > 1            -> cases à cocher (jusqu'à max)
 *   - min >= 1           -> sélection obligatoire
 */
export interface ChoiceGroup {
  id: string;
  label: string;
  min: number;
  max: number;
  choices: MenuChoice[];
}

/** Un plat du menu, tel que défini dans data/menu.json. */
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  /** Étiquettes type "veggie", "spicy"… (voir BADGES dans format.ts). */
  badges: string[];
  /** Suppléments tarifés proposés pour ce plat (peut être vide). */
  options: MenuOption[];
  /** Groupes de choix propres à ce plat (inline). Optionnel. */
  choiceGroups?: ChoiceGroup[];
  /**
   * Références vers des groupes de choix partagés (voir Menu.sharedChoiceGroups).
   * Chaque entrée est soit l'id du groupe ("sauce"), soit un objet permettant
   * de surcharger min/max/label pour ce plat précis
   * (ex. { "ref": "sauce", "min": 0 } = sauce facultative).
   */
  choiceGroupRefs?: (string | ChoiceGroupRef)[];
}

/** Référence surchargeable vers un groupe de choix partagé. */
export interface ChoiceGroupRef {
  ref: string;
  min?: number;
  max?: number;
  label?: string;
}

/** Une catégorie du menu et ses plats. */
export interface MenuCategory {
  id: string;
  label: string;
  items: MenuItem[];
}

/** Le menu complet. */
export interface Menu {
  /** Groupes de choix réutilisables, référencés par les plats via choiceGroupRefs. */
  sharedChoiceGroups?: Record<string, ChoiceGroup>;
  categories: MenuCategory[];
}

/** Un créneau horaire d'ouverture. */
export interface HoursSlot {
  open: string; // "HH:MM"
  close: string; // "HH:MM"
}

/** Configuration du restaurant (data/config.json). */
export interface RestaurantConfig {
  restaurantName: string;
  tagline: string;
  currency: string;
  defaultWaitTime: number;
  phoneDisclaimer: string;
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  hours: Record<string, HoursSlot[] | string>;
}

/** Mode de retrait choisi par le client. */
export type OrderMode = "dine_in" | "takeaway";

/** Statut d'une commande dans son cycle de vie. */
export type OrderStatus = "pending" | "accepted" | "refused" | "ready";

/** Un supplément retenu dans le panier / la commande (label + prix figés). */
export interface SelectedOption {
  id: string;
  label: string;
  price: number;
}

/** Un choix retenu dans le panier (référence groupe/choix + libellé/prix figés). */
export interface SelectedChoice {
  groupId: string;
  choiceId: string;
  label: string; // libellé composé, ex. "Sauce : Andalouse"
  price: number;
}

/** Une ligne du panier côté client. */
export interface CartLine {
  /** Identifiant unique de la ligne (un même plat peut apparaître 2× avec des options différentes). */
  lineId: string;
  menuItemId: string;
  name: string;
  unitBasePrice: number;
  options: SelectedOption[];
  choices: SelectedChoice[];
  note: string;
  qty: number;
}

/** Une ligne telle qu'envoyée au serveur / stockée dans la commande. */
export interface OrderLine {
  menuItemId: string;
  name: string;
  qty: number;
  note: string;
  options: SelectedOption[];
  unitPrice: number; // prix unitaire (base + options)
  lineTotal: number; // unitPrice * qty
}

/** Une commande telle que renvoyée par l'API (items déjà décodés). */
export interface OrderDTO {
  id: number;
  token: string; // jeton de suivi public
  mode: OrderMode;
  customerName: string;
  phone: string;
  items: OrderLine[];
  total: number;
  status: OrderStatus;
  waitTime: number | null;
  staffMessage: string | null;
  createdAt: string;
  updatedAt: string; // dernière mise à jour (sert de référence à l'acceptation)
}
