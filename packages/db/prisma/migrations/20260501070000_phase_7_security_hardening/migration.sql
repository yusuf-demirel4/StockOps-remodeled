-- Phase 7: production security and tenant isolation hardening.

CREATE TABLE "IdempotencyKey" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "responseBody" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdempotencyKey_organizationId_key_key" ON "IdempotencyKey"("organizationId", "key");
CREATE INDEX "IdempotencyKey_organizationId_expiresAt_idx" ON "IdempotencyKey"("organizationId", "expiresAt");
CREATE INDEX "IdempotencyKey_userId_idx" ON "IdempotencyKey"("userId");

ALTER TABLE "IdempotencyKey"
  ADD CONSTRAINT "IdempotencyKey_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IdempotencyKey"
  ADD CONSTRAINT "IdempotencyKey_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApiToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Warehouse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesOrderLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryLayer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "COGSEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesReturn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesReturnLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountingConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountingSyncLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PickList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PickListItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BillOfMaterial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BomComponent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ManufacturingOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerPriceTier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationBranding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduledReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExtensionWebhookSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomField" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExchangeRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyKey" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "ApiToken" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Session" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Warehouse" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SalesOrder" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SalesOrderLine" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderLine" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "InventoryLayer" FORCE ROW LEVEL SECURITY;
ALTER TABLE "COGSEntry" FORCE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "NotificationDelivery" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SalesReturn" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SalesReturnLine" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLine" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AccountingConnection" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AccountingSyncLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Shipment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PickList" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PickListItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "BillOfMaterial" FORCE ROW LEVEL SECURITY;
ALTER TABLE "BomComponent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ManufacturingOrder" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CustomerPriceTier" FORCE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationBranding" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SavedReport" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ScheduledReport" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ExtensionWebhookSubscription" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CustomField" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ExchangeRate" FORCE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyKey" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_api_token ON "ApiToken";
DROP POLICY IF EXISTS tenant_isolation_session ON "Session";
DROP POLICY IF EXISTS tenant_isolation_product ON "Product";
DROP POLICY IF EXISTS tenant_isolation_warehouse ON "Warehouse";
DROP POLICY IF EXISTS tenant_isolation_supplier ON "Supplier";
DROP POLICY IF EXISTS tenant_isolation_stock_movement ON "StockMovement";
DROP POLICY IF EXISTS tenant_isolation_sales_order ON "SalesOrder";
DROP POLICY IF EXISTS tenant_isolation_purchase_order ON "PurchaseOrder";
DROP POLICY IF EXISTS tenant_isolation_customer ON "Customer";
DROP POLICY IF EXISTS tenant_isolation_invoice ON "Invoice";
DROP POLICY IF EXISTS tenant_isolation_payment ON "Payment";
DROP POLICY IF EXISTS tenant_isolation_audit_log ON "AuditLog";
DROP POLICY IF EXISTS tenant_isolation_inventory_layer ON "InventoryLayer";
DROP POLICY IF EXISTS tenant_isolation_cogs_entry ON "COGSEntry";
DROP POLICY IF EXISTS tenant_isolation_webhook_event ON "WebhookEvent";
DROP POLICY IF EXISTS tenant_isolation_notification_delivery ON "NotificationDelivery";
DROP POLICY IF EXISTS tenant_isolation_sales_return ON "SalesReturn";
DROP POLICY IF EXISTS tenant_isolation_accounting_connection ON "AccountingConnection";
DROP POLICY IF EXISTS tenant_isolation_shipment ON "Shipment";
DROP POLICY IF EXISTS tenant_isolation_pick_list ON "PickList";
DROP POLICY IF EXISTS tenant_isolation_bill_of_material ON "BillOfMaterial";
DROP POLICY IF EXISTS tenant_isolation_manufacturing_order ON "ManufacturingOrder";
DROP POLICY IF EXISTS tenant_isolation_customer_price_tier ON "CustomerPriceTier";
DROP POLICY IF EXISTS tenant_isolation_organization_branding ON "OrganizationBranding";
DROP POLICY IF EXISTS tenant_isolation_saved_report ON "SavedReport";
DROP POLICY IF EXISTS tenant_isolation_scheduled_report ON "ScheduledReport";
DROP POLICY IF EXISTS tenant_isolation_exchange_rate ON "ExchangeRate";
DROP POLICY IF EXISTS tenant_isolation_extension_webhook_subscription ON "ExtensionWebhookSubscription";
DROP POLICY IF EXISTS tenant_isolation_custom_field ON "CustomField";
DROP POLICY IF EXISTS tenant_isolation_idempotency_key ON "IdempotencyKey";

CREATE POLICY tenant_isolation_api_token ON "ApiToken"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_session ON "Session"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_product ON "Product"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_warehouse ON "Warehouse"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_supplier ON "Supplier"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_stock_movement ON "StockMovement"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_sales_order ON "SalesOrder"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_purchase_order ON "PurchaseOrder"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_customer ON "Customer"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_invoice ON "Invoice"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_payment ON "Payment"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_audit_log ON "AuditLog"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_inventory_layer ON "InventoryLayer"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_cogs_entry ON "COGSEntry"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_webhook_event ON "WebhookEvent"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_notification_delivery ON "NotificationDelivery"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_sales_return ON "SalesReturn"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_accounting_connection ON "AccountingConnection"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_shipment ON "Shipment"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_pick_list ON "PickList"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_bill_of_material ON "BillOfMaterial"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_manufacturing_order ON "ManufacturingOrder"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_customer_price_tier ON "CustomerPriceTier"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_organization_branding ON "OrganizationBranding"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_saved_report ON "SavedReport"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_scheduled_report ON "ScheduledReport"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_exchange_rate ON "ExchangeRate"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_extension_webhook_subscription ON "ExtensionWebhookSubscription"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_custom_field ON "CustomField"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_idempotency_key ON "IdempotencyKey"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

DROP POLICY IF EXISTS tenant_isolation_sales_order_line ON "SalesOrderLine";
DROP POLICY IF EXISTS tenant_isolation_purchase_order_line ON "PurchaseOrderLine";
DROP POLICY IF EXISTS tenant_isolation_invoice_line ON "InvoiceLine";
DROP POLICY IF EXISTS tenant_isolation_sales_return_line ON "SalesReturnLine";
DROP POLICY IF EXISTS tenant_isolation_accounting_sync_log ON "AccountingSyncLog";
DROP POLICY IF EXISTS tenant_isolation_pick_list_item ON "PickListItem";
DROP POLICY IF EXISTS tenant_isolation_bom_component ON "BomComponent";

CREATE POLICY tenant_isolation_sales_order_line ON "SalesOrderLine"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "SalesOrder"
    WHERE "SalesOrder"."id" = "SalesOrderLine"."salesOrderId"
      AND "SalesOrder"."organizationId" = current_setting('app.current_organization_id', true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "SalesOrder"
    WHERE "SalesOrder"."id" = "SalesOrderLine"."salesOrderId"
      AND "SalesOrder"."organizationId" = current_setting('app.current_organization_id', true)
  ));

CREATE POLICY tenant_isolation_purchase_order_line ON "PurchaseOrderLine"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "PurchaseOrder"
    WHERE "PurchaseOrder"."id" = "PurchaseOrderLine"."purchaseOrderId"
      AND "PurchaseOrder"."organizationId" = current_setting('app.current_organization_id', true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "PurchaseOrder"
    WHERE "PurchaseOrder"."id" = "PurchaseOrderLine"."purchaseOrderId"
      AND "PurchaseOrder"."organizationId" = current_setting('app.current_organization_id', true)
  ));

CREATE POLICY tenant_isolation_invoice_line ON "InvoiceLine"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "Invoice"
    WHERE "Invoice"."id" = "InvoiceLine"."invoiceId"
      AND "Invoice"."organizationId" = current_setting('app.current_organization_id', true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "Invoice"
    WHERE "Invoice"."id" = "InvoiceLine"."invoiceId"
      AND "Invoice"."organizationId" = current_setting('app.current_organization_id', true)
  ));

CREATE POLICY tenant_isolation_sales_return_line ON "SalesReturnLine"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "SalesReturn"
    WHERE "SalesReturn"."id" = "SalesReturnLine"."salesReturnId"
      AND "SalesReturn"."organizationId" = current_setting('app.current_organization_id', true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "SalesReturn"
    WHERE "SalesReturn"."id" = "SalesReturnLine"."salesReturnId"
      AND "SalesReturn"."organizationId" = current_setting('app.current_organization_id', true)
  ));

CREATE POLICY tenant_isolation_accounting_sync_log ON "AccountingSyncLog"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "AccountingConnection"
    WHERE "AccountingConnection"."id" = "AccountingSyncLog"."connectionId"
      AND "AccountingConnection"."organizationId" = current_setting('app.current_organization_id', true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "AccountingConnection"
    WHERE "AccountingConnection"."id" = "AccountingSyncLog"."connectionId"
      AND "AccountingConnection"."organizationId" = current_setting('app.current_organization_id', true)
  ));

CREATE POLICY tenant_isolation_pick_list_item ON "PickListItem"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "PickList"
    WHERE "PickList"."id" = "PickListItem"."pickListId"
      AND "PickList"."organizationId" = current_setting('app.current_organization_id', true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "PickList"
    WHERE "PickList"."id" = "PickListItem"."pickListId"
      AND "PickList"."organizationId" = current_setting('app.current_organization_id', true)
  ));

CREATE POLICY tenant_isolation_bom_component ON "BomComponent"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "BillOfMaterial"
    WHERE "BillOfMaterial"."id" = "BomComponent"."bomId"
      AND "BillOfMaterial"."organizationId" = current_setting('app.current_organization_id', true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "BillOfMaterial"
    WHERE "BillOfMaterial"."id" = "BomComponent"."bomId"
      AND "BillOfMaterial"."organizationId" = current_setting('app.current_organization_id', true)
  ));
