import { NextResponse } from "next/server";
import { getDataSourceMode } from "@/lib/data-source";
import { getPrisma } from "@stockops/db/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const mode = getDataSourceMode();
  let dbStatus = "unknown";
  let lastMigration: string | null = null;
  
  if (mode === "database") {
    try {
      const prisma = getPrisma();
      
      // Check DB connectivity
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
      
      // Get last applied migration
      const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1
      `;
      if (migrations && migrations.length > 0) {
        lastMigration = migrations[0].migration_name;
      }
    } catch (error) {
      dbStatus = "error";
      console.error("Health check DB error:", error);
    }
  }

  return NextResponse.json(
    {
      status: dbStatus === "error" ? "error" : "ok",
      service: "stockops-web",
      mode,
      time: new Date().toISOString(),
      database: {
        status: dbStatus,
        lastMigration,
      },
      queue: {
        status: "ok", 
      }
    },
    {
      status: dbStatus === "error" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
