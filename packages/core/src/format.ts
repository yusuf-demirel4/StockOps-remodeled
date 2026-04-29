import type {
  ManufacturingOrderStatus,
  Product,
  PurchaseOrderStatus,
  SalesOrderStatus,
  StockMovementType,
  Supplier,
  Warehouse,
} from "./types";

export const numberFormatter = new Intl.NumberFormat("tr-TR");

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function productName(products: Product[], productId: string) {
  return products.find((product) => product.id === productId)?.name ?? productId;
}

export function productSku(products: Product[], productId: string) {
  return products.find((product) => product.id === productId)?.sku ?? productId;
}

export function warehouseName(warehouses: Warehouse[], warehouseId: string) {
  return (
    warehouses.find((warehouse) => warehouse.id === warehouseId)?.name ??
    warehouseId
  );
}

export function supplierName(suppliers: Supplier[], supplierId: string) {
  return (
    suppliers.find((supplier) => supplier.id === supplierId)?.name ?? supplierId
  );
}

export function movementLabel(type: StockMovementType) {
  const labels: Record<StockMovementType, string> = {
    INBOUND: "Giriş",
    OUTBOUND: "Çıkış",
    ADJUSTMENT: "Düzeltme",
    SALE: "Satış",
    PURCHASE_RECEIPT: "Satın alma teslimi",
    TRANSFER: "Transfer",
    MANUFACTURE_CONSUME: "Üretim tüketim",
    MANUFACTURE_PRODUCE: "Üretim çıktı",
  };

  return labels[type];
}

export function manufacturingStatusLabel(status: ManufacturingOrderStatus) {
  const labels: Record<ManufacturingOrderStatus, string> = {
    DRAFT: "Taslak",
    IN_PROGRESS: "Üretimde",
    COMPLETED: "Tamamlandı",
    CANCELLED: "İptal",
  };

  return labels[status];
}

export function salesStatusLabel(status: SalesOrderStatus) {
  const labels: Record<SalesOrderStatus, string> = {
    DRAFT: "Taslak",
    CONFIRMED: "Onaylandı",
    PICKING: "Toplanıyor",
    PACKED: "Paketlendi",
    SHIPPED: "Kargoda",
    DELIVERED: "Teslim Edildi",
    CANCELLED: "İptal",
  };

  return labels[status];
}

export function purchaseStatusLabel(status: PurchaseOrderStatus) {
  const labels: Record<PurchaseOrderStatus, string> = {
    DRAFT: "Taslak",
    SENT: "Gönderildi",
    PARTIALLY_RECEIVED: "Kısmi teslim",
    COMPLETED: "Tamamlandı",
    CANCELLED: "İptal",
  };

  return labels[status];
}
