import type {
  NotificationChannel,
  NotificationDelivery,
  StockRow,
} from "./types";

export type NotificationProviderConfig = {
  channel: NotificationChannel;
  provider?: string;
  recipient?: string;
};

export function buildLowStockNotificationMessage(row: StockRow) {
  return [
    "Low stock alert",
    `${row.product.sku} - ${row.product.name}`,
    `Warehouse: ${row.warehouse.code}`,
    `On hand: ${row.onHand}`,
    `Minimum: ${row.minimumStock}`,
  ].join(" | ");
}

export function createLowStockNotificationDrafts(
  rows: StockRow[],
  organizationId: string,
  config: NotificationProviderConfig,
): Omit<NotificationDelivery, "id" | "createdAt">[] {
  return rows
    .filter((row) => row.isCritical)
    .map((row) => ({
      channel: config.channel,
      message: buildLowStockNotificationMessage(row),
      organizationId,
      provider: config.provider ?? "console",
      reason: config.recipient ? "low-stock" : "missing-recipient",
      recipient: config.recipient,
      status: config.recipient ? "PENDING" : "SKIPPED",
    }));
}
