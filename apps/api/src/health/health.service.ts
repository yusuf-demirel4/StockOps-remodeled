import { getDbClient } from "@stockops/db";
import { resolveQueueConfig } from "@stockops/queue/config";

type ServiceStatus = "up" | "down";

type DetailedHealth = {
  service: string;
  status: "ok" | "degraded" | "down";
  version: string;
  uptime: number;
  checks: {
    database: { status: ServiceStatus; latencyMs?: number; error?: string };
    redis: { status: ServiceStatus; driver: string; error?: string };
  };
};

export class HealthService {
  async checkReady(): Promise<{ ready: boolean; database: ServiceStatus; redis: ServiceStatus }> {
    const db = await this.checkDatabase();
    const redis = await this.checkRedis();
    return {
      ready: db.status === "up" && redis.status === "up",
      database: db.status,
      redis: redis.status,
    };
  }

  async checkDetailed(): Promise<DetailedHealth> {
    const db = await this.checkDatabase();
    const redis = await this.checkRedis();

    const allUp = db.status === "up" && redis.status === "up";
    const allDown = db.status === "down" && redis.status === "down";

    return {
      service: "stockops-api",
      status: allDown ? "down" : allUp ? "ok" : "degraded",
      version: process.env.npm_package_version ?? "0.1.0",
      uptime: process.uptime(),
      checks: { database: db, redis },
    };
  }

  private async checkDatabase(): Promise<{ status: ServiceStatus; latencyMs?: number; error?: string }> {
    try {
      const start = performance.now();
      const db = getDbClient();
      await db.$queryRaw`SELECT 1`;
      return { status: "up", latencyMs: Math.round(performance.now() - start) };
    } catch (err) {
      return { status: "down", error: (err as Error).message };
    }
  }

  private async checkRedis(): Promise<{ status: ServiceStatus; driver: string; error?: string }> {
    const config = resolveQueueConfig();
    if (config.driver === "memory") {
      return { status: "up", driver: "memory" };
    }

    try {
      const { Redis } = await import("ioredis");
      const redis = new Redis(config.redisUrl ?? "redis://127.0.0.1:6379", {
        connectTimeout: 3000,
        lazyConnect: true,
      });
      await redis.ping();
      await redis.quit();
      return { status: "up", driver: "bullmq" };
    } catch (err) {
      return { status: "down", driver: "bullmq", error: (err as Error).message };
    }
  }
}
