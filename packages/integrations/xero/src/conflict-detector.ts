import { getDbClient } from "@stockops/db";

export type ConflictRecord = {
  entityType: string;
  entityId: string;
  externalId: string;
  localUpdatedAt: Date;
  remoteUpdatedAt: Date;
  description: string;
};

/**
 * Detect invoices modified in both StockOps and Xero since last sync.
 * Returns conflicts that need manual resolution.
 */
export async function detectInvoiceConflicts(
  connectionId: string,
  remoteInvoices: Array<{ invoiceID: string; invoiceNumber: string; updatedDateUTC: string }>,
): Promise<ConflictRecord[]> {
  const db = getDbClient();
  const connection = await db.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

  const lastSync = connection.lastSyncAt ?? new Date(0);
  const conflicts: ConflictRecord[] = [];

  // Get sync logs that map local to external IDs
  const syncLogs = await db.accountingSyncLog.findMany({
    where: { connectionId, entityType: "invoice", status: "SUCCESS" },
  });
  const externalToLocal = new Map(syncLogs.map((s) => [s.externalId, s.entityId]));

  for (const remote of remoteInvoices) {
    const localId = externalToLocal.get(remote.invoiceID);
    if (!localId) continue;

    const remoteUpdated = new Date(remote.updatedDateUTC);
    if (remoteUpdated <= lastSync) continue;

    // Check if local invoice was also modified since last sync
    const localInvoice = await db.invoice.findUnique({ where: { id: localId } });
    if (!localInvoice || localInvoice.updatedAt <= lastSync) continue;

    // Both sides modified — conflict
    conflicts.push({
      entityType: "invoice",
      entityId: localId,
      externalId: remote.invoiceID,
      localUpdatedAt: localInvoice.updatedAt,
      remoteUpdatedAt: remoteUpdated,
      description: `Invoice ${remote.invoiceNumber} modified in both StockOps and Xero since ${lastSync.toISOString()}`,
    });

    await db.accountingSyncLog.create({
      data: {
        connectionId,
        direction: "PULL",
        entityType: "invoice",
        entityId: localId,
        externalId: remote.invoiceID,
        status: "CONFLICT",
        error: `Modified in both systems since ${lastSync.toISOString()}`,
      },
    });
  }

  return conflicts;
}
