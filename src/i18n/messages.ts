// Dictionnaire des textes d'interface, dans les 3 langues.
// FR = référence (toutes les clés). NL (Belgique) et EN doivent avoir les mêmes clés.
//
// Interpolation : les marqueurs {xxx} sont remplacés par translate(key, { xxx }).

import type { Locale } from "./config";

const fr = {
  // Commun
  "common.loading": "Chargement…",
  "common.cancel": "Annuler",
  "common.back": "Retour",

  // Navigation (barre du bas)
  "nav.home": "Accueil",
  "nav.menu": "Menu",
  "nav.myOrders": "Mes commandes",
  "nav.contact": "Contact",

  // Accueil
  "home.open": "● Ouvert — on prend les commandes",
  "home.closed": "● Fermé pour le moment",
  "home.order": "Commander",

  // Choix du mode
  "mode.question": "Comment souhaitez-vous commander ?",
  "mode.dineIn": "Sur place",
  "mode.dineInSub": "Servi à votre table",
  "mode.takeaway": "À emporter",
  "mode.takeawaySub": "Prêt à récupérer",

  // Restaurant fermé
  "closed.title": "Nous sommes fermés",
  "closed.text": "Revenez pendant nos horaires d'ouverture pour passer commande.",
  "closed.backHome": "Retour à l'accueil",

  // Fiche plat
  "item.required": "Obligatoire",
  "item.optional": "facultatif",
  "item.upTo": "jusqu'à {n}",
  "item.supplements": "Suppléments",
  "item.note": "Note (optionnel)",
  "item.notePlaceholder": "Ex. sans oignons, cuisson à point…",
  "item.quantity": "Quantité",
  "item.decrease": "Diminuer",
  "item.increase": "Augmenter",
  "item.add": "Ajouter — {price}",
  "item.missingChoices": "Choix obligatoires manquants",
  "item.addToCart": "+ Ajouter",

  // Panier
  "cart.title": "Votre panier",
  "cart.empty": "Votre panier est vide.",
  "cart.clear": "Vider",
  "cart.clearConfirm": "Vider le panier ?",
  "cart.remove": "Retirer",
  "cart.continue": "Continuer",
  "cart.addMore": "Ajouter d'autres plats",
  "cart.view": "Voir le panier",
  "cart.total": "Total",

  // Identification / envoi
  "checkout.back": "← Retour au panier",
  "checkout.title": "Vos coordonnées",
  "checkout.mode": "Mode :",
  "checkout.firstName": "Prénom",
  "checkout.firstNamePlaceholder": "Ex. Julie",
  "checkout.phone": "Téléphone",
  "checkout.phonePlaceholder": "Ex. 0467 44 07 18",
  "checkout.phoneError":
    "Numéro de mobile belge invalide. Format attendu : 04XX XX XX XX ou +324XX XX XX XX.",
  "checkout.submit": "Envoyer la commande — {price}",
  "checkout.submitting": "Envoi…",
  "checkout.payNote": "Paiement sur place. Aucun paiement en ligne.",
  "checkout.sendFailed": "Échec de l'envoi.",
  "checkout.genericError": "Une erreur est survenue.",

  // Suivi de commande
  "track.notFound": "Commande introuvable",
  "track.placeOrder": "Passer une commande",
  "track.order": "Commande",
  "track.pendingNote": "Le restaurant examine votre commande…",
  "track.waitEstimated": "Temps d'attente estimé :",
  "track.min": "min",
  "track.readyAround": "Prêt vers",
  "track.readyNote": "Votre commande vous attend. Bon appétit !",
  "track.refusedDefault": "Votre commande n'a pas pu être acceptée.",
  "track.summary": "Récapitulatif",
  "track.payAutoUpdate": "Paiement sur place. Cette page se met à jour automatiquement.",
  "track.viewAll": "Voir toutes mes commandes",
  "track.notifyReadyTitle": "Commande #{id} prête !",

  // Mes commandes
  "myorders.title": "Mes commandes",
  "myorders.empty": "Aucune commande sur cet appareil pour le moment.",
  "myorders.order": "Commande",

  // Statuts de commande
  "status.pending": "En attente de validation",
  "status.accepted": "Acceptée",
  "status.refused": "Refusée",
  "status.ready": "Prête",

  // Badges plats
  "badge.veggie": "Végé",
  "badge.spicy": "Épicé",
  "badge.new": "Nouveau",

  // Contact
  "contact.title": "Contact",
  "contact.openNow": "● Ouvert maintenant",
  "contact.closedNow": "● Fermé actuellement",
  "contact.phone": "Téléphone",
  "contact.email": "E-mail",
  "contact.address": "Adresse",
  "contact.hours": "Horaires",
  "contact.closedDay": "Fermé",

  // Jours
  "day.monday": "Lundi",
  "day.tuesday": "Mardi",
  "day.wednesday": "Mercredi",
  "day.thursday": "Jeudi",
  "day.friday": "Vendredi",
  "day.saturday": "Samedi",
  "day.sunday": "Dimanche",

  // Connexion staff
  "staffLogin.title": "Accès staff",
  "staffLogin.password": "Mot de passe",
  "staffLogin.signIn": "Se connecter",
  "staffLogin.signingIn": "Connexion…",
  "staffLogin.failed": "Échec.",
  "staffLogin.error": "Erreur.",

  // Tableau de bord staff
  "staff.orders": "Commandes",
  "staff.staffSuffix": "— Staff",
  "staff.realtime": "Temps réel",
  "staff.history": "📋 Historique",
  "staff.soundOn": "🔔 Son activé",
  "staff.soundOff": "🔕 Activer le son",
  "staff.logout": "Déconnexion",
  "staff.noOrders": "Aucune commande pour le moment.",
  "staff.dineIn": "🍽️ Sur place",
  "staff.takeaway": "🥡 À emporter",
  "staff.none": "Aucune commande.",
  "staff.handled": "Traitées",
  "staff.handledNone": "Aucune.",
  "staff.tabTitle": "Commandes — Staff",
  "staff.tabTitleCount": "({n}) Commandes — Staff",

  // Carte commande (staff)
  "card.acceptWithin": "Accepter sous :",
  "card.min": "min",
  "card.acceptCustom": "Accepter (perso)",
  "card.refuse": "Refuser",
  "card.refuseConfirm": "Refuser la commande #{id} ?",
  "card.refuseReason": "Motif du refus (optionnel) :",
  "card.markReady": "Marquer « Prête »",
  "card.revertToPending": "Revenir à « En attente »",
  "card.orderReady": "Commande prête ✓",
  "card.cancelReady": "↩ Annuler « Prête »",
  "card.refused": "Refusée",
  "card.restore": "↩ Rétablir",
  "card.lateBy": "⚠ En retard de {n} min (prévu {time})",
  "card.readyAround": "Prêt vers",
  "card.justNow": "à l'instant",
  "card.minAgo": "il y a {n} min",

  // Historique
  "history.title": "Historique",
  "history.liveScreen": "← Écran live",
  "history.from": "Du",
  "history.to": "Au",
  "history.filter": "Filtrer",
  "history.exportCsv": "⬇ Export CSV",
  "history.ordersCount": "Commandes",
  "history.refusedOf": "Dont refusées",
  "history.revenue": "Chiffre d'affaires",
  "history.none": "Aucune commande sur cette période.",
  "history.colDate": "Date",
  "history.colMode": "Mode",
  "history.colClient": "Client",
  "history.colStatus": "Statut",
  "history.colTotal": "Total",
  "history.colItems": "Articles",

  // En-têtes CSV
  "csv.number": "Numero",
  "csv.date": "Date",
  "csv.mode": "Mode",
  "csv.firstName": "Prenom",
  "csv.phone": "Telephone",
  "csv.status": "Statut",
  "csv.totalEur": "Total_EUR",
  "csv.items": "Articles",

  // Sélecteur de langue
  "lang.label": "Langue",

  // Erreurs API (renvoyées au client)
  "err.invalidRequest": "Requête invalide.",
  "err.closed": "Le restaurant est actuellement fermé.",
  "err.invalidMode": "Mode de retrait invalide.",
  "err.nameRequired": "Le prénom est requis.",
  "err.invalidPhone":
    "Numéro de mobile belge invalide (format attendu : 04XX XX XX XX).",
  "err.emptyCart": "Le panier est vide.",
  "err.tooMany": "Trop de commandes en peu de temps. Réessayez plus tard.",
  "err.invalidCart": "Panier invalide.",
  "err.tooManyAttempts": "Trop de tentatives. Réessayez dans quelques minutes.",
  "err.staffNotConfigured": "Accès staff non configuré (STAFF_PASSWORD manquant).",
  "err.wrongPassword": "Mot de passe incorrect.",
} as const;

export type MessageKey = keyof typeof fr;
type Dict = Record<MessageKey, string>;

const nl: Dict = {
  "common.loading": "Laden…",
  "common.cancel": "Annuleren",
  "common.back": "Terug",

  "nav.home": "Home",
  "nav.menu": "Menu",
  "nav.myOrders": "Mijn bestellingen",
  "nav.contact": "Contact",

  "home.open": "● Open — we nemen bestellingen aan",
  "home.closed": "● Momenteel gesloten",
  "home.order": "Bestellen",

  "mode.question": "Hoe wilt u bestellen?",
  "mode.dineIn": "Ter plaatse",
  "mode.dineInSub": "Aan tafel geserveerd",
  "mode.takeaway": "Afhalen",
  "mode.takeawaySub": "Klaar om af te halen",

  "closed.title": "We zijn gesloten",
  "closed.text": "Kom terug tijdens onze openingsuren om te bestellen.",
  "closed.backHome": "Terug naar home",

  "item.required": "Verplicht",
  "item.optional": "optioneel",
  "item.upTo": "tot {n}",
  "item.supplements": "Supplementen",
  "item.note": "Opmerking (optioneel)",
  "item.notePlaceholder": "Bv. zonder ui, goed doorbakken…",
  "item.quantity": "Aantal",
  "item.decrease": "Verminderen",
  "item.increase": "Vermeerderen",
  "item.add": "Toevoegen — {price}",
  "item.missingChoices": "Verplichte keuzes ontbreken",
  "item.addToCart": "+ Toevoegen",

  "cart.title": "Uw winkelmandje",
  "cart.empty": "Uw winkelmandje is leeg.",
  "cart.clear": "Legen",
  "cart.clearConfirm": "Winkelmandje legen?",
  "cart.remove": "Verwijderen",
  "cart.continue": "Doorgaan",
  "cart.addMore": "Meer gerechten toevoegen",
  "cart.view": "Winkelmandje bekijken",
  "cart.total": "Totaal",

  "checkout.back": "← Terug naar mandje",
  "checkout.title": "Uw gegevens",
  "checkout.mode": "Wijze:",
  "checkout.firstName": "Voornaam",
  "checkout.firstNamePlaceholder": "Bv. Julie",
  "checkout.phone": "Telefoon",
  "checkout.phonePlaceholder": "Bv. 0467 44 07 18",
  "checkout.phoneError":
    "Ongeldig Belgisch gsm-nummer. Verwacht formaat: 04XX XX XX XX of +324XX XX XX XX.",
  "checkout.submit": "Bestelling versturen — {price}",
  "checkout.submitting": "Versturen…",
  "checkout.payNote": "Betaling ter plaatse. Geen online betaling.",
  "checkout.sendFailed": "Versturen mislukt.",
  "checkout.genericError": "Er is een fout opgetreden.",

  "track.notFound": "Bestelling niet gevonden",
  "track.placeOrder": "Een bestelling plaatsen",
  "track.order": "Bestelling",
  "track.pendingNote": "Het restaurant bekijkt uw bestelling…",
  "track.waitEstimated": "Geschatte wachttijd:",
  "track.min": "min",
  "track.readyAround": "Klaar omstreeks",
  "track.readyNote": "Uw bestelling staat klaar. Smakelijk!",
  "track.refusedDefault": "Uw bestelling kon niet worden aanvaard.",
  "track.summary": "Overzicht",
  "track.payAutoUpdate": "Betaling ter plaatse. Deze pagina wordt automatisch bijgewerkt.",
  "track.viewAll": "Al mijn bestellingen bekijken",
  "track.notifyReadyTitle": "Bestelling #{id} klaar!",

  "myorders.title": "Mijn bestellingen",
  "myorders.empty": "Nog geen bestellingen op dit toestel.",
  "myorders.order": "Bestelling",

  "status.pending": "In afwachting van bevestiging",
  "status.accepted": "Aanvaard",
  "status.refused": "Geweigerd",
  "status.ready": "Klaar",

  "badge.veggie": "Veggie",
  "badge.spicy": "Pikant",
  "badge.new": "Nieuw",

  "contact.title": "Contact",
  "contact.openNow": "● Nu open",
  "contact.closedNow": "● Momenteel gesloten",
  "contact.phone": "Telefoon",
  "contact.email": "E-mail",
  "contact.address": "Adres",
  "contact.hours": "Openingsuren",
  "contact.closedDay": "Gesloten",

  "day.monday": "Maandag",
  "day.tuesday": "Dinsdag",
  "day.wednesday": "Woensdag",
  "day.thursday": "Donderdag",
  "day.friday": "Vrijdag",
  "day.saturday": "Zaterdag",
  "day.sunday": "Zondag",

  "staffLogin.title": "Personeelstoegang",
  "staffLogin.password": "Wachtwoord",
  "staffLogin.signIn": "Inloggen",
  "staffLogin.signingIn": "Inloggen…",
  "staffLogin.failed": "Mislukt.",
  "staffLogin.error": "Fout.",

  "staff.orders": "Bestellingen",
  "staff.staffSuffix": "— Personeel",
  "staff.realtime": "Realtime",
  "staff.history": "📋 Geschiedenis",
  "staff.soundOn": "🔔 Geluid aan",
  "staff.soundOff": "🔕 Geluid aanzetten",
  "staff.logout": "Afmelden",
  "staff.noOrders": "Nog geen bestellingen.",
  "staff.dineIn": "🍽️ Ter plaatse",
  "staff.takeaway": "🥡 Afhalen",
  "staff.none": "Geen bestellingen.",
  "staff.handled": "Behandeld",
  "staff.handledNone": "Geen.",
  "staff.tabTitle": "Bestellingen — Personeel",
  "staff.tabTitleCount": "({n}) Bestellingen — Personeel",

  "card.acceptWithin": "Aanvaarden binnen:",
  "card.min": "min",
  "card.acceptCustom": "Aanvaarden (aangepast)",
  "card.refuse": "Weigeren",
  "card.refuseConfirm": "Bestelling #{id} weigeren?",
  "card.refuseReason": "Reden van weigering (optioneel):",
  "card.markReady": "Markeren als « Klaar »",
  "card.revertToPending": "Terug naar « In afwachting »",
  "card.orderReady": "Bestelling klaar ✓",
  "card.cancelReady": "↩ « Klaar » annuleren",
  "card.refused": "Geweigerd",
  "card.restore": "↩ Herstellen",
  "card.lateBy": "⚠ {n} min te laat (voorzien {time})",
  "card.readyAround": "Klaar omstreeks",
  "card.justNow": "zojuist",
  "card.minAgo": "{n} min geleden",

  "history.title": "Geschiedenis",
  "history.liveScreen": "← Live-scherm",
  "history.from": "Van",
  "history.to": "Tot",
  "history.filter": "Filteren",
  "history.exportCsv": "⬇ CSV exporteren",
  "history.ordersCount": "Bestellingen",
  "history.refusedOf": "Waarvan geweigerd",
  "history.revenue": "Omzet",
  "history.none": "Geen bestellingen in deze periode.",
  "history.colDate": "Datum",
  "history.colMode": "Wijze",
  "history.colClient": "Klant",
  "history.colStatus": "Status",
  "history.colTotal": "Totaal",
  "history.colItems": "Artikelen",

  "csv.number": "Nummer",
  "csv.date": "Datum",
  "csv.mode": "Wijze",
  "csv.firstName": "Voornaam",
  "csv.phone": "Telefoon",
  "csv.status": "Status",
  "csv.totalEur": "Totaal_EUR",
  "csv.items": "Artikelen",

  "lang.label": "Taal",

  "err.invalidRequest": "Ongeldig verzoek.",
  "err.closed": "Het restaurant is momenteel gesloten.",
  "err.invalidMode": "Ongeldige afhaalwijze.",
  "err.nameRequired": "Voornaam is verplicht.",
  "err.invalidPhone":
    "Ongeldig Belgisch gsm-nummer (verwacht formaat: 04XX XX XX XX).",
  "err.emptyCart": "Het winkelmandje is leeg.",
  "err.tooMany": "Te veel bestellingen in korte tijd. Probeer later opnieuw.",
  "err.invalidCart": "Ongeldig winkelmandje.",
  "err.tooManyAttempts": "Te veel pogingen. Probeer over enkele minuten opnieuw.",
  "err.staffNotConfigured":
    "Personeelstoegang niet geconfigureerd (STAFF_PASSWORD ontbreekt).",
  "err.wrongPassword": "Onjuist wachtwoord.",
};

const en: Dict = {
  "common.loading": "Loading…",
  "common.cancel": "Cancel",
  "common.back": "Back",

  "nav.home": "Home",
  "nav.menu": "Menu",
  "nav.myOrders": "My orders",
  "nav.contact": "Contact",

  "home.open": "● Open — we're taking orders",
  "home.closed": "● Currently closed",
  "home.order": "Order",

  "mode.question": "How would you like to order?",
  "mode.dineIn": "Dine in",
  "mode.dineInSub": "Served at your table",
  "mode.takeaway": "Takeaway",
  "mode.takeawaySub": "Ready to pick up",

  "closed.title": "We're closed",
  "closed.text": "Come back during our opening hours to place an order.",
  "closed.backHome": "Back to home",

  "item.required": "Required",
  "item.optional": "optional",
  "item.upTo": "up to {n}",
  "item.supplements": "Extras",
  "item.note": "Note (optional)",
  "item.notePlaceholder": "E.g. no onions, well done…",
  "item.quantity": "Quantity",
  "item.decrease": "Decrease",
  "item.increase": "Increase",
  "item.add": "Add — {price}",
  "item.missingChoices": "Required choices missing",
  "item.addToCart": "+ Add",

  "cart.title": "Your cart",
  "cart.empty": "Your cart is empty.",
  "cart.clear": "Clear",
  "cart.clearConfirm": "Empty the cart?",
  "cart.remove": "Remove",
  "cart.continue": "Continue",
  "cart.addMore": "Add more items",
  "cart.view": "View cart",
  "cart.total": "Total",

  "checkout.back": "← Back to cart",
  "checkout.title": "Your details",
  "checkout.mode": "Method:",
  "checkout.firstName": "First name",
  "checkout.firstNamePlaceholder": "E.g. Julie",
  "checkout.phone": "Phone",
  "checkout.phonePlaceholder": "E.g. 0467 44 07 18",
  "checkout.phoneError":
    "Invalid Belgian mobile number. Expected format: 04XX XX XX XX or +324XX XX XX XX.",
  "checkout.submit": "Send order — {price}",
  "checkout.submitting": "Sending…",
  "checkout.payNote": "Pay on site. No online payment.",
  "checkout.sendFailed": "Sending failed.",
  "checkout.genericError": "An error occurred.",

  "track.notFound": "Order not found",
  "track.placeOrder": "Place an order",
  "track.order": "Order",
  "track.pendingNote": "The restaurant is reviewing your order…",
  "track.waitEstimated": "Estimated wait time:",
  "track.min": "min",
  "track.readyAround": "Ready around",
  "track.readyNote": "Your order is ready. Enjoy!",
  "track.refusedDefault": "Your order could not be accepted.",
  "track.summary": "Summary",
  "track.payAutoUpdate": "Pay on site. This page updates automatically.",
  "track.viewAll": "View all my orders",
  "track.notifyReadyTitle": "Order #{id} ready!",

  "myorders.title": "My orders",
  "myorders.empty": "No orders on this device yet.",
  "myorders.order": "Order",

  "status.pending": "Awaiting confirmation",
  "status.accepted": "Accepted",
  "status.refused": "Refused",
  "status.ready": "Ready",

  "badge.veggie": "Veggie",
  "badge.spicy": "Spicy",
  "badge.new": "New",

  "contact.title": "Contact",
  "contact.openNow": "● Open now",
  "contact.closedNow": "● Currently closed",
  "contact.phone": "Phone",
  "contact.email": "Email",
  "contact.address": "Address",
  "contact.hours": "Opening hours",
  "contact.closedDay": "Closed",

  "day.monday": "Monday",
  "day.tuesday": "Tuesday",
  "day.wednesday": "Wednesday",
  "day.thursday": "Thursday",
  "day.friday": "Friday",
  "day.saturday": "Saturday",
  "day.sunday": "Sunday",

  "staffLogin.title": "Staff access",
  "staffLogin.password": "Password",
  "staffLogin.signIn": "Sign in",
  "staffLogin.signingIn": "Signing in…",
  "staffLogin.failed": "Failed.",
  "staffLogin.error": "Error.",

  "staff.orders": "Orders",
  "staff.staffSuffix": "— Staff",
  "staff.realtime": "Real-time",
  "staff.history": "📋 History",
  "staff.soundOn": "🔔 Sound on",
  "staff.soundOff": "🔕 Enable sound",
  "staff.logout": "Log out",
  "staff.noOrders": "No orders yet.",
  "staff.dineIn": "🍽️ Dine in",
  "staff.takeaway": "🥡 Takeaway",
  "staff.none": "No orders.",
  "staff.handled": "Handled",
  "staff.handledNone": "None.",
  "staff.tabTitle": "Orders — Staff",
  "staff.tabTitleCount": "({n}) Orders — Staff",

  "card.acceptWithin": "Accept within:",
  "card.min": "min",
  "card.acceptCustom": "Accept (custom)",
  "card.refuse": "Refuse",
  "card.refuseConfirm": "Refuse order #{id}?",
  "card.refuseReason": "Reason for refusal (optional):",
  "card.markReady": "Mark “Ready”",
  "card.revertToPending": "Back to “Pending”",
  "card.orderReady": "Order ready ✓",
  "card.cancelReady": "↩ Undo “Ready”",
  "card.refused": "Refused",
  "card.restore": "↩ Restore",
  "card.lateBy": "⚠ {n} min late (due {time})",
  "card.readyAround": "Ready around",
  "card.justNow": "just now",
  "card.minAgo": "{n} min ago",

  "history.title": "History",
  "history.liveScreen": "← Live screen",
  "history.from": "From",
  "history.to": "To",
  "history.filter": "Filter",
  "history.exportCsv": "⬇ Export CSV",
  "history.ordersCount": "Orders",
  "history.refusedOf": "Of which refused",
  "history.revenue": "Revenue",
  "history.none": "No orders in this period.",
  "history.colDate": "Date",
  "history.colMode": "Method",
  "history.colClient": "Customer",
  "history.colStatus": "Status",
  "history.colTotal": "Total",
  "history.colItems": "Items",

  "csv.number": "Number",
  "csv.date": "Date",
  "csv.mode": "Method",
  "csv.firstName": "FirstName",
  "csv.phone": "Phone",
  "csv.status": "Status",
  "csv.totalEur": "Total_EUR",
  "csv.items": "Items",

  "lang.label": "Language",

  "err.invalidRequest": "Invalid request.",
  "err.closed": "The restaurant is currently closed.",
  "err.invalidMode": "Invalid order method.",
  "err.nameRequired": "First name is required.",
  "err.invalidPhone":
    "Invalid Belgian mobile number (expected: 04XX XX XX XX).",
  "err.emptyCart": "The cart is empty.",
  "err.tooMany": "Too many orders in a short time. Try again later.",
  "err.invalidCart": "Invalid cart.",
  "err.tooManyAttempts": "Too many attempts. Try again in a few minutes.",
  "err.staffNotConfigured": "Staff access not configured (STAFF_PASSWORD missing).",
  "err.wrongPassword": "Incorrect password.",
};

export const MESSAGES: Record<Locale, Dict> = { fr, nl, en };

/** Remplace les marqueurs {clé} par les valeurs fournies. */
export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}

/** Fonction de traduction pure (sans React) : translate(locale, key, params?). */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const dict = MESSAGES[locale] ?? MESSAGES.fr;
  return interpolate(dict[key] ?? MESSAGES.fr[key] ?? key, params);
}
