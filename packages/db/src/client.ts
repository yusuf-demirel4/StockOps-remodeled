import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as typeof globalThis & {
  stockOpsPrisma?: PrismaClient;
};

export function getPrisma() {
  if (globalForPrisma.stockOpsPrisma) {
    return globalForPrisma.stockOpsPrisma;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required when APP_DATA_SOURCE=database.");
  }

  const adapter = new PrismaPg({ connectionString });
  globalForPrisma.stockOpsPrisma = new PrismaClient({ adapter });

  return globalForPrisma.stockOpsPrisma;
}
