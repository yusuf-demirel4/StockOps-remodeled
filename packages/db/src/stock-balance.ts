/**
 * Transactional stock balance operations.
 *
 * Every stock mutation must call `adjustBalance` inside the same
 * transaction that creates the StockMovement row. This keeps the
 * StockBalance table in sync with the ledger at all times.
 *
 * Uses SELECT … FOR UPDATE to serialize concurrent writes to the
 * same (org, product, warehouse) tuple.
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
): Promise<BalanceRow> {
  // Try to lock existing row
  const rows: BalanceRow[] = await tx.$queryRawUnsafe(
    `SELECT "id", "organizationId", "productId", "warehouseId",
            "onHand", "reserved", "available", "version"
     FROM "StockBalance"
     WHERE "organizationId" = $1 AND "productId" = $2 AND "warehouseId" = $3
     FOR UPDATE`,
    organizationId,
    productId,
    warehouseId,
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
  const inserted: BalanceRow[] = await tx.$queryRawUnsafe(
    `INSERT INTO "StockBalance" ("id", "organizationId", "productId", "warehouseId", "onHand", "reserved", "available", "version", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, 0, 0, 0, 0, NOW())
     ON CONFLICT ("organizationId", "productId", "warehouseId") DO NOTHING
     RETURNING "id", "organizationId", "productId", "warehouseId", "onHand", "reserved", "available", "version"`,
    organizationId,
    productId,
    warehouseId,
  );

  if (inserted.length > 0) {
    return {
      ...inserted[0],
      onHand: Number(inserted[0].onHand),
      reserved: Number(inserted[0].reserved),
      available: Number(inserted[0].available),
      version: Number(inserted[0].version),
    };
  }

  // Race: another tx inserted between our SELECT and INSERT — re-lock
  const retry: BalanceRow[] = await tx.$queryRawUnsafe(
    `SELECT "id", "organizationId", "productId", "warehouseId",
            "onHand", "reserved", "available", "version"
     FROM "StockBalance"
     WHERE "organizationId" = $1 AND "productId" = $2 AND "warehouseId" = $3
     FOR UPDATE`,
    organizationId,
    productId,
    warehouseId,
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
 * Adjust onHand by `delta` and recalculate `available`.
 * Must be called inside a transaction after lockBalance.
 */
export async function adjustBalance(
  tx: TxClient,
  organizationId: string,
  productId: string,
  warehouseId: string,
  delta: number,
): Promise<BalanceRow> {
  const bal = await lockBalance(tx, organizationId, productId, warehouseId);
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
): Promise<BalanceRow> {
  const bal = await lockBalance(tx, organizationId, productId, warehouseId);
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
    reserved: newReserved,
    available: newAvailable,
    version: bal.version + 1,
  };
}
