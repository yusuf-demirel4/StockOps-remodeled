import type { QueueJob } from "@stockops/core/jobs";
import { getPrisma } from "@stockops/db";

export async function handleStockSyncDispatch(
  job: QueueJob<"integrations.stock-sync.dispatch">,
) {
  const prisma = getPrisma();
  const { organizationId, source, productId } = job.payload;

  if (!organizationId) {
    return { status: "skipped", reason: "no-organization-id" };
  }

  if (!source || !["SHOPIFY", "WOOCOMMERCE", "TRENDYOL", "HEPSIBURADA", "PAZARAMA"].includes(source)) {
    return { status: "skipped", reason: "unknown-source" };
  }

  const syncLog = await prisma.integrationSyncLog.create({
    data: {
      organizationId,
      source,
      direction: "PUSH",
      entityType: productId ? "product" : "inventory",
      entityId: productId ?? null,
      status: "RUNNING",
      attempts: 1,
      startedAt: new Date(),
      metadata: { reason: job.payload.reason ?? "manual" },
    },
  });

  try {
    const products = await prisma.product.findMany({
      where: {
        organizationId,
        ...(productId ? { id: productId } : {}),
      },
      include: { variants: true },
    });

    const movements = await prisma.stockMovement.findMany({
      where: {
        organizationId,
        ...(productId ? { productId } : {}),
      },
    });

    await prisma.integrationSyncLog.update({
      where: { id: syncLog.id },
      data: {
        finishedAt: new Date(),
        metadata: {
          reason: job.payload.reason ?? "manual",
          productsCount: products.length,
          movementsCount: movements.length,
        },
        status: "SUCCESS",
      },
    });

    return {
      status: source === "SHOPIFY" ? "synced-shopify" : "synced-woocommerce",
      jobId: job.id,
      productsCount: products.length,
      movementsCount: movements.length,
      syncLogId: syncLog.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown stock sync error.";
    await prisma.integrationSyncLog.update({
      where: { id: syncLog.id },
      data: {
        error: message,
        finishedAt: new Date(),
        nextAttemptAt: new Date(Date.now() + 1000 * 60 * 10),
        status: "FAILED",
      },
    });
    return {
      status: "stock-sync-failed",
      jobId: job.id,
      reason: message,
      syncLogId: syncLog.id,
    };
  }
}
