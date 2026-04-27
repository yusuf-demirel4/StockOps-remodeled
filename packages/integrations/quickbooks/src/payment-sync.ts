import { getDbClient } from "@stockops/db";
import { QuickBooksClient } from "./client";
import { toQBPayment, fromQBPayment } from "./mappers";
import type { QuickBooksTokens } from "./types";

export async function pushPaymentsToQuickBooks(connectionId: string, tokens: QuickBooksTokens) {
  const db = getDbClient();
  const connection = await db.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
    include: { organization: true },
  });

  const client = new QuickBooksClient(tokens);

  const syncedIds = await db.accountingSyncLog.findMany({
    where: { connectionId, entityType: "payment", status: "SUCCESS", direction: "PUSH" },
    select: { entityId: true },
  });
  const syncedIdSet = new Set(syncedIds.map((s) => s.entityId));

  const payments = await db.payment.findMany({
    where: { organizationId: connection.organizationId },
    include: { invoice: true },
  });

  const results: Array<{ paymentId: string; status: string; error?: string }> = [];

  for (const payment of payments) {
    if (syncedIdSet.has(payment.id)) continue;

    const invoiceSync = await db.accountingSyncLog.findFirst({
      where: { connectionId, entityType: "invoice", entityId: payment.invoiceId, status: "SUCCESS" },
    });
    if (!invoiceSync?.externalId) {
      results.push({ paymentId: payment.id, status: "skipped", error: "Invoice not synced" });
      continue;
    }

    try {
      const qbData = toQBPayment({
        amount: Number(payment.amount),
        reference: payment.reference,
        paidAt: payment.paidAt,
        qbInvoiceId: invoiceSync.externalId,
      });

      const response = await client.createPayment(qbData);
      const qbPaymentId = response.Payment?.Id;

      await db.accountingSyncLog.create({
        data: {
          connectionId,
          direction: "PUSH",
          entityType: "payment",
          entityId: payment.id,
          externalId: qbPaymentId,
          status: "SUCCESS",
        },
      });

      results.push({ paymentId: payment.id, status: "success" });
    } catch (err) {
      await db.accountingSyncLog.create({
        data: {
          connectionId,
          direction: "PUSH",
          entityType: "payment",
          entityId: payment.id,
          status: "FAILED",
          error: (err as Error).message,
        },
      });
      results.push({ paymentId: payment.id, status: "failed", error: (err as Error).message });
    }
  }

  return results;
}

export async function pullPaymentsFromQuickBooks(connectionId: string, tokens: QuickBooksTokens) {
  const db = getDbClient();
  const connection = await db.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

  const client = new QuickBooksClient(tokens);
  const { QueryResponse } = await client.queryPayments(connection.lastSyncAt ?? undefined);

  const results: Array<{ externalId: string; status: string }> = [];

  for (const qbPay of QueryResponse.Payment ?? []) {
    const mapped = fromQBPayment(qbPay);

    await db.accountingSyncLog.create({
      data: {
        connectionId,
        direction: "PULL",
        entityType: "payment",
        entityId: mapped.externalId,
        externalId: mapped.externalId,
        status: "SUCCESS",
      },
    });

    results.push({ externalId: mapped.externalId, status: "synced" });
  }

  return results;
}
