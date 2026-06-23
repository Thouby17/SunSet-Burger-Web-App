// Vide TOUTES les commandes de la base pointée par DATABASE_URL (.env).
//
// Usage :  npm run db:clear
// ⚠️ Supprime toutes les commandes (utile après une démo/tests, AVANT le vrai
// lancement). À NE PAS lancer une fois en exploitation réelle.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const { count } = await prisma.order.deleteMany();
  console.log(`🧹 ${count} commande(s) supprimée(s). Base de commandes vide.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
