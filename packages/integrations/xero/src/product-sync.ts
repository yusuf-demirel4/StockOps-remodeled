import { getDbClient } from "@stockops/db";
import { XeroClient } from "./client";
import { toXeroItem, fromXeroItem } from "./mappers";
import type { XeroTokens } from "./types";

export async function pushProductsToXero(connectionId: string, tokens: XeroTokens) {
  const db = getDbClient();
  const connection = await db.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
    include: { organization: true },
  });

  const client = new XeroClient(tokens);

  const products = await db.product.findMany({
    where: { organizationId: connection.organizationId, isActive: true },
  });

  const results: Array<{ productId: string; status: string; error?: string }> = [];

  for (const product of products) {
    try {
      const xeroItem = toXeroItem({
        sku: product.sku,
        name: product.name,
        description: product.description,
        unitPrice: Number(product.unitPrice),
        costPrice: product.costPrice ? Number(product.costPrice) : null,
      });

      const response = await client.createOrUpdateItem(xeroItem);
      const xeroItemId = response.Items?.[0]?.ItemID;

      await db.accountingSyncLog.create({
        data: {
          connectionId,
          direction: "PUSH",
          entityType: "product",
          entityId: product.id,
          externalId: xeroItemId,
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

export async function pullProductsFromXero(connectionId: string, tokens: XeroTokens) {
  const db = getDbClient();
  const client = new XeroClient(tokens);
  const { Items } = await client.getItems();

  const results: Array<{ externalId: string; sku: string; status: string }> = [];

  for (const item of Items) {
    const mapped = fromXeroItem(item);

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
