import { getDbClient } from "@stockops/db";

export type ConflictRecord = {
  entityType: string;
  entityId: string;
  externalId: string;
  localUpdatedAt: Date;
  remoteUpdatedAt: Date;
  description: string;
};

export async function detectInvoiceConflicts(
  connectionId: string,
  remoteInvoices: Array<{ Id: string; DocNumber: string; MetaData: { LastUpdatedTime: string } }>,
): Promise<ConflictRecord[]> {
  const db = getDbClient();
  const connection = await db.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

  const lastSync = connection.lastSyncAt ?? new Date(0);
  const conflicts: ConflictRecord[] = [];

  const syncLogs = await db.accountingSyncLog.findMany({
    where: { connectionId, entityType: "invoice", status: "SUCCESS" },
  });
  const externalToLocal = new Map(syncLogs.map((s) => [s.externalId, s.entityId]));

  for (const remote of remoteInvoices) {
    const localId = externalToLocal.get(remote.Id);
    if (!localId) continue;

    const remoteUpdated = new Date(remote.MetaData.LastUpdatedTime);
    if (remoteUpdated <= lastSync) continue;

    const localInvoice = await db.invoice.findUnique({ where: { id: localId } });
    if (!localInvoice || localInvoice.updatedAt <= lastSync) continue;

    conflicts.push({
      entityType: "invoice",
      entityId: localId,
      externalId: remote.Id,
      localUpdatedAt: localInvoice.updatedAt,
      remoteUpdatedAt: remoteUpdated,
      description: `Invoice ${remote.DocNumber} modified in both StockOps and QuickBooks since ${lastSync.toISOString()}`,
    });

    await db.accountingSyncLog.create({
      data: {
        connectionId,
        direction: "PULL",
        entityType: "invoice",
        entityId: localId,
        externalId: remote.Id,
        status: "CONFLICT",
        error: `Modified in both systems since ${lastSync.toISOString()}`,
      },
    });
  }

  return conflicts;
}
