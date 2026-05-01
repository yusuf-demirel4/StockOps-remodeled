const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'packages', 'db', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Enums
if (!schema.includes('PARTIALLY_PICKED')) {
  schema = schema.replace(
    /enum SalesOrderStatus {[\s\S]*?CANCELLED\s*}/,
    `enum SalesOrderStatus {
  DRAFT
  CONFIRMED
  PICKING
  PARTIALLY_PICKED
  PICKED
  PARTIALLY_PACKED
  PACKED
  PARTIALLY_SHIPPED
  SHIPPED
  DELIVERED
  CANCELLED
}

enum StocktakeStatus {
  DRAFT
  COUNTING
  REVIEW
  COMPLETED
  CANCELLED
}

enum StocktakeItemStatus {
  PENDING
  COUNTED
  APPROVED
  REJECTED
}`
  );
}

// 2. Product
if (!schema.includes('isBatchTracked')) {
  schema = schema.replace(
    /isActive\s+Boolean\s+@default\(true\)/,
    `isActive           Boolean             @default(true)
  isBatchTracked     Boolean             @default(false)
  isSerialized       Boolean             @default(false)`
  );
}

// 3. Warehouse
if (!schema.includes('bins                WarehouseBin[]')) {
  schema = schema.replace(
    /inventoryLayers\s+InventoryLayer\[\]/,
    `bins                WarehouseBin[]
  inventoryLayers     InventoryLayer[]`
  );
  schema = schema.replace(
    /manufacturingOrders ManufacturingOrder\[\]/,
    `manufacturingOrders ManufacturingOrder[]
  stocktakes          Stocktake[]`
  );
}

// 4. WarehouseBin
if (!schema.includes('model WarehouseBin {')) {
  schema = schema.replace(
    /@@index\(\[organizationId\]\)\s*\n\}/,
    `@@index([organizationId])
}

model WarehouseBin {
  id             String       @id @default(cuid())
  warehouseId    String
  code           String
  description    String?
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  warehouse      Warehouse    @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  stockBalances  StockBalance[]
  inventoryLayers InventoryLayer[]
  stockMovements StockMovement[]
  pickListItems  PickListItem[]
  stocktakeItems StocktakeItem[]

  @@unique([warehouseId, code])
  @@index([warehouseId])
}`
  );
}

// 5. StockMovement
if (!schema.includes('binId          String?')) {
  schema = schema.replace(
    /note\s+String\?\n\s+createdById\s+String\?/,
    `note           String?
  binId          String?
  lotNumber      String?
  serialNumber   String?
  expiryDate     DateTime?
  createdById    String?`
  );
  schema = schema.replace(
    /warehouse\s+Warehouse\s+@relation\(fields: \[warehouseId\], references: \[id\], onDelete: Restrict\)/,
    `warehouse      Warehouse         @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  bin            WarehouseBin?     @relation(fields: [binId], references: [id], onDelete: SetNull)`
  );
}

// 6. SalesOrderLine
if (!schema.includes('pickedQty')) {
  schema = schema.replace(
    /quantity\s+Int\n\s+unitPrice\s+Decimal\s+@default\(0\) @db\.Decimal\(12, 2\)/,
    `quantity     Int
  pickedQty    Int        @default(0)
  packedQty    Int        @default(0)
  shippedQty   Int        @default(0)
  unitPrice    Decimal    @default(0) @db.Decimal(12, 2)`
  );
}

// 7. PickListItem
if (schema.includes('binLocation')) {
  schema = schema.replace(
    /binLocation\s+String\?\n\s+notes\s+String\?/,
    `binId        String?
  lotNumber    String?
  serialNumber String?
  expiryDate   DateTime?
  notes        String?`
  );
  schema = schema.replace(
    /salesOrder\s+SalesOrder\s+@relation\(fields: \[salesOrderId\], references: \[id\], onDelete: Restrict\)/,
    `salesOrder   SalesOrder @relation(fields: [salesOrderId], references: [id], onDelete: Restrict)
  bin          WarehouseBin? @relation(fields: [binId], references: [id], onDelete: SetNull)`
  );
}

// 8. StockBalance
if (!schema.includes('binId          String?')) {
  schema = schema.replace(
    /available\s+Int\s+@default\(0\)\n\s+version\s+Int\s+@default\(0\)/,
    `available      Int          @default(0)
  binId          String?
  lotNumber      String?
  serialNumber   String?
  expiryDate     DateTime?
  version        Int          @default(0)`
  );
  schema = schema.replace(
    /warehouse\s+Warehouse\s+@relation\(fields: \[warehouseId\], references: \[id\], onDelete: Restrict\)/g,
    `warehouse      Warehouse    @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  bin            WarehouseBin? @relation(fields: [binId], references: [id], onDelete: SetNull)`
  );
  schema = schema.replace(
    /@@unique\(\[organizationId, productId, warehouseId\]\)/,
    `@@unique([organizationId, productId, warehouseId, binId, lotNumber, serialNumber])`
  );
}

// 9. User
if (!schema.includes('stocktakes           Stocktake[]')) {
  schema = schema.replace(
    /savedReports\s+SavedReport\[\]/,
    `savedReports         SavedReport[]
  stocktakes           Stocktake[]`
  );
}

fs.writeFileSync(schemaPath, schema);
console.log('Schema forcefully updated via regex.');
