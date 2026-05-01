/**
 * Transactional stock balance operations.
 *
 * Every stock mutation must call `adjustBalance` inside the same
 * transaction that creates the StockMovement row. This keeps the
 * StockBalance table in sync with the ledger at all times.
 *
 * Uses SELECT … FOR UPDATE to serialize concurrent writes to the
 * same (org, product, warehouse, bin, lot, serial) tuple.
 */

type TxClient = {
  $queryRawUnsafe: (...args: any[]) => Promise<any>;
  $executeRawUnsafe: (...args: any[]) => Promise<any>;
};

export type BalanceRow = {
  id: string;
  organizationId: string;
  productId: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
  available: number;
  version: number;
};

/**
 * Lock and return the balance row, creating it if it doesn't exist.
 * Must be called inside a transaction.
 */
export async function lockBalance(
  tx: TxClient,
  organizationId: string,
  productId: string,
  warehouseId: string,
  binId: string | null = null,
  lotNumber: string | null = null,
  serialNumber: string | null = null,
): Promise<BalanceRow> {
  // Try to lock existing row
  const rows: BalanceRow[] = await tx.$queryRawUnsafe(
    `SELECT "id", "organizationId", "productId", "warehouseId",
            "onHand", "reserved", "available", "version"
     FROM "StockBalance"
     WHERE "organizationId" = $1 AND "productId" = $2 AND "warehouseId" = $3
       AND "binId" IS NOT DISTINCT FROM $4
       AND "lotNumber" IS NOT DISTINCT FROM $5
       AND "serialNumber" IS NOT DISTINCT FROM $6
     FOR UPDATE`,
    organizationId,
    productId,
    warehouseId,
    binId,
    lotNumber,
    serialNumber
  );

  if (rows.length > 0) {
    return {
      ...rows[0],
      onHand: Number(rows[0].onHand),
      reserved: Number(rows[0].reserved),
      available: Number(rows[0].available),
      version: Number(rows[0].version),
    };
  }

  // Row doesn't exist — insert and lock
  // Using an explicit ID so we can query it back if ON CONFLICT DO NOTHING kicks in due to nulls in postgres
  const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
  
  await tx.$executeRawUnsafe(
    `INSERT INTO "StockBalance" ("id", "organizationId", "productId", "warehouseId", "binId", "lotNumber", "serialNumber", "onHand", "reserved", "available", "version", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, 0, NOW())
     ON CONFLICT ("organizationId", "productId", "warehouseId", "binId", "lotNumber", "serialNumber") DO NOTHING`,
    newId,
    organizationId,
    productId,
    warehouseId,
    binId,
    lotNumber,
    serialNumber
  );

  // Re-lock
  const retry: BalanceRow[] = await tx.$queryRawUnsafe(
    `SELECT "id", "organizationId", "productId", "warehouseId",
            "onHand", "reserved", "available", "version"
     FROM "StockBalance"
     WHERE "organizationId" = $1 AND "productId" = $2 AND "warehouseId" = $3
       AND "binId" IS NOT DISTINCT FROM $4
       AND "lotNumber" IS NOT DISTINCT FROM $5
       AND "serialNumber" IS NOT DISTINCT FROM $6
     FOR UPDATE`,
    organizationId,
    productId,
    warehouseId,
    binId,
    lotNumber,
    serialNumber
  );

  return {
    ...retry[0],
    onHand: Number(retry[0].onHand),
    reserved: Number(retry[0].reserved),
    available: Number(retry[0].available),
    version: Number(retry[0].version),
  };
}

/**
 * Adjust onHand by \`delta\` and recalculate \`available\`.
 * Must be called inside a transaction after lockBalance.
 */
export async function adjustBalance(
  tx: TxClient,
  organizationId: string,
  productId: string,
  warehouseId: string,
  delta: number,
  binId: string | null = null,
  lotNumber: string | null = null,
  serialNumber: string | null = null,
): Promise<BalanceRow> {
  const bal = await lockBalance(tx, organizationId, productId, warehouseId, binId, lotNumber, serialNumber);
  const newOnHand = bal.onHand + delta;
  const newAvailable = newOnHand - bal.reserved;

  await tx.$executeRawUnsafe(
    `UPDATE "StockBalance"
     SET "onHand" = $1, "available" = $2, "version" = "version" + 1, "updatedAt" = NOW()
     WHERE "id" = $3`,
    newOnHand,
    newAvailable,
    bal.id,
  );

  return {
    ...bal,
    onHand: newOnHand,
    available: newAvailable,
    version: bal.version + 1,
  };
}

/**
 * Adjust reserved quantity and recalculate available.
 * Positive delta = reserve more, negative = release.
 */
export async function adjustReservation(
  tx: TxClient,
  organizationId: string,
  productId: string,
  warehouseId: string,
  reserveDelta: number,
  binId: string | null = null,
  lotNumber: string | null = null,
  serialNumber: string | null = null,
): Promise<BalanceRow> {
  const bal = await lockBalance(tx, organizationId, productId, warehouseId, binId, lotNumber, serialNumber);
  const newReserved = bal.reserved + reserveDelta;
  const newAvailable = bal.onHand - newReserved;

  await tx.$executeRawUnsafe(
    `UPDATE "StockBalance"
     SET "reserved" = $1, "available" = $2, "version" = "version" + 1, "updatedAt" = NOW()
     WHERE "id" = $3`,
    newReserved,
    newAvailable,
    bal.id,
  );

  return {
    ...bal,
    onHand: bal.onHand,
    reserved: newReserved,
    available: newAvailable,
    version: bal.version + 1,
  };
}