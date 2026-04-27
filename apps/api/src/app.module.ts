import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

import { ApiAuthGuard } from "./auth/api-auth.guard";
import { ApiAuthService } from "./auth/api-auth.service";
import { AuthController } from "./auth/auth.controller";
import { PermissionsGuard } from "./auth/permissions.guard";
import { StockOpsApiService } from "./domain/stockops-api.service";
import { CustomersController } from "./customers/customers.controller";
import { ExportsController } from "./exports/exports.controller";
import { HealthController } from "./health/health.controller";
import { InventoryController } from "./inventory/inventory.controller";
import { InvoicesController } from "./invoices/invoices.controller";
import { PurchaseOrdersController } from "./orders/purchase-orders.controller";
import { SalesOrdersController } from "./orders/sales-orders.controller";
import { SalesReturnsController } from "./orders/sales-returns.controller";
import { ProductsController } from "./products/products.controller";
import { VariantsController } from "./products/variants.controller";
import { EventsGateway } from "./realtime/events.gateway";
import { StockController } from "./stock/stock.controller";
import { SuppliersController } from "./suppliers/suppliers.controller";
import { WebhookInboxService } from "./webhooks/webhook-inbox.service";
import { WebhookSecretGuard } from "./webhooks/webhook-secret.guard";
import { WebhooksController } from "./webhooks/webhooks.controller";

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
  ],
  controllers: [
    AuthController,
    CustomersController,
    ExportsController,
    HealthController,
    InventoryController,
    InvoicesController,
    ProductsController,
    PurchaseOrdersController,
    SalesOrdersController,
    SalesReturnsController,
    StockController,
    SuppliersController,
    VariantsController,
    WebhooksController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    ApiAuthGuard,
    ApiAuthService,
    EventsGateway,
    PermissionsGuard,
    StockOpsApiService,
    WebhookInboxService,
    WebhookSecretGuard,
  ],
})
export class AppModule {}
