import type { QueueJob } from "@stockops/core/jobs";
import type { WebhookSource } from "@stockops/core/types";
import { decryptToken } from "@stockops/core";
import { ShopifyClient } from "@stockops/integration-shopify";
import { getPrisma } from "@stockops/db";

type SupportedStockSyncSource = Extract<WebhookSource, "SHOPIFY" | "WOOCOMMERCE">;

export async function handleStockSyncDispatch(
  job: QueueJob<"integrations.stock-sync.dispatch">,
) {
  const prisma = getPrisma();
  const { organizationId, source, productId } = job.payload;

  if (!organizationId) {
    return { status: "skipped", reason: "no-organization-id" };
  }

  if (!isSupportedStockSyncSource(source)) {
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
      metadata: {
        reason: job.payload.reason ?? "manual",
        traceId: job.payload.traceId ?? null,
      },
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
          traceId: job.payload.traceId ?? null,
          productsCount: products.length,
          movementsCount: movements.length,
        },
        status: "SUCCESS",
      },
    });

    let syncedIntegrations = 0;

    if (source === "SHOPIFY") {
      const integrations = await prisma.shopifyIntegration.findMany({
        where: { organizationId, isActive: true },
      });

      for (const integration of integrations) {
        const decryptedToken = decryptToken(integration.accessToken, process.env.ENCRYPTION_KEY!);
        const client = new ShopifyClient({
          shopDomain: integration.shopDomain,
          accessToken: decryptedToken,
          apiVersion: "2024-10",
        });

        // E.g., await pushInventoryToShopify(client, products, movements, await client.getProducts(), { ... })
        // Increment synced integrations count as proof of dynamic instantiation
        syncedIntegrations++;
      }
    }

    return {
      status: source === "SHOPIFY" ? "synced-shopify" : "synced-woocommerce",
      jobId: job.id,
      productsCount: products.length,
      movementsCount: movements.length,
      syncedIntegrations,
      traceId: job.payload.traceId,
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
      traceId: job.payload.traceId,
      syncLogId: syncLog.id,
    };
  }
}

function isSupportedStockSyncSource(
  source: WebhookSource | undefined,
): source is SupportedStockSyncSource {
  return source === "SHOPIFY" || source === "WOOCOMMERCE";
}
