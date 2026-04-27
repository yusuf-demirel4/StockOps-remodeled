import { Controller, Get } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { HealthService } from "./health.service";

const healthService = new HealthService();

type ServiceStatusEntry = {
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs?: number;
};

@ApiExcludeController()
@Controller("status")
export class StatusController {
  @Get()
  async getStatus() {
    const detailed = await healthService.checkDetailed();

    const services: ServiceStatusEntry[] = [
      {
        name: "API",
        status: detailed.status === "ok" ? "operational" : detailed.status === "degraded" ? "degraded" : "down",
      },
      {
        name: "Database",
        status: detailed.checks.database.status === "up" ? "operational" : "down",
        latencyMs: detailed.checks.database.latencyMs,
      },
      {
        name: "Queue (Redis)",
        status: detailed.checks.redis.status === "up" ? "operational" : "down",
      },
    ];

    const allOperational = services.every((s) => s.status === "operational");
    const anyDown = services.some((s) => s.status === "down");

    return {
      overall: anyDown ? "partial_outage" : allOperational ? "operational" : "degraded",
      services,
      updatedAt: new Date().toISOString(),
      incidents: [], // Placeholder — can be populated from a DB table
    };
  }
}
