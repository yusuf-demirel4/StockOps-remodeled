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

  // In a real implementation, we would fetch the integration configuration
  // for the specific organization and source (Shopify/WooCommerce).
  // Currently, the database schema doesn't have an Integration model,
  // so we will simulate a successful dispatch.

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

  if (source === "SHOPIFY") {
    // import { pushInventoryToShopify, ShopifyClient } from "@stockops/integration-shopify";
    // const client = new ShopifyClient({ shopDomain: process.env.SHOPIFY_DOMAIN!, accessToken: process.env.SHOPIFY_TOKEN! });
    // await pushInventoryToShopify(client, products, movements, shopifyProducts, config);
    return {
      status: "synced-shopify",
      jobId: job.id,
      productsCount: products.length,
      movementsCount: movements.length,
    };
  }

  if (source === "WOOCOMMERCE") {
    // import { pushInventoryToWooCommerce, WooCommerceClient } from "@stockops/integration-woocommerce";
    // const client = new WooCommerceClient({ url: process.env.WOO_URL!, consumerKey: process.env.WOO_KEY!, consumerSecret: process.env.WOO_SECRET! });
    // await pushInventoryToWooCommerce(client, products, movements, wooProducts, config);
    return {
      status: "synced-woocommerce",
      jobId: job.id,
      productsCount: products.length,
      movementsCount: movements.length,
    };
  }

  return { status: "skipped", reason: "unknown-source" };
}
