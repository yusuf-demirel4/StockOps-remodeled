/**
 * Phase 8 Load Test Seed
 *
 * Generates:
 * - 10 warehouses
 * - 10,000 products
 * - 100,000 stock movements
 * - Corresponding StockBalance rows
 *
 * Usage: npx tsx src/seed-loadtest.ts
 */

import { getPrisma } from "./client";

const PRODUCT_COUNT = 10_000;
const WAREHOUSE_COUNT = 10;
const MOVEMENT_COUNT = 100_000;
const BATCH_SIZE = 1000;

const categories = [
  "Electronics",
  "Clothing",
  "Food",
  "Furniture",
  "Tools",
  "Automotive",
  "Sports",
  "Health",
  "Toys",
  "Office",
];

async function main() {
  const prisma = getPrisma();
  console.log("Phase 8 Load Test Seed — starting...");

  // Ensure organization and user exist
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "LoadTest Corp",
        slug: "loadtest-corp",
      },
    });
  }

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Seed User",
        email: "seed@loadtest.local",
      },
    });
    await prisma.membership.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "Owner",
      },
    });
  }

  const orgId = org.id;

  // Create warehouses
  console.log(`Creating ${WAREHOUSE_COUNT} warehouses...`);
  const existingWarehouses = await prisma.warehouse.findMany({
    where: { organizationId: orgId },
  });

  const warehouseIds: string[] = existingWarehouses.map((w: any) => w.id);

  for (let i = existingWarehouses.length; i < WAREHOUSE_COUNT; i++) {
    const wh = await prisma.warehouse.create({
      data: {
        organizationId: orgId,
        code: `WH-${String(i + 1).padStart(3, "0")}`,
        name: `Warehouse ${i + 1}`,
        isDefault: i === 0,
      },
    });
    warehouseIds.push(wh.id);
  }
  console.log(`  ${warehouseIds.length} warehouses ready`);

  // Create products in batches
  console.log(`Creating ${PRODUCT_COUNT} products...`);
  const existingProducts = await prisma.product.count({
    where: { organizationId: orgId },
  });
  const productsToCreate = PRODUCT_COUNT - existingProducts;

  for (let batch = 0; batch < productsToCreate; batch += BATCH_SIZE) {
    const batchEnd = Math.min(batch + BATCH_SIZE, productsToCreate);
    const data = [];
    for (let i = batch; i < batchEnd; i++) {
      const idx = existingProducts + i;
      data.push({
        organizationId: orgId,
        sku: `SKU-${String(idx + 1).padStart(6, "0")}`,
        name: `Product ${idx + 1}`,
        category: categories[idx % categories.length],
        minimumStock: Math.floor(Math.random() * 20) + 5,
        unitPrice: Math.floor(Math.random() * 10000) / 100,
        isActive: true,
      });
    }
    await prisma.product.createMany({ data });
    if ((batch / BATCH_SIZE) % 10 === 0) {
      console.log(`  ${batchEnd} / ${productsToCreate} products created`);
    }
  }

  const allProducts = await prisma.product.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });
  const productIds = allProducts.map((p: any) => p.id);
  console.log(`  ${productIds.length} products ready`);

  // Create stock movements in batches
  console.log(`Creating ${MOVEMENT_COUNT} stock movements...`);
  const existingMovements = await prisma.stockMovement.count({
    where: { organizationId: orgId },
  });
  const movementsToCreate = MOVEMENT_COUNT - existingMovements;

  const types = ["INBOUND", "OUTBOUND", "ADJUSTMENT", "PURCHASE_RECEIPT"] as const;

  // Track running balances per product/warehouse for realistic movements
  const balanceTracker = new Map<string, number>();

  for (let batch = 0; batch < movementsToCreate; batch += BATCH_SIZE) {
    const batchEnd = Math.min(batch + BATCH_SIZE, movementsToCreate);
    const data = [];
    for (let i = batch; i < batchEnd; i++) {
      const productId = productIds[i % productIds.length];
      const warehouseId = warehouseIds[Math.floor(Math.random() * warehouseIds.length)];
      const key = `${productId}:${warehouseId}`;
      const currentBalance = balanceTracker.get(key) ?? 0;

      // Bias toward inbound to keep balances positive
      let type = types[Math.floor(Math.random() * types.length)];
      let quantityChange: number;

      if (type === "OUTBOUND" && currentBalance <= 0) {
        type = "INBOUND";
      }

      if (type === "OUTBOUND") {
        quantityChange = -Math.min(
          Math.floor(Math.random() * 50) + 1,
          currentBalance,
        );
      } else if (type === "ADJUSTMENT") {
        quantityChange =
          Math.random() > 0.5
            ? Math.floor(Math.random() * 20) + 1
            : -Math.min(Math.floor(Math.random() * 10), currentBalance);
      } else {
        quantityChange = Math.floor(Math.random() * 100) + 1;
      }

      balanceTracker.set(key, currentBalance + quantityChange);

      data.push({
        organizationId: orgId,
        warehouseId,
        productId,
        type,
        quantityChange,
        note: `Seed movement #${existingMovements + i + 1}`,
        createdById: user.id,
      });
    }
    await prisma.stockMovement.createMany({ data });
    if ((batch / BATCH_SIZE) % 10 === 0) {
      console.log(`  ${batchEnd} / ${movementsToCreate} movements created`);
    }
  }
  console.log(`  ${movementsToCreate} movements created`);

  // Rebuild StockBalance from movements
  console.log("Rebuilding StockBalance from ledger...");
  await prisma.$executeRawUnsafe(`DELETE FROM "StockBalance" WHERE "organizationId" = $1`, orgId);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "StockBalance" ("id", "organizationId", "productId", "warehouseId", "onHand", "reserved", "available", "version", "updatedAt")
     SELECT gen_random_uuid(), "organizationId", "productId", "warehouseId",
            SUM("quantityChange"), 0, SUM("quantityChange"), 0, NOW()
     FROM "StockMovement"
     WHERE "organizationId" = $1
     GROUP BY "organizationId", "productId", "warehouseId"`,
    orgId,
  );

  // Refresh materialized view
  await prisma.$executeRawUnsafe(
    "REFRESH MATERIALIZED VIEW CONCURRENTLY stock_on_hand",
  ).catch(() => {
    console.log("  (materialized view refresh skipped — may not exist)");
  });

  // Report stats
  const [productCount, warehouseCount, movementCount, balanceCount] =
    await Promise.all([
      prisma.product.count({ where: { organizationId: orgId } }),
      prisma.warehouse.count({ where: { organizationId: orgId } }),
      prisma.stockMovement.count({ where: { organizationId: orgId } }),
      prisma.$queryRawUnsafe<{ count: number }[]>(
        `SELECT COUNT(*)::int as count FROM "StockBalance" WHERE "organizationId" = $1`,
        orgId,
      ),
    ]);

  console.log("\nLoad test seed complete:");
  console.log(`  Products:        ${productCount}`);
  console.log(`  Warehouses:      ${warehouseCount}`);
  console.log(`  Stock Movements: ${movementCount}`);
  console.log(`  Stock Balances:  ${balanceCount[0]?.count ?? 0}`);
  console.log("\nExit gate target: p95 < 300ms for /stock/rows");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
