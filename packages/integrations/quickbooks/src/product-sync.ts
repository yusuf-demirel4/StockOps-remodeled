import { getDbClient } from "@stockops/db";
import { QuickBooksClient } from "./client";
import { toQBItem, fromQBItem } from "./mappers";
import type { QuickBooksTokens } from "./types";

export async function pushProductsToQuickBooks(connectionId: string, tokens: QuickBooksTokens) {
  const db = getDbClient();
  const connection = await db.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
    include: { organization: true },
  });

  const client = new QuickBooksClient(tokens);

  const products = await db.product.findMany({
    where: { organizationId: connection.organizationId, isActive: true },
  });

  const results: Array<{ productId: string; status: string; error?: string }> = [];

  for (const product of products) {
    try {
      const qbItem = toQBItem({
        sku: product.sku,
        name: product.name,
        description: product.description,
        unitPrice: Number(product.unitPrice),
        costPrice: product.costPrice ? Number(product.costPrice) : null,
      });

      const response = await client.createOrUpdateItem(qbItem);
      const qbItemId = response.Item?.Id;

      await db.accountingSyncLog.create({
        data: {
          connectionId,
          direction: "PUSH",
          entityType: "product",
          entityId: product.id,
          externalId: qbItemId,
          status: "SUCCESS",
        },
      });

      results.push({ productId: product.id, status: "success" });
    } catch (err) {
      await db.accountingSyncLog.create({
        data: {
          connectionId,
          direction: "PUSH",
          entityType: "product",
          entityId: product.id,
          status: "FAILED",
          error: (err as Error).message,
        },
      });
      results.push({ productId: product.id, status: "failed", error: (err as Error).message });
    }
  }

  return results;
}

export async function pullProductsFromQuickBooks(connectionId: string, tokens: QuickBooksTokens) {
  const db = getDbClient();
  const client = new QuickBooksClient(tokens);
  const { QueryResponse } = await client.queryItems();

  const results: Array<{ externalId: string; sku: string; status: string }> = [];

  for (const item of QueryResponse.Item ?? []) {
    const mapped = fromQBItem(item);

    await db.accountingSyncLog.create({
      data: {
        connectionId,
        direction: "PULL",
        entityType: "product",
        entityId: mapped.externalId,
        externalId: mapped.externalId,
        status: "SUCCESS",
      },
    });

    results.push({ externalId: mapped.externalId, sku: mapped.sku, status: "synced" });
  }

  return results;
}
