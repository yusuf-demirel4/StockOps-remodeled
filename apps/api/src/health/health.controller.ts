import { Controller, Get, HttpCode, HttpStatus, Res, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { ApiAuthGuard } from "../auth/api-auth.guard";
import { healthResponseSchema } from "../openapi/schemas";
import { HealthService } from "./health.service";

const healthService = new HealthService();

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Basic alive check." })
  @ApiOkResponse({ schema: healthResponseSchema })
  check() {
    return {
      service: "stockops-api",
      status: "ok",
      version: process.env.npm_package_version ?? "0.1.0",
    };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness probe — DB and Redis connected." })
  @HttpCode(HttpStatus.OK)
  async ready(@Res() res: Response) {
    const result = await healthService.checkReady();
    const status = result.ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(status).json(result);
  }

  @Get("detailed")
  @ApiOperation({ summary: "Detailed per-service health (auth required)." })
  @UseGuards(ApiAuthGuard)
  async detailed() {
    return healthService.checkDetailed();
  }
}
