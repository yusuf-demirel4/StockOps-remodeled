/**
 * Warehouse Operations — Pick / Pack / Ship
 *
 * Pure functions for the Phase 3 fulfillment pipeline.
 * No Prisma imports — operates only on plain TypeScript types from types.ts.
 */

import type {
  PickListDraft,
  PickListItem,
  SalesOrderStatus,
} from "./types";

// ---------------------------------------------------------------------------
// 1. generatePickList
// ---------------------------------------------------------------------------

export type GeneratePickListParams = {
  salesOrderId: string;
  warehouseId: string;
  items: Array<{ productId: string; quantity: number; binLocation?: string }>;
};

/**
 * Build a typed draft object ready for persistence.
 *
 * @throws if the items array is empty
 * @throws if there are duplicate productIds
 */
export function generatePickList(params: GeneratePickListParams): PickListDraft {
  const { salesOrderId, warehouseId, items } = params;

  if (items.length === 0) {
    throw new Error("Pick list must contain at least one item");
  }

  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.productId)) {
      throw new Error(`Duplicate productId in pick list: ${item.productId}`);
    }
    seen.add(item.productId);
  }

  return {
    salesOrderId,
    warehouseId,
    status: "PENDING",
    priority: 0,
    items: items.map((item) => ({
      salesOrderId,
      productId: item.productId,
      quantity: item.quantity,
      pickedQty: 0,
      binLocation: item.binLocation,
    })),
  };
}

// ---------------------------------------------------------------------------
// 2. calculatePickProgress
// ---------------------------------------------------------------------------

export type PickProgress = {
  total: number;
  picked: number;
  percentComplete: number;
};

/**
 * Calculate the overall pick progress for a list of pick-list items.
 * Returns rounded integer percentComplete (0–100).
 */
export function calculatePickProgress(items: PickListItem[]): PickProgress {
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  const picked = items.reduce((sum, item) => sum + item.pickedQty, 0);

  const percentComplete = total === 0 ? 0 : Math.round((picked / total) * 100);

  return { total, picked, percentComplete };
}

// ---------------------------------------------------------------------------
// 3. canTransitionOrderStatus
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: ReadonlyMap<SalesOrderStatus, SalesOrderStatus> = new Map([
  ["CONFIRMED", "PICKING"],
  ["PICKING", "PACKED"],
  ["PACKED", "SHIPPED"],
  ["SHIPPED", "DELIVERED"],
]);

/**
 * Enforce the linear pick/pack/ship state machine.
 * Only one valid target per source status — all other transitions return false.
 */
export function canTransitionOrderStatus(
  current: SalesOrderStatus,
  target: SalesOrderStatus,
): boolean {
  return ALLOWED_TRANSITIONS.get(current) === target;
}

// ---------------------------------------------------------------------------
// 4. buildTrackingUrl
// ---------------------------------------------------------------------------

const CARRIER_URL_MAP: Record<string, string> = {
  yurtici:
    "https://www.yurticikargo.com/tr/online-islemler/gonderi-sorgula?code={tracking}",
  aras:
    "https://kargotakip.araskargo.com.tr/..?barcode={tracking}",
  mng:
    "https://www.mngkargo.com.tr/..?id={tracking}",
  ptt:
    "https://gonderitakip.ptt.gov.tr/Track/Verify?q={tracking}",
};

/**
 * Build a tracking URL for a given Turkish carrier.
 * Case-insensitive carrier name lookup.
 *
 * @returns the populated URL, or null for unknown carriers
 */
export function buildTrackingUrl(
  carrier: string,
  trackingNumber: string,
): string | null {
  const template = CARRIER_URL_MAP[carrier.toLowerCase()];

  if (!template) return null;

  return template.replace("{tracking}", encodeURIComponent(trackingNumber));
}

// ---------------------------------------------------------------------------
// 5. generateShipmentCode
// ---------------------------------------------------------------------------

/**
 * Produce the next `SHP-XXXX` code, zero-padded to 4 digits.
 * Fills in gaps — if SHP-0001 and SHP-0003 exist, the next code is SHP-0002.
 */
export function generateShipmentCode(existingCodes: string[]): string {
  const usedNumbers = new Set(
    existingCodes
      .map((code) => {
        const match = code.match(/^SHP-(\d+)$/);
        return match ? parseInt(match[1], 10) : NaN;
      })
      .filter((n) => !Number.isNaN(n)),
  );

  let next = 1;
  while (usedNumbers.has(next)) {
    next++;
  }

  return `SHP-${String(next).padStart(4, "0")}`;
}
