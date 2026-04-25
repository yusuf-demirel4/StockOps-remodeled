import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      service: "stockops-api",
      status: "ok",
      version: process.env.npm_package_version ?? "0.1.0",
    };
  }
}
