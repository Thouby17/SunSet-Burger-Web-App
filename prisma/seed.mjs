// Jeu de données de DÉMO pour le tournage de la vidéo.
//
// Lancer :  npm run db:seed
// Le script VIDE d'abord toutes les commandes, puis insère un ensemble réaliste
// (en attente / acceptées / prêtes / refusée) avec des heures d'arrivée variées,
// pour que les écrans Staff et Historique soient vivants à l'écran.
//
// Relançable autant de fois que tu veux (reset propre entre deux prises).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Construit une ligne de commande au format stocké (comme le fait le serveur).
function line(menuItemId, name, qty, basePrice, extras = [], note = "") {
  const unitPrice = basePrice + extras.reduce((s, e) => s + e.price, 0);
  return {
    menuItemId,
    name,
    qty,
    note,
    options: extras, // suppléments + choix réunis (libellés composés)
    unitPrice,
    lineTotal: unitPrice * qty,
  };
}

// Raccourcis pour des "extras" lisibles.
const choix = (label) => ({ id: `demo:${label}`, label, price: 0 });
const supp = (label, price) => ({ id: `demo:${label}`, label, price });

// minutesAgo -> Date
const ago = (min) => new Date(Date.now() - min * 60 * 1000);

const orders = [
  // --- À TRAITER : en attente ---
  {
    mode: "takeaway",
    customerName: "Lucas",
    phone: "+32467110022",
    status: "pending",
    createdAt: ago(2),
    items: [
      line("tacos-au-choix", "Tacos au choix", 1, 9.0, [
        choix("Viande : Poulet pané"),
        choix("Sauce : Andalouse"),
      ]),
      line("coca-cola", "Coca-Cola", 1, 2.0),
    ],
  },
  {
    mode: "dine_in",
    customerName: "Sarah",
    phone: "+32468220033",
    status: "pending",
    createdAt: ago(5),
    items: [
      line(
        "brooklyn-supreme-burger",
        "Brooklyn suprême burger",
        1,
        11.99,
        [choix("Accompagnement : Frites"), choix("Sauce : Samouraï"), supp("Suppléments : Bacon", 1.3)],
        "Sans oignons",
      ),
    ],
  },
  {
    mode: "takeaway",
    customerName: "Mehdi",
    phone: "+32470330044",
    status: "pending",
    createdAt: ago(9),
    items: [
      line("burrito-poulet-pane", "Burrito poulet pané", 1, 10.5, [
        choix("Accompagnement : Potatoes"),
        choix("Sauce : Algérienne"),
        supp("Suppléments : Fromage cheddar", 1.5),
        supp("Suppléments : Galette", 1.5),
      ]),
    ],
  },

  // --- À TRAITER : acceptées ---
  {
    mode: "takeaway",
    customerName: "Emma",
    phone: "+32471440055",
    status: "accepted",
    waitTime: 15,
    createdAt: ago(13),
    items: [
      line("hotdog-newyorkais", "Hot dog new-yorkais", 2, 8.5, [
        choix("Accompagnement : Frites"),
      ]),
    ],
  },
  {
    mode: "dine_in",
    customerName: "Karim",
    phone: "+32472550066",
    status: "accepted",
    waitTime: 25,
    createdAt: ago(18),
    items: [
      line("assiette-mixte", "Assiette Mixte", 1, 16.0, [
        choix("Accompagnement : Frites"),
        supp("Supplément : Fromage raclette", 1.5),
      ]),
    ],
  },

  // --- TRAITÉES : prêtes ---
  {
    mode: "takeaway",
    customerName: "Julie",
    phone: "+32473660077",
    status: "ready",
    waitTime: 20,
    createdAt: ago(34),
    items: [
      line("chicken-anglais", "L'Anglais", 1, 13.0, [
        choix("Accompagnement : Potatoes"),
        choix("Sauce : Ketchup"),
      ]),
    ],
  },
  {
    mode: "dine_in",
    customerName: "Tom",
    phone: "+32474770088",
    status: "ready",
    waitTime: 15,
    createdAt: ago(52),
    items: [
      line("salade-cesar", "Salade César", 1, 10.0),
      line("moelleux-chocolat", "Moelleux chocolat", 1, 4.9),
    ],
  },

  // --- TRAITÉES : refusée (pour l'historique) ---
  {
    mode: "takeaway",
    customerName: "Nadia",
    phone: "+32475880099",
    status: "refused",
    staffMessage: "Rupture de calamars ce soir, désolé !",
    createdAt: ago(67),
    items: [line("assiette-calamar", "Assiette Calamar", 1, 14.5, [choix("Accompagnement : Potatoes")])],
  },
];

async function main() {
  await prisma.order.deleteMany();
  for (const o of orders) {
    const total = o.items.reduce((s, l) => s + l.lineTotal, 0);
    await prisma.order.create({
      data: {
        mode: o.mode,
        customerName: o.customerName,
        phone: o.phone,
        items: JSON.stringify(o.items),
        total,
        status: o.status,
        waitTime: o.waitTime ?? null,
        staffMessage: o.staffMessage ?? null,
        createdAt: o.createdAt,
      },
    });
  }
  console.log(`✅ ${orders.length} commandes de démo insérées (base réinitialisée).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
