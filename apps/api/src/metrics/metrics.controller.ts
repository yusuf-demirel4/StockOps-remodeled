import { Controller, Get, Header } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { metricsRegistry } from "./metrics.service";

@ApiExcludeController()
@Controller()
export class MetricsController {
  @Get("/metrics")
  @Header("Content-Type", "text/plain")
  async getMetrics() {
    return metricsRegistry.metrics();
  }
}
