import type { Product } from "./types";

export function scannedValueCandidates(rawValue: string) {
  const trimmed = rawValue.trim();
  const candidates = new Set<string>();

  if (!trimmed) {
    return [];
  }

  candidates.add(trimmed);

  for (const prefix of ["sku:", "barcode:", "product:", "product_id:"]) {
    if (trimmed.toLowerCase().startsWith(prefix)) {
      candidates.add(trimmed.slice(prefix.length).trim());
    }
  }

  try {
    const url = new URL(trimmed);
    for (const key of ["sku", "barcode", "productId", "product_id", "id"]) {
      const value = url.searchParams.get(key);

      if (value) {
        candidates.add(value);
      }
    }

    const lastPathSegment = url.pathname.split("/").filter(Boolean).at(-1);

    if (lastPathSegment) {
      candidates.add(decodeURIComponent(lastPathSegment));
    }
  } catch {
    // Plain barcode/SKU values are expected and are handled above.
  }

  return Array.from(candidates)
    .map((candidate) => candidate.trim())
    .filter(Boolean);
}

export function findProductByScannedValue(
  products: Product[],
  rawValue: string,
) {
  const candidates = new Set(
    scannedValueCandidates(rawValue).map(normalizeIdentifier),
  );

  if (candidates.size === 0) {
    return undefined;
  }

  return products.find((product) =>
    [product.id, product.sku, product.barcode]
      .filter(Boolean)
      .some((value) => candidates.has(normalizeIdentifier(value))),
  );
}

function normalizeIdentifier(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}
