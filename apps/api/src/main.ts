import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === "test"
        ? false
        : ["log", "error", "warn", "debug", "verbose"],
  });

  app.setGlobalPrefix("v1");
  app.enableCors({
    origin: process.env.API_CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
