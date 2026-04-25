import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function configureOpenApi(app: INestApplication) {
  if (process.env.API_DOCS_ENABLED === "false") {
    return;
  }

  const docsPath = process.env.API_DOCS_PATH ?? "docs";
  const config = new DocumentBuilder()
    .setTitle("StockOps API")
    .setDescription(
      "Public API contract for products, stock movements, orders, suppliers, and webhook ingestion.",
    )
    .setVersion(process.env.npm_package_version ?? "0.1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API token",
        description: "Use Authorization: Bearer <api-token>.",
      },
      "ApiKeyAuth",
    )
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey, methodKey) =>
        `${controllerKey.replace(/Controller$/, "")}_${methodKey}`,
    });

  SwaggerModule.setup(docsPath, app, documentFactory, {
    customSiteTitle: "StockOps API Docs",
    jsonDocumentUrl: `${docsPath}/openapi.json`,
    swaggerOptions: {
      persistAuthorization: true,
    },
    yamlDocumentUrl: `${docsPath}/openapi.yaml`,
  });
}
