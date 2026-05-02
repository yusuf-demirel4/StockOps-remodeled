-- Disable FORCE ROW LEVEL SECURITY on tenant tables.
--
-- Background: Phase 7 hardening enabled FORCE RLS, which requires *every*
-- connection (including the pooler superuser the app uses) to satisfy the
-- WITH CHECK clause. The clause compares "organizationId" against
-- current_setting('app.current_organization_id', true). The Prisma client
-- never runs `SET app.current_organization_id` — so on Transaction-pooler
-- connections (where SET wouldn't persist anyway), every INSERT is denied
-- with no error, and the row is silently dropped.
--
-- The application enforces tenant isolation at the query level (every
-- repository function filters by organizationId), and Vercel-side auth
-- guarantees the request is associated with a single organization. Until a
-- proper per-request `SET LOCAL` interceptor is added to Prisma, RLS is
-- best left non-FORCE so the app can function. Policies remain in place
-- so a future non-superuser role can still get isolation by setting the
-- variable.

ALTER TABLE "ApiToken" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Session" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Warehouse" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Product" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "SalesOrder" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "SalesOrderLine" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderLine" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "InventoryLayer" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "COGSEntry" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "NotificationDelivery" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "SalesReturn" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "SalesReturnLine" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Customer" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLine" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Payment" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "AccountingConnection" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "AccountingSyncLog" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Shipment" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "PickList" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "PickListItem" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "BillOfMaterial" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "BomComponent" NO FORCE ROW LEVEL SECURITY;
