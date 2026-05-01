-- Phase 11: Integration reliability, replay, and dead-letter operations.

ALTER TYPE "WebhookEventStatus" ADD VALUE 'DEAD_LETTER';

ALTER TYPE "SyncStatus" ADD VALUE 'QUEUED';
ALTER TYPE "SyncStatus" ADD VALUE 'RUNNING';
ALTER TYPE "SyncStatus" ADD VALUE 'DEAD_LETTER';

ALTER TABLE "WebhookEvent" ADD COLUMN "nextAttemptAt" TIMESTAMP(3);

ALTER TABLE "AccountingSyncLog"
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "finishedAt" TIMESTAMP(3),
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "replayOfId" TEXT;

CREATE TABLE "IntegrationSyncLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "source" "WebhookSource" NOT NULL,
  "direction" "SyncDirection" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "externalId" TEXT,
  "status" "SyncStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "error" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3),
  "replayOfId" TEXT,

  CONSTRAINT "IntegrationSyncLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntegrationSyncLog_organizationId_source_status_queuedAt_idx"
  ON "IntegrationSyncLog"("organizationId", "source", "status", "queuedAt");

CREATE INDEX "IntegrationSyncLog_entityType_entityId_idx"
  ON "IntegrationSyncLog"("entityType", "entityId");

ALTER TABLE "IntegrationSyncLog"
  ADD CONSTRAINT "IntegrationSyncLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationSyncLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntegrationSyncLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_integration_sync_log ON "IntegrationSyncLog"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
