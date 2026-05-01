import "reflect-metadata";

import crypto from "node:crypto";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { createLogger } from "@stockops/core/logger";

import { AppModule } from "./app.module";
import { SentryExceptionFilter } from "./filters/sentry-exception.filter";
import { metricsMiddleware } from "./metrics/metrics.middleware";
import { configureOpenApi } from "./openapi/setup";
import { initSentry } from "./sentry";
import { validateApiEnvironment } from "./config/env";

initSentry();

const logger = createLogger({ service: "stockops-api" });

async function bootstrap() {
  validateApiEnvironment();

  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === "test"
        ? false
        : ["log", "error", "warn", "debug", "verbose"],
    rawBody: true,
  });

  app.use(helmet({
    crossOriginEmbedderPolicy: false,
  }));
  app.use(metricsMiddleware);
  app.setGlobalPrefix("v1");
  const corsOrigins = process.env.API_CORS_ORIGIN
    ? process.env.API_CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : process.env.NODE_ENV === "production"
      ? false
      : true;

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Request context: attach requestId to every request
  app.use((req: any, _res: any, next: any) => {
    req.requestId = crypto.randomUUID();
    req.log = logger.child({
      requestId: req.requestId,
      method: req.method,
      url: req.url,
    });
    next();
  });

  app.use((req: any, res: any, next: any) => {
    if (req.requestId) {
      res.setHeader("X-Request-Id", req.requestId);
    }
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.useGlobalFilters(new SentryExceptionFilter());
  configureOpenApi(app);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  logger.info({ port }, "StockOps API started");
}

void bootstrap();
