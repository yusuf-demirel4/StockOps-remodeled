import { describe, expect, it } from "vitest";
import { createInitialState } from "./demo-data";
import {
  findProductByScannedValue,
  scannedValueCandidates,
} from "./barcode";

describe("barcode product lookup", () => {
  const products = createInitialState().products;

  it("matches by barcode, SKU, and product id", () => {
    expect(findProductByScannedValue(products, "8690000000011")?.id).toBe(
      "prd_kbd_mx",
    );
    expect(findProductByScannedValue(products, "kbd-mx-001")?.id).toBe(
      "prd_kbd_mx",
    );
    expect(findProductByScannedValue(products, "prd_kbd_mx")?.sku).toBe(
      "KBD-MX-001",
    );
  });

  it("extracts identifiers from QR-style values and URLs", () => {
    expect(scannedValueCandidates("sku: KBD-MX-001")).toContain("KBD-MX-001");
    expect(
      findProductByScannedValue(
        products,
        "https://stockops.example/products/view?barcode=8690000000035",
      )?.id,
    ).toBe("prd_monitor_27");
    expect(
      findProductByScannedValue(
        products,
        "https://stockops.example/products/KBD-MX-001",
      )?.id,
    ).toBe("prd_kbd_mx");
  });
});
