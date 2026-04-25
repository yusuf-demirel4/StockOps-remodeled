import { Module } from "@nestjs/common";

import { HealthController } from "./health/health.controller";
import { InventoryController } from "./inventory/inventory.controller";
import { InventoryReadService } from "./inventory/inventory-read.service";
import { WebhookInboxService } from "./webhooks/webhook-inbox.service";
import { WebhooksController } from "./webhooks/webhooks.controller";

@Module({
  controllers: [HealthController, InventoryController, WebhooksController],
  providers: [InventoryReadService, WebhookInboxService],
})
export class AppModule {}
