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

initSentry();

const logger = createLogger({ service: "stockops-api" });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === "test"
        ? false
        : ["log", "error", "warn", "debug", "verbose"],
    rawBody: true,
  });

  app.use(helmet());
  app.use(metricsMiddleware);
  app.setGlobalPrefix("v1");
  app.enableCors({
    origin: process.env.API_CORS_ORIGIN?.split(",") ?? true,
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

  app.useGlobalFilters(new SentryExceptionFilter());
  configureOpenApi(app);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  logger.info({ port }, "StockOps API started");
}

void bootstrap();
