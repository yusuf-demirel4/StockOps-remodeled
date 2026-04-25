import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { healthResponseSchema } from "../openapi/schemas";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Check API service health." })
  @ApiOkResponse({ schema: healthResponseSchema })
  check() {
    return {
      service: "stockops-api",
      status: "ok",
      version: process.env.npm_package_version ?? "0.1.0",
    };
  }
}
