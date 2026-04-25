import { Module } from "@nestjs/common";

import { ApiAuthGuard } from "./auth/api-auth.guard";
import { ApiAuthService } from "./auth/api-auth.service";
import { AuthController } from "./auth/auth.controller";
import { PermissionsGuard } from "./auth/permissions.guard";
import { StockOpsApiService } from "./domain/stockops-api.service";
import { HealthController } from "./health/health.controller";
import { InventoryController } from "./inventory/inventory.controller";
import { PurchaseOrdersController } from "./orders/purchase-orders.controller";
import { SalesOrdersController } from "./orders/sales-orders.controller";
import { ProductsController } from "./products/products.controller";
import { StockController } from "./stock/stock.controller";
import { SuppliersController } from "./suppliers/suppliers.controller";
import { WebhookInboxService } from "./webhooks/webhook-inbox.service";
import { WebhookSecretGuard } from "./webhooks/webhook-secret.guard";
import { WebhooksController } from "./webhooks/webhooks.controller";

@Module({
  controllers: [
    AuthController,
    HealthController,
    InventoryController,
    ProductsController,
    PurchaseOrdersController,
    SalesOrdersController,
    StockController,
    SuppliersController,
    WebhooksController,
  ],
  providers: [
    ApiAuthGuard,
    ApiAuthService,
    PermissionsGuard,
    StockOpsApiService,
    WebhookInboxService,
    WebhookSecretGuard,
  ],
})
export class AppModule {}
