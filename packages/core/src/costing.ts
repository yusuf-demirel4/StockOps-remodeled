/**
 * WAC (Weighted Average Cost) and FIFO (First In First Out) costing methods.
 *
 * WAC: New Average = (Old Total Value + New Purchase Value) / (Old Qty + New Qty)
 * FIFO: Track inventory layers, deplete oldest first.
 */

export type CostingMethod = "WAC" | "FIFO";

export type InventoryLayer = {
  id: string;
  organizationId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
  receivedAt: string;
  purchaseOrderId?: string;
};

export type COGSEntry = {
  organizationId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  method: CostingMethod;
  movementId: string;
};

// ---------------------------------------------------------------------------
// WAC — Weighted Average Cost
// ---------------------------------------------------------------------------

/**
 * Recalculate the weighted average cost after receiving new inventory.
 *
 * @param currentQty - current on-hand quantity
 * @param currentAvgCost - current average cost per unit
 * @param incomingQty - units being received
 * @param incomingUnitCost - cost per unit of incoming stock
 * @returns the new weighted average cost (4 decimal places)
 */
export function recalculateWAC(
  currentQty: number,
  currentAvgCost: number,
  incomingQty: number,
  incomingUnitCost: number,
): number {
  if (currentQty + incomingQty === 0) return 0;

  const totalValue = currentQty * currentAvgCost + incomingQty * incomingUnitCost;
  const totalQty = currentQty + incomingQty;

  return Math.round((totalValue / totalQty) * 10000) / 10000;
}

/**
 * Compute COGS for an outbound movement using WAC method.
 * Simply: quantity * current average cost.
 */
export function computeWACCogs(
  outboundQty: number,
  currentAvgCost: number,
  movementId: string,
  organizationId: string,
  productId: string,
): COGSEntry {
  const totalCost = Math.round(outboundQty * currentAvgCost * 100) / 100;

  return {
    organizationId,
    productId,
    quantity: outboundQty,
    unitCost: currentAvgCost,
    totalCost,
    method: "WAC",
    movementId,
  };
}

// ---------------------------------------------------------------------------
// FIFO — First In First Out
// ---------------------------------------------------------------------------

export type FIFOResult = {
  cogs: COGSEntry;
  remainingLayers: InventoryLayer[];
  depletedLayers: { layerId: string; quantityUsed: number }[];
};

/**
 * Calculate COGS using FIFO and return the updated layers.
 * Depletes the oldest layers first (sorted by receivedAt).
 *
 * @param layers - inventory layers sorted by receivedAt ASC (oldest first)
 * @param outboundQty - number of units being sold/transferred out
 * @param movementId - the stock movement triggering this COGS
 * @param organizationId - org context
 * @param productId - product context
 * @throws if insufficient layer quantity
 */
export function calculateFIFOCost(
  layers: InventoryLayer[],
  outboundQty: number,
  movementId: string,
  organizationId: string,
  productId: string,
): FIFOResult {
  const sorted = [...layers].sort(
    (a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime(),
  );

  let remaining = outboundQty;
  let totalCost = 0;
  let weightedUnitCost = 0;
  const depletedLayers: { layerId: string; quantityUsed: number }[] = [];
  const updatedLayers: InventoryLayer[] = [];

  for (const layer of sorted) {
    if (remaining <= 0) {
      updatedLayers.push(layer);
      continue;
    }

    const take = Math.min(remaining, layer.quantity);
    totalCost += take * layer.unitCost;
    remaining -= take;

    depletedLayers.push({ layerId: layer.id, quantityUsed: take });

    const leftover = layer.quantity - take;
    if (leftover > 0) {
      updatedLayers.push({ ...layer, quantity: leftover });
    }
    // if leftover === 0, layer is fully depleted — don't add to updated
  }

  if (remaining > 0) {
    throw new Error(
      `Insufficient inventory layers: need ${outboundQty}, available ${outboundQty - remaining}`,
    );
  }

  totalCost = Math.round(totalCost * 100) / 100;
  weightedUnitCost =
    outboundQty > 0
      ? Math.round((totalCost / outboundQty) * 10000) / 10000
      : 0;

  return {
    cogs: {
      organizationId,
      productId,
      quantity: outboundQty,
      unitCost: weightedUnitCost,
      totalCost,
      method: "FIFO",
      movementId,
    },
    remainingLayers: updatedLayers,
    depletedLayers,
  };
}

// ---------------------------------------------------------------------------
// Unified entry point
// ---------------------------------------------------------------------------

/**
 * Add a new inventory layer when receiving stock (used by both WAC and FIFO).
 */
export function createLayerFromReceipt(
  id: string,
  organizationId: string,
  productId: string,
  warehouseId: string,
  quantity: number,
  unitCost: number,
  purchaseOrderId?: string,
): InventoryLayer {
  return {
    id,
    organizationId,
    productId,
    warehouseId,
    quantity,
    unitCost,
    receivedAt: new Date().toISOString(),
    purchaseOrderId,
  };
}
