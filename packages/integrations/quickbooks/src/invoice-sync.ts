import { getDbClient } from "@stockops/db";
import { QuickBooksClient } from "./client";
import { toQBInvoice, fromQBInvoice } from "./mappers";
import type { QuickBooksTokens } from "./types";

export async function pushInvoicesToQuickBooks(connectionId: string, tokens: QuickBooksTokens) {
  const db = getDbClient();
  const connection = await db.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
    include: { organization: true },
  });

  const client = new QuickBooksClient(tokens);

  const syncedIds = await db.accountingSyncLog.findMany({
    where: { connectionId, entityType: "invoice", status: "SUCCESS", direction: "PUSH" },
    select: { entityId: true },
  });
  const syncedIdSet = new Set(syncedIds.map((s) => s.entityId));

  const invoices = await db.invoice.findMany({
    where: { organizationId: connection.organizationId, status: { in: ["SENT", "PAID"] } },
    include: { lines: true, customer: true },
  });

  const results: Array<{ invoiceId: string; status: string; error?: string }> = [];

  for (const inv of invoices) {
    if (syncedIdSet.has(inv.id)) continue;

    try {
      const qbData = toQBInvoice({
        code: inv.code,
        customerName: inv.customer.name,
        issuedAt: inv.issuedAt,
        dueDate: inv.dueDate,
        lines: inv.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: Number(l.unitPrice),
          lineTotal: Number(l.lineTotal),
        })),
      });

      const response = await client.createInvoice(qbData);
      const qbInvoiceId = response.Invoice?.Id;

      await db.accountingSyncLog.create({
        data: {
          connectionId,
          direction: "PUSH",
          entityType: "invoice",
          entityId: inv.id,
          externalId: qbInvoiceId,
          status: "SUCCESS",
        },
      });

      results.push({ invoiceId: inv.id, status: "success" });
    } catch (err) {
      await db.accountingSyncLog.create({
        data: {
          connectionId,
          direction: "PUSH",
          entityType: "invoice",
          entityId: inv.id,
          status: "FAILED",
          error: (err as Error).message,
        },
      });
      results.push({ invoiceId: inv.id, status: "failed", error: (err as Error).message });
    }
  }

  await db.accountingConnection.update({
    where: { id: connectionId },
    data: { lastSyncAt: new Date() },
  });

  return results;
}

export async function pullInvoicesFromQuickBooks(connectionId: string, tokens: QuickBooksTokens) {
  const db = getDbClient();
  const connection = await db.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

  const client = new QuickBooksClient(tokens);
  const { QueryResponse } = await client.queryInvoices(connection.lastSyncAt ?? undefined);

  const results: Array<{ externalId: string; status: string }> = [];

  for (const qbInv of QueryResponse.Invoice ?? []) {
    const mapped = fromQBInvoice(qbInv);

    await db.accountingSyncLog.create({
      data: {
        connectionId,
        direction: "PULL",
        entityType: "invoice",
        entityId: mapped.externalId,
        externalId: mapped.externalId,
        status: "SUCCESS",
      },
    });

    results.push({ externalId: mapped.externalId, status: "synced" });
  }

  return results;
}
