-- Phase 9/10 schema completion for WMS depth and commercial workflows.
-- This migration intentionally preserves legacy PickListItem.binLocation
-- values by creating matching WarehouseBin rows before dropping the column.

-- CreateEnum
CREATE TYPE "StocktakeStatus" AS ENUM ('DRAFT', 'COUNTING', 'REVIEW', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StocktakeItemStatus" AS ENUM ('PENDING', 'COUNTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'APPLIED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "SalesOrderStatus" ADD VALUE 'PARTIALLY_PICKED';
ALTER TYPE "SalesOrderStatus" ADD VALUE 'PICKED';
ALTER TYPE "SalesOrderStatus" ADD VALUE 'PARTIALLY_PACKED';
ALTER TYPE "SalesOrderStatus" ADD VALUE 'PARTIALLY_SHIPPED';

-- CreateTable
CREATE TABLE "WarehouseBin" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "WarehouseBin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WarehouseBin_warehouseId_idx" ON "WarehouseBin"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseBin_warehouseId_code_key" ON "WarehouseBin"("warehouseId", "code");

-- AddForeignKey
ALTER TABLE "WarehouseBin" ADD CONSTRAINT "WarehouseBin_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseBin" ADD CONSTRAINT "WarehouseBin_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "InventoryLayer" ADD COLUMN "binId" TEXT,
ADD COLUMN "expiryDate" TIMESTAMP(3),
ADD COLUMN "lotNumber" TEXT,
ADD COLUMN "serialNumber" TEXT;

-- AlterTable
ALTER TABLE "PickListItem" ADD COLUMN "binId" TEXT,
ADD COLUMN "expiryDate" TIMESTAMP(3),
ADD COLUMN "lotNumber" TEXT,
ADD COLUMN "serialNumber" TEXT;

-- Preserve legacy pick locations as tenant-owned warehouse bins.
INSERT INTO "WarehouseBin" ("id", "warehouseId", "code", "description", "isActive", "createdAt", "updatedAt", "organizationId")
SELECT
    gen_random_uuid(),
    pl."warehouseId",
    TRIM(pli."binLocation"),
    'Migrated from pick list binLocation',
    true,
    NOW(),
    NOW(),
    pl."organizationId"
FROM "PickListItem" pli
JOIN "PickList" pl ON pl."id" = pli."pickListId"
WHERE pli."binLocation" IS NOT NULL
  AND TRIM(pli."binLocation") <> ''
ON CONFLICT ("warehouseId", "code") DO NOTHING;

UPDATE "PickListItem" pli
SET "binId" = wb."id"
FROM "PickList" pl, "WarehouseBin" wb
WHERE pli."pickListId" = pl."id"
  AND wb."warehouseId" = pl."warehouseId"
  AND wb."code" = TRIM(pli."binLocation")
  AND pli."binLocation" IS NOT NULL
  AND TRIM(pli."binLocation") <> '';

-- AlterTable
ALTER TABLE "PickListItem" DROP COLUMN "binLocation";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "isBatchTracked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isSerialized" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SalesOrderLine" ADD COLUMN "packedQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pickedQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "shippedQty" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StockBalance" ADD COLUMN "binId" TEXT,
ADD COLUMN "expiryDate" TIMESTAMP(3),
ADD COLUMN "lotNumber" TEXT,
ADD COLUMN "serialNumber" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "binId" TEXT,
ADD COLUMN "expiryDate" TIMESTAMP(3),
ADD COLUMN "lotNumber" TEXT,
ADD COLUMN "serialNumber" TEXT;

-- CreateTable
CREATE TABLE "Stocktake" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "StocktakeStatus" NOT NULL DEFAULT 'DRAFT',
    "assignedToId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stocktake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StocktakeItem" (
    "id" TEXT NOT NULL,
    "stocktakeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "binId" TEXT,
    "expectedQty" INTEGER NOT NULL DEFAULT 0,
    "countedQty" INTEGER,
    "variance" INTEGER,
    "status" "StocktakeItemStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "StocktakeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesReturnId" TEXT,
    "code" TEXT NOT NULL,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "appliedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNoteLine" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "CreditNoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Stocktake_organizationId_status_idx" ON "Stocktake"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Stocktake_warehouseId_idx" ON "Stocktake"("warehouseId");

-- CreateIndex
CREATE INDEX "StocktakeItem_stocktakeId_idx" ON "StocktakeItem"("stocktakeId");

-- CreateIndex
CREATE INDEX "StocktakeItem_productId_idx" ON "StocktakeItem"("productId");

-- CreateIndex
CREATE INDEX "CreditNote_organizationId_status_idx" ON "CreditNote"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CreditNote_customerId_idx" ON "CreditNote"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_organizationId_code_key" ON "CreditNote"("organizationId", "code");

-- Replace the Phase 8 balance key with the full stock dimension key.
DROP INDEX "StockBalance_organizationId_productId_warehouseId_key";

CREATE UNIQUE INDEX "StockBalance_organizationId_productId_warehouseId_binId_lot_key"
    ON "StockBalance"("organizationId", "productId", "warehouseId", "binId", "lotNumber", "serialNumber")
    NULLS NOT DISTINCT;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_binId_fkey"
    FOREIGN KEY ("binId") REFERENCES "WarehouseBin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLayer" ADD CONSTRAINT "InventoryLayer_binId_fkey"
    FOREIGN KEY ("binId") REFERENCES "WarehouseBin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickListItem" ADD CONSTRAINT "PickListItem_binId_fkey"
    FOREIGN KEY ("binId") REFERENCES "WarehouseBin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_binId_fkey"
    FOREIGN KEY ("binId") REFERENCES "WarehouseBin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeItem" ADD CONSTRAINT "StocktakeItem_stocktakeId_fkey"
    FOREIGN KEY ("stocktakeId") REFERENCES "Stocktake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeItem" ADD CONSTRAINT "StocktakeItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeItem" ADD CONSTRAINT "StocktakeItem_binId_fkey"
    FOREIGN KEY ("binId") REFERENCES "WarehouseBin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_salesReturnId_fkey"
    FOREIGN KEY ("salesReturnId") REFERENCES "SalesReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_creditNoteId_fkey"
    FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS hardening for Phase 8+ tables.
ALTER TABLE "WarehouseBin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stocktake" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StocktakeItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditNoteLine" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "stockbalance_org_isolation" ON "StockBalance";
  DROP POLICY IF EXISTS "stockreservation_org_isolation" ON "StockReservation";
  DROP POLICY IF EXISTS "stockreconciliation_org_isolation" ON "StockReconciliation";

  CREATE POLICY "stockbalance_org_isolation" ON "StockBalance"
    FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

  CREATE POLICY "stockreservation_org_isolation" ON "StockReservation"
    FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

  CREATE POLICY "stockreconciliation_org_isolation" ON "StockReconciliation"
    FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

  CREATE POLICY "warehousebin_org_isolation" ON "WarehouseBin"
    FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

  CREATE POLICY "stocktake_org_isolation" ON "Stocktake"
    FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

  CREATE POLICY "stocktakeitem_org_isolation" ON "StocktakeItem"
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM "Stocktake"
        WHERE "Stocktake"."id" = "StocktakeItem"."stocktakeId"
          AND "Stocktake"."organizationId" = current_setting('app.current_organization_id', true)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM "Stocktake"
        WHERE "Stocktake"."id" = "StocktakeItem"."stocktakeId"
          AND "Stocktake"."organizationId" = current_setting('app.current_organization_id', true)
      )
    );

  CREATE POLICY "creditnote_org_isolation" ON "CreditNote"
    FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true))
    WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

  CREATE POLICY "creditnoteline_org_isolation" ON "CreditNoteLine"
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM "CreditNote"
        WHERE "CreditNote"."id" = "CreditNoteLine"."creditNoteId"
          AND "CreditNote"."organizationId" = current_setting('app.current_organization_id', true)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM "CreditNote"
        WHERE "CreditNote"."id" = "CreditNoteLine"."creditNoteId"
          AND "CreditNote"."organizationId" = current_setting('app.current_organization_id', true)
      )
    );
END $$;
