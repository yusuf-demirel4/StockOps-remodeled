import type { JobName, QueueJob } from "@stockops/core/jobs";
import { getPrisma } from "@stockops/db";
import {
  pullInvoicesFromQuickBooks,
  pushInvoicesToQuickBooks,
} from "@stockops/integration-quickbooks/invoice-sync";
import {
  pullPaymentsFromQuickBooks,
  pushPaymentsToQuickBooks,
} from "@stockops/integration-quickbooks/payment-sync";
import {
  pullInvoicesFromXero,
  pushInvoicesToXero,
} from "@stockops/integration-xero/invoice-sync";
import {
  pullPaymentsFromXero,
  pushPaymentsToXero,
} from "@stockops/integration-xero/payment-sync";

const MAX_ACCOUNTING_ATTEMPTS = 5;
const RETRY_DELAY_MS = 1000 * 60 * 10;

type AccountingJobName = Extract<
  JobName,
  | "xero.invoice.sync"
  | "xero.payment.sync"
  | "quickbooks.invoice.sync"
  | "quickbooks.payment.sync"
>;

export async function handleAccountingSyncDispatch(
  job: QueueJob<AccountingJobName>,
) {
  const prisma = getPrisma();
  const connection = await prisma.accountingConnection.findFirst({
    where: {
      id: job.payload.connectionId,
      organizationId: job.payload.organizationId,
      isActive: true,
    },
  });

  if (!connection) {
    return {
      status: "accounting-sync-skipped",
      jobId: job.id,
      reason: "connection-not-found-or-inactive",
    };
  }

  const syncLog =
    job.payload.syncLogId
      ? await prisma.accountingSyncLog.findFirst({
          where: {
            id: job.payload.syncLogId,
            connectionId: connection.id,
          },
        })
      : await prisma.accountingSyncLog.create({
          data: {
            connectionId: connection.id,
            direction: directionFor(job),
            entityType: entityTypeFor(job),
            entityId: connection.id,
            status: "QUEUED",
          },
        });

  if (!syncLog) {
    return {
      status: "accounting-sync-skipped",
      jobId: job.id,
      reason: "sync-log-not-found",
    };
  }

  const attempt = syncLog.attempts + 1;
  await prisma.accountingSyncLog.update({
    where: { id: syncLog.id },
    data: {
      attempts: { increment: 1 },
      error: null,
      nextAttemptAt: null,
      startedAt: new Date(),
      status: "RUNNING",
    },
  });

  try {
    const results = await runAccountingSync(job, connection);
    await prisma.accountingSyncLog.update({
      where: { id: syncLog.id },
      data: {
        error: null,
        finishedAt: new Date(),
        metadata: { resultCount: results.length, results },
        resolvedAt: new Date(),
        status: "SUCCESS",
      },
    });
    await prisma.accountingConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    return {
      status: "accounting-sync-completed",
      jobId: job.id,
      provider: connection.provider,
      entityType: syncLog.entityType,
      resultCount: results.length,
      syncLogId: syncLog.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown accounting sync error.";
    const deadLetter = attempt >= (syncLog.maxAttempts || MAX_ACCOUNTING_ATTEMPTS);
    await prisma.accountingSyncLog.update({
      where: { id: syncLog.id },
      data: {
        error: message,
        finishedAt: new Date(),
        nextAttemptAt: deadLetter
          ? null
          : new Date(Date.now() + RETRY_DELAY_MS),
        status: deadLetter ? "DEAD_LETTER" : "FAILED",
      },
    });

    return {
      status: deadLetter
        ? "accounting-sync-dead-lettered"
        : "accounting-sync-failed",
      jobId: job.id,
      reason: message,
      syncLogId: syncLog.id,
    };
  }
}

async function runAccountingSync(
  job: QueueJob<AccountingJobName>,
  connection: {
    id: string;
    accessToken: string;
    refreshToken: string;
    tenantId: string;
    tokenExpiresAt: Date;
  },
) {
  const direction = job.payload.direction ?? "push";

  if (job.name === "xero.invoice.sync") {
    return direction === "pull"
      ? pullInvoicesFromXero(connection.id, xeroTokens(connection))
      : pushInvoicesToXero(connection.id, xeroTokens(connection));
  }
  if (job.name === "xero.payment.sync") {
    return direction === "pull"
      ? pullPaymentsFromXero(connection.id, xeroTokens(connection))
      : pushPaymentsToXero(connection.id, xeroTokens(connection));
  }
  if (job.name === "quickbooks.invoice.sync") {
    return direction === "pull"
      ? pullInvoicesFromQuickBooks(connection.id, quickBooksTokens(connection))
      : pushInvoicesToQuickBooks(connection.id, quickBooksTokens(connection));
  }
  if (job.name === "quickbooks.payment.sync") {
    return direction === "pull"
      ? pullPaymentsFromQuickBooks(connection.id, quickBooksTokens(connection))
      : pushPaymentsToQuickBooks(connection.id, quickBooksTokens(connection));
  }

  return [];
}

function directionFor(job: QueueJob<AccountingJobName>): "PULL" | "PUSH" {
  return job.payload.direction === "pull" ? "PULL" : "PUSH";
}

function entityTypeFor(job: QueueJob<AccountingJobName>) {
  return job.name.includes(".payment.") ? "payment" : "invoice";
}

function xeroTokens(connection: {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  tokenExpiresAt: Date;
}) {
  return {
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken,
    tenantId: connection.tenantId,
    expiresAt: connection.tokenExpiresAt,
  };
}

function quickBooksTokens(connection: {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  tokenExpiresAt: Date;
}) {
  return {
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken,
    realmId: connection.tenantId,
    expiresAt: connection.tokenExpiresAt,
  };
}
