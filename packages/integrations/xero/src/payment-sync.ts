import { getDbClient } from "@stockops/db";
import { XeroClient } from "./client";
import { toXeroPayment, fromXeroPayment } from "./mappers";
import type { XeroTokens } from "./types";

export async function pushPaymentsToXero(connectionId: string, tokens: XeroTokens) {
  const db = getDbClient();
  const connection = await db.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
    include: { organization: true },
  });

  const client = new XeroClient(tokens);

  // Find payments not yet synced
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

    // Find the Xero invoice ID from sync logs
    const invoiceSync = await db.accountingSyncLog.findFirst({
      where: { connectionId, entityType: "invoice", entityId: payment.invoiceId, status: "SUCCESS" },
    });
    if (!invoiceSync?.externalId) {
      results.push({ paymentId: payment.id, status: "skipped", error: "Invoice not synced to Xero" });
      continue;
    }

    try {
      const xeroData = toXeroPayment({
        amount: Number(payment.amount),
        reference: payment.reference,
        paidAt: payment.paidAt,
        xeroInvoiceId: invoiceSync.externalId,
      });

      const response = await client.createPayment(xeroData);
      const xeroPaymentId = response.Payments?.[0]?.PaymentID;

      await db.accountingSyncLog.create({
        data: {
          connectionId,
          direction: "PUSH",
          entityType: "payment",
          entityId: payment.id,
          externalId: xeroPaymentId,
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

export async function pullPaymentsFromXero(connectionId: string, tokens: XeroTokens) {
  const db = getDbClient();
  const connection = await db.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

  const client = new XeroClient(tokens);
  const { Payments } = await client.getPayments(connection.lastSyncAt ?? undefined);

  const results: Array<{ externalId: string; status: string }> = [];

  for (const xeroPay of Payments) {
    const mapped = fromXeroPayment(xeroPay);

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
