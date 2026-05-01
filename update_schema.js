const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'packages', 'db', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Enums
schema = schema.replace(
`enum SalesOrderStatus {
  DRAFT
  CONFIRMED
  PICKING
  PACKED
  SHIPPED
  DELIVERED
  CANCELLED
}`,
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

// 2. Product
schema = schema.replace(
`  minimumStock       Int                 @default(0)
  isActive           Boolean             @default(true)
  createdAt          DateTime            @default(now())`,
`  minimumStock       Int                 @default(0)
  isActive           Boolean             @default(true)
  isBatchTracked     Boolean             @default(false)
  isSerialized       Boolean             @default(false)
  createdAt          DateTime            @default(now())`
);

// 3. Warehouse
schema = schema.replace(
`  organization        Organization         @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  inventoryLayers     InventoryLayer[]`,
`  organization        Organization         @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  bins                WarehouseBin[]
  inventoryLayers     InventoryLayer[]`
);
schema = schema.replace(
`  manufacturingOrders ManufacturingOrder[]

  @@unique([organizationId, code])`,
`  manufacturingOrders ManufacturingOrder[]
  stocktakes          Stocktake[]

  @@unique([organizationId, code])`
);

// 4. WarehouseBin
schema = schema.replace(
`  @@unique([organizationId, code])
  @@index([organizationId])
}`,
`  @@unique([organizationId, code])
  @@index([organizationId])
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

// 5. StockMovement
schema = schema.replace(
`  quantityChange Int
  reference      String?
  note           String?
  createdById    String?
  createdAt      DateTime          @default(now())
  createdBy      User?             @relation(fields: [createdById], references: [id], onDelete: SetNull)
  organization   Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  product        Product           @relation(fields: [productId], references: [id], onDelete: Restrict)
  warehouse      Warehouse         @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  cogsEntries    COGSEntry[]`,
`  quantityChange Int
  reference      String?
  note           String?
  binId          String?
  lotNumber      String?
  serialNumber   String?
  expiryDate     DateTime?
  createdById    String?
  createdAt      DateTime          @default(now())
  createdBy      User?             @relation(fields: [createdById], references: [id], onDelete: SetNull)
  organization   Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  product        Product           @relation(fields: [productId], references: [id], onDelete: Restrict)
  warehouse      Warehouse         @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  bin            WarehouseBin?     @relation(fields: [binId], references: [id], onDelete: SetNull)
  cogsEntries    COGSEntry[]`
);

// 6. SalesOrderLine
schema = schema.replace(
`  quantity     Int
  unitPrice    Decimal    @default(0) @db.Decimal(12, 2)`,
`  quantity     Int
  pickedQty    Int        @default(0)
  packedQty    Int        @default(0)
  shippedQty   Int        @default(0)
  unitPrice    Decimal    @default(0) @db.Decimal(12, 2)`
);

// 7. PickListItem
schema = schema.replace(
`  quantity     Int
  pickedQty    Int        @default(0)
  binLocation  String?
  notes        String?
  pickList     PickList   @relation(fields: [pickListId], references: [id], onDelete: Cascade)
  product      Product    @relation(fields: [productId], references: [id], onDelete: Restrict)
  salesOrder   SalesOrder @relation(fields: [salesOrderId], references: [id], onDelete: Restrict)

  @@index([pickListId])`,
`  quantity     Int
  pickedQty    Int        @default(0)
  binId        String?
  lotNumber    String?
  serialNumber String?
  expiryDate   DateTime?
  notes        String?
  pickList     PickList   @relation(fields: [pickListId], references: [id], onDelete: Cascade)
  product      Product    @relation(fields: [productId], references: [id], onDelete: Restrict)
  salesOrder   SalesOrder @relation(fields: [salesOrderId], references: [id], onDelete: Restrict)
  bin          WarehouseBin? @relation(fields: [binId], references: [id], onDelete: SetNull)

  @@index([pickListId])`
);

// 8. StockBalance
schema = schema.replace(
`  available      Int          @default(0)
  version        Int          @default(0)
  updatedAt      DateTime     @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  product        Product      @relation(fields: [productId], references: [id], onDelete: Restrict)
  warehouse      Warehouse    @relation(fields: [warehouseId], references: [id], onDelete: Restrict)

  @@unique([organizationId, productId, warehouseId])`,
`  available      Int          @default(0)
  binId          String?
  lotNumber      String?
  serialNumber   String?
  expiryDate     DateTime?
  version        Int          @default(0)
  updatedAt      DateTime     @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  product        Product      @relation(fields: [productId], references: [id], onDelete: Restrict)
  warehouse      Warehouse    @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  bin            WarehouseBin? @relation(fields: [binId], references: [id], onDelete: SetNull)

  @@unique([organizationId, productId, warehouseId, binId, lotNumber, serialNumber])`
);

// 9. User
schema = schema.replace(
`  sessions             Session[]
  stockMovements       StockMovement[]
  stockReconciliations StockReconciliation[]
  savedReports         SavedReport[]
}`,
`  sessions             Session[]
  stockMovements       StockMovement[]
  stockReconciliations StockReconciliation[]
  savedReports         SavedReport[]
  stocktakes           Stocktake[]
}`
);

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully');
