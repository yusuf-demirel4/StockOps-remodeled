-- Phase 6 hardening: protect tenant-scoped tables introduced after the
-- original RLS migration.

ALTER TABLE "ExchangeRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExtensionWebhookSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomField" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_exchange_rate ON "ExchangeRate"
  FOR ALL
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_extension_webhook_subscription ON "ExtensionWebhookSubscription"
  FOR ALL
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

CREATE POLICY tenant_isolation_custom_field ON "CustomField"
  FOR ALL
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
