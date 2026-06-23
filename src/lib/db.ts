// Client Prisma en singleton.
// En dev, Next.js recharge les modules à chaud : sans ce singleton on créerait
// une nouvelle connexion à chaque rechargement (et on saturerait la base).

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
