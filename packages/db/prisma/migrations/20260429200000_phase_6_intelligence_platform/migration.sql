-- Phase 6.3: organization locale/currency and exchange-rate cache.
ALTER TABLE "Organization"
  ADD COLUMN "defaultCurrency" TEXT NOT NULL DEFAULT 'TRY',
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'tr';

CREATE TYPE "ExchangeRateProvider" AS ENUM ('ECB', 'TCMB', 'MANUAL');

CREATE TABLE "ExchangeRate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "baseCurrency" TEXT NOT NULL,
  "quoteCurrency" TEXT NOT NULL,
  "rate" DECIMAL(18,8) NOT NULL,
  "provider" "ExchangeRateProvider" NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExchangeRate_organizationId_provider_baseCurrency_quoteCurr_key"
  ON "ExchangeRate"("organizationId", "provider", "baseCurrency", "quoteCurrency", "observedAt");
CREATE INDEX "ExchangeRate_organizationId_baseCurrency_quoteCurrency_obse_idx"
  ON "ExchangeRate"("organizationId", "baseCurrency", "quoteCurrency", "observedAt");

ALTER TABLE "ExchangeRate"
  ADD CONSTRAINT "ExchangeRate_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Phase 6.4: public extension API foundations.
CREATE TYPE "ExtensionWebhookStatus" AS ENUM ('ACTIVE', 'PAUSED');

CREATE TABLE "ExtensionWebhookSubscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "events" JSONB NOT NULL,
  "secret" TEXT,
  "status" "ExtensionWebhookStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExtensionWebhookSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExtensionWebhookSubscription_organizationId_status_idx"
  ON "ExtensionWebhookSubscription"("organizationId", "status");

ALTER TABLE "ExtensionWebhookSubscription"
  ADD CONSTRAINT "ExtensionWebhookSubscription_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CustomField" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomField_organizationId_entityType_entityId_key_key"
  ON "CustomField"("organizationId", "entityType", "entityId", "key");
CREATE INDEX "CustomField_organizationId_entityType_entityId_idx"
  ON "CustomField"("organizationId", "entityType", "entityId");

ALTER TABLE "CustomField"
  ADD CONSTRAINT "CustomField_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STOCKTAKE';
