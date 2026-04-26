-- CreateTable: InventoryLayer (FIFO cost layers)
CREATE TABLE "InventoryLayer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchaseOrderId" TEXT,

    CONSTRAINT "InventoryLayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable: COGSEntry (cost of goods sold records)
CREATE TABLE "COGSEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "COGSEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryLayer_organizationId_productId_warehouseId_receiv_idx"
  ON "InventoryLayer"("organizationId", "productId", "warehouseId", "receivedAt");

CREATE INDEX "COGSEntry_organizationId_productId_idx"
  ON "COGSEntry"("organizationId", "productId");

-- AddForeignKey
ALTER TABLE "InventoryLayer"
  ADD CONSTRAINT "InventoryLayer_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryLayer"
  ADD CONSTRAINT "InventoryLayer_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryLayer"
  ADD CONSTRAINT "InventoryLayer_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "COGSEntry"
  ADD CONSTRAINT "COGSEntry_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "COGSEntry"
  ADD CONSTRAINT "COGSEntry_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "COGSEntry"
  ADD CONSTRAINT "COGSEntry_movementId_fkey"
  FOREIGN KEY ("movementId") REFERENCES "StockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
