import { getDbClient } from "@stockops/db";
import { XeroClient } from "./client";
import { toXeroInvoice, fromXeroInvoice } from "./mappers";
import type { XeroTokens } from "./types";

export async function pushInvoicesToXero(connectionId: string, tokens: XeroTokens) {
  const db = getDbClient();
  const connection = await db.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
    include: { organization: true },
  });

  const client = new XeroClient(tokens);

  // Find invoices not yet synced
  const syncedIds = await db.accountingSyncLog.findMany({
    where: { connectionId, entityType: "invoice", status: "SUCCESS" },
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
      const xeroData = toXeroInvoice({
        code: inv.code,
        customerName: inv.customer.name,
        issuedAt: inv.issuedAt,
        dueDate: inv.dueDate,
        currency: inv.currency,
        lines: inv.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: Number(l.unitPrice),
          lineTotal: Number(l.lineTotal),
        })),
      });

      const response = await client.createInvoice(xeroData);
      const xeroInvoiceId = response.Invoices?.[0]?.InvoiceID;

      await db.accountingSyncLog.create({
        data: {
          connectionId,
          direction: "PUSH",
          entityType: "invoice",
          entityId: inv.id,
          externalId: xeroInvoiceId,
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

export async function pullInvoicesFromXero(connectionId: string, tokens: XeroTokens) {
  const db = getDbClient();
  const connection = await db.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

  const client = new XeroClient(tokens);
  const { Invoices } = await client.getInvoices(connection.lastSyncAt ?? undefined);

  const results: Array<{ externalId: string; status: string }> = [];

  for (const xeroInv of Invoices) {
    const mapped = fromXeroInvoice(xeroInv);

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
