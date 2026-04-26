import "reflect-metadata";

import helmet from "helmet";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { configureOpenApi } from "./openapi/setup";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === "test"
        ? false
        : ["log", "error", "warn", "debug", "verbose"],
    rawBody: true,
  });

  app.use(helmet());
  app.setGlobalPrefix("v1");
  app.enableCors({
    origin: process.env.API_CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  });
  configureOpenApi(app);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
