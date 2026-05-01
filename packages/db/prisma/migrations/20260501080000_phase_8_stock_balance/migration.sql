-- Phase 8: Stock Balance, Reservations & Reconciliation

-- StockBalance: transactional read model for current stock levels
CREATE TABLE "StockBalance" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId"      TEXT NOT NULL,
    "warehouseId"    TEXT NOT NULL,
    "onHand"         INTEGER NOT NULL DEFAULT 0,
    "reserved"       INTEGER NOT NULL DEFAULT 0,
    "available"      INTEGER NOT NULL DEFAULT 0,
    "version"        INTEGER NOT NULL DEFAULT 0,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockBalance_organizationId_productId_warehouseId_key"
    ON "StockBalance"("organizationId", "productId", "warehouseId");

CREATE INDEX "StockBalance_organizationId_idx"
    ON "StockBalance"("organizationId");

ALTER TABLE "StockBalance"
    ADD CONSTRAINT "StockBalance_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockBalance"
    ADD CONSTRAINT "StockBalance_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockBalance"
    ADD CONSTRAINT "StockBalance_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- StockReservation: holds stock for confirmed sales orders
CREATE TABLE "StockReservation" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "salesOrderId"   TEXT NOT NULL,
    "productId"      TEXT NOT NULL,
    "warehouseId"    TEXT NOT NULL,
    "quantity"       INTEGER NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockReservation_organizationId_salesOrderId_idx"
    ON "StockReservation"("organizationId", "salesOrderId");

CREATE INDEX "StockReservation_organizationId_productId_warehouseId_idx"
    ON "StockReservation"("organizationId", "productId", "warehouseId");

ALTER TABLE "StockReservation"
    ADD CONSTRAINT "StockReservation_salesOrderId_fkey"
    FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockReservation"
    ADD CONSTRAINT "StockReservation_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockReservation"
    ADD CONSTRAINT "StockReservation_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- StockReconciliation: audit trail for reconciliation runs
CREATE TABLE "StockReconciliation" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'COMPLETED',
    "totalChecked"   INTEGER NOT NULL DEFAULT 0,
    "mismatchCount"  INTEGER NOT NULL DEFAULT 0,
    "autoFixed"      INTEGER NOT NULL DEFAULT 0,
    "details"        JSONB NOT NULL DEFAULT '[]',
    "createdById"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockReconciliation_organizationId_createdAt_idx"
    ON "StockReconciliation"("organizationId", "createdAt");

ALTER TABLE "StockReconciliation"
    ADD CONSTRAINT "StockReconciliation_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockReconciliation"
    ADD CONSTRAINT "StockReconciliation_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill StockBalance from existing stock movements
INSERT INTO "StockBalance" ("id", "organizationId", "productId", "warehouseId", "onHand", "reserved", "available", "version", "updatedAt")
SELECT
    gen_random_uuid(),
    "organizationId",
    "productId",
    "warehouseId",
    SUM("quantityChange"),
    0,
    SUM("quantityChange"),
    0,
    NOW()
FROM "StockMovement"
GROUP BY "organizationId", "productId", "warehouseId";

-- Enable RLS on new tables
ALTER TABLE "StockBalance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockReservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockReconciliation" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'stockops_app') THEN
    CREATE POLICY "stockbalance_org_isolation" ON "StockBalance"
      USING ("organizationId" = current_setting('app.organization_id', true));
    CREATE POLICY "stockreservation_org_isolation" ON "StockReservation"
      USING ("organizationId" = current_setting('app.organization_id', true));
    CREATE POLICY "stockreconciliation_org_isolation" ON "StockReconciliation"
      USING ("organizationId" = current_setting('app.organization_id', true));
  END IF;
END $$;
