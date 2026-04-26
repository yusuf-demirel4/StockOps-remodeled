import { buildStockRows } from "@stockops/core/inventory";
import { createLowStockNotificationDrafts } from "@stockops/core/notifications";
import type { QueueJob } from "@stockops/core/jobs";
import type { NotificationChannel } from "@stockops/core/types";
import { getPrisma } from "@stockops/db";

type NotificationProvider = {
  channel: NotificationChannel;
  mode: "dry-run" | "database";
  provider: string;
  recipient?: string;
};

export async function handleLowStockNotificationDispatch(
  job: QueueJob<"notifications.low-stock.dispatch">,
) {
  const provider = resolveProvider(job.payload.channel ?? "SMS");

  if (process.env.APP_DATA_SOURCE !== "database") {
    return {
      channel: provider.channel,
      jobId: job.id,
      mode: "dry-run",
      provider: provider.provider,
      status: "notification-dispatched",
    };
  }

  const prisma = getPrisma();
  const organizationId =
    job.payload.organizationId ??
    (await prisma.organization.findFirst({ select: { id: true } }))?.id;

  if (!organizationId) {
    return {
      channel: provider.channel,
      jobId: job.id,
      mode: "database",
      provider: provider.provider,
      status: "notification-skipped",
      reason: "organization-not-found",
    };
  }

  const [warehouses, products, movements] = await Promise.all([
    prisma.warehouse.findMany({ where: { organizationId } }),
    prisma.product.findMany({ where: { organizationId, isActive: true } }),
    prisma.stockMovement.findMany({ where: { organizationId } }),
  ]);
  const rows = buildStockRows(
    products.map((product) => ({
      barcode: product.barcode ?? undefined,
      category: product.category,
      description: product.description ?? undefined,
      id: product.id,
      isActive: product.isActive,
      minimumStock: product.minimumStock,
      name: product.name,
      organizationId: product.organizationId,
      sku: product.sku,
    })),
    warehouses.map((warehouse) => ({
      code: warehouse.code,
      id: warehouse.id,
      isDefault: warehouse.isDefault,
      name: warehouse.name,
      organizationId: warehouse.organizationId,
    })),
    movements.map((movement) => ({
      createdAt: movement.createdAt.toISOString(),
      createdById: movement.createdById ?? undefined,
      id: movement.id,
      note: movement.note ?? undefined,
      organizationId: movement.organizationId,
      productId: movement.productId,
      quantityChange: movement.quantityChange,
      reference: movement.reference ?? undefined,
      type: movement.type,
      warehouseId: movement.warehouseId,
    })),
  );
  const drafts = createLowStockNotificationDrafts(
    rows,
    organizationId,
    provider,
  );

  if (drafts.length === 0) {
    return {
      channel: provider.channel,
      jobId: job.id,
      mode: "database",
      provider: provider.provider,
      status: "notification-skipped",
      reason: "no-critical-stock",
    };
  }

  await prisma.notificationDelivery.createMany({
    data: drafts.map((draft) => ({
      channel: draft.channel,
      error: draft.error ?? null,
      message: draft.message,
      organizationId: draft.organizationId,
      provider: draft.provider,
      reason: draft.reason ?? null,
      recipient: draft.recipient ?? null,
      sentAt: draft.status === "PENDING" ? new Date() : null,
      status: draft.status === "PENDING" ? "SENT" : draft.status,
    })),
  });

  return {
    channel: provider.channel,
    deliveries: drafts.length,
    jobId: job.id,
    mode: "database",
    provider: provider.provider,
    status: "notification-dispatched",
  };
}

export async function handleOrderStatusNotificationDispatch(
  job: QueueJob<"notifications.order-status.dispatch">,
) {
  const provider = resolveProvider(job.payload.channel ?? "WHATSAPP");

  return {
    channel: provider.channel,
    jobId: job.id,
    mode:
      process.env.APP_DATA_SOURCE === "database" ? "database" : "dry-run",
    provider: provider.provider,
    status: "order-status-notification-ready",
  };
}

function resolveProvider(channel: NotificationChannel): NotificationProvider {
  const provider = process.env.NOTIFICATION_PROVIDER ?? "console";
  const recipient =
    channel === "SMS"
      ? process.env.SMS_NOTIFICATION_RECIPIENT
      : process.env.WHATSAPP_NOTIFICATION_RECIPIENT;

  return {
    channel,
    mode: process.env.APP_DATA_SOURCE === "database" ? "database" : "dry-run",
    provider,
    recipient,
  };
}
