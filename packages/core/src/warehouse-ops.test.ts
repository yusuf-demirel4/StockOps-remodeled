import { describe, expect, it } from "vitest";
import {
  buildTrackingUrl,
  calculatePickProgress,
  canTransitionOrderStatus,
  generatePickList,
  generateShipmentCode,
} from "./warehouse-ops";
import type { PickListItem, SalesOrderStatus } from "./types";

// ---------------------------------------------------------------------------
// generatePickList
// ---------------------------------------------------------------------------

describe("generatePickList", () => {
  it("returns a valid draft for a normal order", () => {
    const draft = generatePickList({
      salesOrderId: "so_1",
      warehouseId: "wh_main",
      items: [
        { productId: "prd_1", quantity: 5, binLocation: "A-03-02" },
        { productId: "prd_2", quantity: 3 },
      ],
    });

    expect(draft.salesOrderId).toBe("so_1");
    expect(draft.warehouseId).toBe("wh_main");
    expect(draft.status).toBe("PENDING");
    expect(draft.priority).toBe(0);
    expect(draft.items).toHaveLength(2);
    expect(draft.items[0].pickedQty).toBe(0);
    expect(draft.items[0].binLocation).toBe("A-03-02");
    expect(draft.items[1].binLocation).toBeUndefined();
  });

  it("propagates salesOrderId to every item", () => {
    const draft = generatePickList({
      salesOrderId: "so_42",
      warehouseId: "wh_1",
      items: [{ productId: "prd_a", quantity: 1 }],
    });

    expect(draft.items[0].salesOrderId).toBe("so_42");
  });

  it("throws on empty items array", () => {
    expect(() =>
      generatePickList({
        salesOrderId: "so_1",
        warehouseId: "wh_1",
        items: [],
      }),
    ).toThrow("Pick list must contain at least one item");
  });

  it("throws on duplicate productIds", () => {
    expect(() =>
      generatePickList({
        salesOrderId: "so_1",
        warehouseId: "wh_1",
        items: [
          { productId: "prd_dup", quantity: 2 },
          { productId: "prd_dup", quantity: 3 },
        ],
      }),
    ).toThrow("Duplicate productId in pick list: prd_dup");
  });
});

// ---------------------------------------------------------------------------
// calculatePickProgress
// ---------------------------------------------------------------------------

describe("calculatePickProgress", () => {
  const makeItem = (quantity: number, pickedQty: number): PickListItem => ({
    id: "item_1",
    pickListId: "pl_1",
    salesOrderId: "so_1",
    productId: "prd_1",
    quantity,
    pickedQty,
  });

  it("returns 0% for an empty array", () => {
    const result = calculatePickProgress([]);
    expect(result.total).toBe(0);
    expect(result.picked).toBe(0);
    expect(result.percentComplete).toBe(0);
  });

  it("calculates partial progress correctly", () => {
    const items: PickListItem[] = [
      makeItem(10, 3),
      makeItem(6, 6),
    ];
    const result = calculatePickProgress(items);

    expect(result.total).toBe(16);
    expect(result.picked).toBe(9);
    // 9/16 = 56.25% → rounds to 56
    expect(result.percentComplete).toBe(56);
  });

  it("returns 100% when fully picked", () => {
    const items: PickListItem[] = [makeItem(5, 5), makeItem(10, 10)];
    const result = calculatePickProgress(items);

    expect(result.total).toBe(15);
    expect(result.picked).toBe(15);
    expect(result.percentComplete).toBe(100);
  });

  it("returns 0% when nothing is picked yet", () => {
    const result = calculatePickProgress([makeItem(10, 0), makeItem(20, 0)]);
    expect(result.percentComplete).toBe(0);
  });

  it("rounds correctly at boundary values", () => {
    // 1/3 = 33.333...% → 33
    const result = calculatePickProgress([makeItem(3, 1)]);
    expect(result.percentComplete).toBe(33);
  });
});

// ---------------------------------------------------------------------------
// canTransitionOrderStatus
// ---------------------------------------------------------------------------

describe("canTransitionOrderStatus", () => {
  const validTransitions: [SalesOrderStatus, SalesOrderStatus][] = [
    ["CONFIRMED", "PICKING"],
    ["PICKING", "PACKED"],
    ["PACKED", "SHIPPED"],
    ["SHIPPED", "DELIVERED"],
  ];

  it.each(validTransitions)("allows %s → %s", (from, to) => {
    expect(canTransitionOrderStatus(from, to)).toBe(true);
  });

  it("blocks DRAFT → PICKING (must confirm first)", () => {
    expect(canTransitionOrderStatus("DRAFT", "PICKING")).toBe(false);
  });

  it("blocks reverse transitions", () => {
    expect(canTransitionOrderStatus("PACKED", "PICKING")).toBe(false);
    expect(canTransitionOrderStatus("DELIVERED", "SHIPPED")).toBe(false);
  });

  it("blocks skipping steps", () => {
    expect(canTransitionOrderStatus("CONFIRMED", "SHIPPED")).toBe(false);
    expect(canTransitionOrderStatus("PICKING", "DELIVERED")).toBe(false);
  });

  it("blocks transitions from CANCELLED", () => {
    expect(canTransitionOrderStatus("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransitionOrderStatus("CANCELLED", "PICKING")).toBe(false);
  });

  it("blocks transitions from DELIVERED", () => {
    expect(canTransitionOrderStatus("DELIVERED", "SHIPPED")).toBe(false);
    expect(canTransitionOrderStatus("DELIVERED", "CANCELLED")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildTrackingUrl
// ---------------------------------------------------------------------------

describe("buildTrackingUrl", () => {
  it("builds Yurtici Kargo URL", () => {
    const url = buildTrackingUrl("yurtici", "TR12345");
    expect(url).toBe(
      "https://www.yurticikargo.com/tr/online-islemler/gonderi-sorgula?code=TR12345",
    );
  });

  it("builds Aras Kargo URL", () => {
    const url = buildTrackingUrl("aras", "AR99887");
    expect(url).toBe("https://kargotakip.araskargo.com.tr/..?barcode=AR99887");
  });

  it("builds MNG Kargo URL", () => {
    const url = buildTrackingUrl("mng", "MN-555");
    expect(url).toBe("https://www.mngkargo.com.tr/..?id=MN-555");
  });

  it("builds PTT Kargo URL", () => {
    const url = buildTrackingUrl("ptt", "PT000111");
    expect(url).toBe(
      "https://gonderitakip.ptt.gov.tr/Track/Verify?q=PT000111",
    );
  });

  it("is case-insensitive for carrier names", () => {
    expect(buildTrackingUrl("YURTICI", "X")).toBe(
      buildTrackingUrl("yurtici", "X"),
    );
    expect(buildTrackingUrl("Aras", "X")).toBe(
      buildTrackingUrl("aras", "X"),
    );
  });

  it("returns null for unknown carriers", () => {
    expect(buildTrackingUrl("fedex", "123")).toBeNull();
    expect(buildTrackingUrl("ups", "456")).toBeNull();
    expect(buildTrackingUrl("", "789")).toBeNull();
  });

  it("encodes special characters in tracking number", () => {
    const url = buildTrackingUrl("ptt", "TR 123&456");
    expect(url).toContain("TR%20123%26456");
  });
});

// ---------------------------------------------------------------------------
// generateShipmentCode
// ---------------------------------------------------------------------------

describe("generateShipmentCode", () => {
  it("returns SHP-0001 for an empty list", () => {
    expect(generateShipmentCode([])).toBe("SHP-0001");
  });

  it("returns the next sequential code", () => {
    expect(generateShipmentCode(["SHP-0001", "SHP-0002"])).toBe("SHP-0003");
  });

  it("fills gaps in existing codes", () => {
    expect(generateShipmentCode(["SHP-0001", "SHP-0003"])).toBe("SHP-0002");
  });

  it("fills the first gap when multiple gaps exist", () => {
    expect(
      generateShipmentCode(["SHP-0002", "SHP-0005", "SHP-0007"]),
    ).toBe("SHP-0001");
  });

  it("handles large numbers and pads correctly", () => {
    const codes = Array.from({ length: 15 }, (_, i) => `SHP-${String(i + 1).padStart(4, "0")}`);
    expect(generateShipmentCode(codes)).toBe("SHP-0016");
  });

  it("ignores malformed codes", () => {
    expect(
      generateShipmentCode(["SHP-0001", "SHIP-0002", "SHP-ABC", "SHP-0003"]),
    ).toBe("SHP-0002");
  });
});
