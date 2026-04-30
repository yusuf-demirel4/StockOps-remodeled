import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL ??
      "postgresql://stockops:stockops@localhost:5432/stockops_shadow?schema=public",
    url:
      process.env.DATABASE_URL ??
      "postgresql://stockops:stockops@localhost:5432/stockops?schema=public",
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
