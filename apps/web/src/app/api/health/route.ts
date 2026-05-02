import { NextResponse } from "next/server";
import { getDataSourceMode } from "@/lib/data-source";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Lightweight liveness probe used by Vercel/uptime monitors.
// Intentionally returns no information that could aid an attacker
// (no env values, no internal hostnames, no tokens).
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "stockops-web",
      mode: getDataSourceMode(),
      time: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
