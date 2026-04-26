-- Row-Level Security (RLS) policies for multi-tenant isolation.
-- Even if a SQL injection occurs, data cannot cross tenant boundaries.
--
-- Usage: Before running queries, SET the session variable:
--   SET app.current_organization_id = '<orgId>';
--
-- The Prisma client should set this via $executeRawUnsafe at the
-- start of each request (middleware / interceptor).

-- Enable RLS on all tenant-scoped tables
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Warehouse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesOrderLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryLayer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "COGSEntry" ENABLE ROW LEVEL SECURITY;

-- Create policies for tables with organizationId
CREATE POLICY tenant_isolation_product ON "Product"
  USING ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_warehouse ON "Warehouse"
  USING ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_stock_movement ON "StockMovement"
  USING ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_sales_order ON "SalesOrder"
  USING ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_purchase_order ON "PurchaseOrder"
  USING ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_customer ON "Customer"
  USING ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_invoice ON "Invoice"
  USING ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_payment ON "Payment"
  USING ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_audit_log ON "AuditLog"
  USING ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_inventory_layer ON "InventoryLayer"
  USING ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_cogs_entry ON "COGSEntry"
  USING ("organizationId" = current_setting('app.current_organization_id', true));

-- SalesOrderLine and PurchaseOrderLine don't have organizationId directly,
-- so we use a subquery join through the parent order.
CREATE POLICY tenant_isolation_sales_order_line ON "SalesOrderLine"
  USING (EXISTS (
    SELECT 1 FROM "SalesOrder"
    WHERE "SalesOrder"."id" = "SalesOrderLine"."salesOrderId"
      AND "SalesOrder"."organizationId" = current_setting('app.current_organization_id', true)
  ));

CREATE POLICY tenant_isolation_purchase_order_line ON "PurchaseOrderLine"
  USING (EXISTS (
    SELECT 1 FROM "PurchaseOrder"
    WHERE "PurchaseOrder"."id" = "PurchaseOrderLine"."purchaseOrderId"
      AND "PurchaseOrder"."organizationId" = current_setting('app.current_organization_id', true)
  ));

CREATE POLICY tenant_isolation_invoice_line ON "InvoiceLine"
  USING (EXISTS (
    SELECT 1 FROM "Invoice"
    WHERE "Invoice"."id" = "InvoiceLine"."invoiceId"
      AND "Invoice"."organizationId" = current_setting('app.current_organization_id', true)
  ));

-- IMPORTANT: The superuser / migration user bypasses RLS by default.
-- The application should connect with a non-superuser role for RLS to take effect.
-- Or use: ALTER TABLE ... FORCE ROW LEVEL SECURITY; for superuser enforcement.
