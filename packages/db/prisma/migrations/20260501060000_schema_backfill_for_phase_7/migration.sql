-- Backfill schema objects that exist in Prisma schema but were missing from
-- the migration chain before Phase 7 RLS hardening.

CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHECK', 'OTHER');
CREATE TYPE "SalesReturnStatus" AS ENUM ('DRAFT', 'APPROVED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ManufacturingOrderStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'MANUFACTURE_CONSUME';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'MANUFACTURE_PRODUCE';

ALTER TABLE "Product"
  ADD COLUMN "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "costPrice" DECIMAL(12,2),
  ADD COLUMN "averageCost" DECIMAL(12,2),
  ADD COLUMN "weight" DECIMAL(10,3),
  ADD COLUMN "dimensionL" DECIMAL(10,2),
  ADD COLUMN "dimensionW" DECIMAL(10,2),
  ADD COLUMN "dimensionH" DECIMAL(10,2);

ALTER TABLE "SalesOrder"
  ADD COLUMN "customerId" TEXT;

ALTER TABLE "SalesOrderLine"
  ADD COLUMN "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "lineTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "PurchaseOrderLine"
  ADD COLUMN "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "lineTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "ProductVariant" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "barcode" TEXT,
  "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "costPrice" DECIMAL(12,2),
  "weight" DECIMAL(8,3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "attributes" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "taxId" TEXT,
  "address" TEXT,
  "paymentTermDays" INTEGER NOT NULL DEFAULT 30,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesReturn" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "reason" TEXT,
  "status" "SalesReturnStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesReturnLine" (
  "id" TEXT NOT NULL,
  "salesReturnId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "restocked" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "SalesReturnLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issuedAt" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceLine" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "description" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(12,2) NOT NULL,

  CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
  "reference" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillOfMaterial" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BillOfMaterial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BomComponent" (
  "id" TEXT NOT NULL,
  "bomId" TEXT NOT NULL,
  "componentProductId" TEXT NOT NULL,
  "quantity" DECIMAL(12,4) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "BomComponent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingOrder" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "bomId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "ManufacturingOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManufacturingOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerUser" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerSession" (
  "id" TEXT NOT NULL,
  "customerUserId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerPriceTier" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "tierPrice" DECIMAL(12,2) NOT NULL,
  "minQuantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerPriceTier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationBranding" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "logoUrl" TEXT,
  "primaryColor" TEXT,
  "accentColor" TEXT,
  "portalDomain" TEXT,

  CONSTRAINT "OrganizationBranding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedReport" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "reportDefinitionId" TEXT NOT NULL,
  "columns" JSONB NOT NULL,
  "filters" JSONB NOT NULL,
  "dateRange" JSONB,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduledReport" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "savedReportId" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "recipients" JSONB NOT NULL,
  "nextRunAt" TIMESTAMP(3) NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductVariant_productId_sku_key" ON "ProductVariant"("productId", "sku");
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

CREATE UNIQUE INDEX "Customer_organizationId_code_key" ON "Customer"("organizationId", "code");
CREATE INDEX "Customer_organizationId_name_idx" ON "Customer"("organizationId", "name");

CREATE INDEX "SalesOrder_customerId_idx" ON "SalesOrder"("customerId");

CREATE UNIQUE INDEX "SalesReturn_organizationId_code_key" ON "SalesReturn"("organizationId", "code");
CREATE INDEX "SalesReturn_organizationId_status_idx" ON "SalesReturn"("organizationId", "status");
CREATE INDEX "SalesReturn_salesOrderId_idx" ON "SalesReturn"("salesOrderId");

CREATE UNIQUE INDEX "Invoice_organizationId_code_key" ON "Invoice"("organizationId", "code");
CREATE INDEX "Invoice_organizationId_status_idx" ON "Invoice"("organizationId", "status");
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

CREATE INDEX "Payment_organizationId_paidAt_idx" ON "Payment"("organizationId", "paidAt");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

CREATE UNIQUE INDEX "BillOfMaterial_productId_key" ON "BillOfMaterial"("productId");
CREATE INDEX "BillOfMaterial_organizationId_idx" ON "BillOfMaterial"("organizationId");
CREATE INDEX "BomComponent_bomId_idx" ON "BomComponent"("bomId");

CREATE UNIQUE INDEX "ManufacturingOrder_organizationId_code_key" ON "ManufacturingOrder"("organizationId", "code");
CREATE INDEX "ManufacturingOrder_organizationId_status_idx" ON "ManufacturingOrder"("organizationId", "status");

CREATE UNIQUE INDEX "CustomerUser_email_key" ON "CustomerUser"("email");
CREATE INDEX "CustomerUser_customerId_idx" ON "CustomerUser"("customerId");

CREATE UNIQUE INDEX "CustomerSession_tokenHash_key" ON "CustomerSession"("tokenHash");
CREATE INDEX "CustomerSession_expiresAt_idx" ON "CustomerSession"("expiresAt");

CREATE UNIQUE INDEX "CustomerPriceTier_organizationId_customerId_productId_minQu_key"
  ON "CustomerPriceTier"("organizationId", "customerId", "productId", "minQuantity");
CREATE INDEX "CustomerPriceTier_customerId_productId_idx" ON "CustomerPriceTier"("customerId", "productId");

CREATE UNIQUE INDEX "OrganizationBranding_organizationId_key" ON "OrganizationBranding"("organizationId");

CREATE INDEX "SavedReport_organizationId_idx" ON "SavedReport"("organizationId");
CREATE INDEX "ScheduledReport_organizationId_idx" ON "ScheduledReport"("organizationId");
CREATE INDEX "ScheduledReport_isActive_nextRunAt_idx" ON "ScheduledReport"("isActive", "nextRunAt");

ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalesOrder"
  ADD CONSTRAINT "SalesOrder_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesReturn"
  ADD CONSTRAINT "SalesReturn_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalesReturn"
  ADD CONSTRAINT "SalesReturn_salesOrderId_fkey"
  FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SalesReturnLine"
  ADD CONSTRAINT "SalesReturnLine_salesReturnId_fkey"
  FOREIGN KEY ("salesReturnId") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalesReturnLine"
  ADD CONSTRAINT "SalesReturnLine_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvoiceLine"
  ADD CONSTRAINT "InvoiceLine_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvoiceLine"
  ADD CONSTRAINT "InvoiceLine_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillOfMaterial"
  ADD CONSTRAINT "BillOfMaterial_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillOfMaterial"
  ADD CONSTRAINT "BillOfMaterial_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BomComponent"
  ADD CONSTRAINT "BomComponent_bomId_fkey"
  FOREIGN KEY ("bomId") REFERENCES "BillOfMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BomComponent"
  ADD CONSTRAINT "BomComponent_componentProductId_fkey"
  FOREIGN KEY ("componentProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ManufacturingOrder"
  ADD CONSTRAINT "ManufacturingOrder_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManufacturingOrder"
  ADD CONSTRAINT "ManufacturingOrder_bomId_fkey"
  FOREIGN KEY ("bomId") REFERENCES "BillOfMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ManufacturingOrder"
  ADD CONSTRAINT "ManufacturingOrder_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerUser"
  ADD CONSTRAINT "CustomerUser_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerSession"
  ADD CONSTRAINT "CustomerSession_customerUserId_fkey"
  FOREIGN KEY ("customerUserId") REFERENCES "CustomerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerPriceTier"
  ADD CONSTRAINT "CustomerPriceTier_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerPriceTier"
  ADD CONSTRAINT "CustomerPriceTier_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerPriceTier"
  ADD CONSTRAINT "CustomerPriceTier_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrganizationBranding"
  ADD CONSTRAINT "OrganizationBranding_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedReport"
  ADD CONSTRAINT "SavedReport_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedReport"
  ADD CONSTRAINT "SavedReport_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduledReport"
  ADD CONSTRAINT "ScheduledReport_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduledReport"
  ADD CONSTRAINT "ScheduledReport_savedReportId_fkey"
  FOREIGN KEY ("savedReportId") REFERENCES "SavedReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
