import { getPrisma } from "./client";

/**
 * Refreshes the stock_on_hand materialized view.
 * Uses CONCURRENTLY so reads are not blocked during refresh.
 */
export async function refreshStockOnHand() {
  await getPrisma().$executeRawUnsafe(
    "REFRESH MATERIALIZED VIEW CONCURRENTLY stock_on_hand",
  );
}

export type StockOnHandRow = {
  organizationId: string;
  productId: string;
  warehouseId: string;
  on_hand: number;
  movement_count: number;
  last_movement_at: Date | null;
};

/**
 * Query the materialized view for a given organization.
 * Optionally filter by productId / warehouseId.
 */
export async function queryStockOnHand(
  organizationId: string,
  filter?: { productId?: string; warehouseId?: string },
): Promise<StockOnHandRow[]> {
  const conditions = ["\"organizationId\" = $1"];
  const params: unknown[] = [organizationId];

  if (filter?.productId) {
    params.push(filter.productId);
    conditions.push(`"productId" = $${params.length}`);
  }

  if (filter?.warehouseId) {
    params.push(filter.warehouseId);
    conditions.push(`"warehouseId" = $${params.length}`);
  }

  const query = `
    SELECT * FROM stock_on_hand
    WHERE ${conditions.join(" AND ")}
  `;

  const rows = await getPrisma().$queryRawUnsafe<any[]>(query, ...params);

  return rows.map((row) => ({
    organizationId: row.organizationId,
    productId: row.productId,
    warehouseId: row.warehouseId,
    on_hand: Number(row.on_hand),
    movement_count: Number(row.movement_count),
    last_movement_at: row.last_movement_at,
  }));
}
