import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { getDbClient } from "@stockops/db";
import { XeroClient } from "@stockops/integration-xero/client";
import { QuickBooksClient } from "@stockops/integration-quickbooks/client";
import type { AuthContext } from "@stockops/core/types";
import type { AccountingSyncPayload, WebhookReceivedJobName } from "@stockops/core/jobs";
import type { Response } from "express";
import { publishJob } from "@stockops/queue";

import { ApiTokenSecurity } from "../openapi/decorators";
import { ApiAuthGuard } from "../auth/api-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";

@ApiTags("Accounting Integrations")
@ApiTokenSecurity()
@Controller("integrations")
@UseGuards(ApiAuthGuard)
export class AccountingController {
  // ── Xero ──

  @Get("xero/connect")
  @ApiOperation({ summary: "Start Xero OAuth flow." })
  xeroConnect(@Res() res: Response) {
    const clientId = process.env.XERO_CLIENT_ID ?? "";
    const redirectUri = process.env.XERO_CALLBACK_URL ?? "";
    const url = XeroClient.getAuthUrl(clientId, redirectUri, "xero-connect");
    res.redirect(url);
  }

  @Get("xero/callback")
  @ApiOperation({ summary: "Xero OAuth callback." })
  async xeroCallback(
    @Query("code") code: string,
    @CurrentAuth() ctx: AuthContext,
    @Res() res: Response,
  ) {
    try {
      const tokens = await XeroClient.exchangeCode(code);
      const db = getDbClient();

      await db.accountingConnection.upsert({
        where: {
          organizationId_provider: {
            organizationId: ctx.organization.id,
            provider: "XERO",
          },
        },
        create: {
          organizationId: ctx.organization.id,
          provider: "XERO",
          tenantId: tokens.tenantId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
        },
        update: {
          tenantId: tokens.tenantId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          isActive: true,
        },
      });

      const webOrigin = process.env.API_CORS_ORIGIN ?? "http://localhost:3000";
      res.redirect(`${webOrigin}/settings/integrations?connected=xero`);
    } catch {
      const webOrigin = process.env.API_CORS_ORIGIN ?? "http://localhost:3000";
      res.redirect(`${webOrigin}/settings/integrations?error=xero_failed`);
    }
  }

  @Post("xero/sync/invoices")
  @ApiOperation({ summary: "Trigger Xero invoice sync." })
  async xeroSyncInvoices(@CurrentAuth() ctx: AuthContext) {
    return this.triggerSync(ctx.organization.id, "XERO", "invoice", "push");
  }

  @Post("xero/sync/payments")
  @ApiOperation({ summary: "Trigger Xero payment sync." })
  async xeroSyncPayments(@CurrentAuth() ctx: AuthContext) {
    return this.triggerSync(ctx.organization.id, "XERO", "payment", "push");
  }

  @Get("xero/status")
  @ApiOperation({ summary: "Get Xero connection status." })
  async xeroStatus(@CurrentAuth() ctx: AuthContext) {
    return this.getConnectionStatus(ctx.organization.id, "XERO");
  }

  // ── QuickBooks ──

  @Get("quickbooks/connect")
  @ApiOperation({ summary: "Start QuickBooks OAuth flow." })
  quickbooksConnect(@Res() res: Response) {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID ?? "";
    const redirectUri = process.env.QUICKBOOKS_CALLBACK_URL ?? "";
    const url = QuickBooksClient.getAuthUrl(clientId, redirectUri, "qb-connect");
    res.redirect(url);
  }

  @Get("quickbooks/callback")
  @ApiOperation({ summary: "QuickBooks OAuth callback." })
  async quickbooksCallback(
    @Query("code") code: string,
    @Query("realmId") realmId: string,
    @CurrentAuth() ctx: AuthContext,
    @Res() res: Response,
  ) {
    try {
      const tokens = await QuickBooksClient.exchangeCode(code, realmId);
      const db = getDbClient();

      await db.accountingConnection.upsert({
        where: {
          organizationId_provider: {
            organizationId: ctx.organization.id,
            provider: "QUICKBOOKS",
          },
        },
        create: {
          organizationId: ctx.organization.id,
          provider: "QUICKBOOKS",
          tenantId: realmId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
        },
        update: {
          tenantId: realmId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          isActive: true,
        },
      });

      const webOrigin = process.env.API_CORS_ORIGIN ?? "http://localhost:3000";
      res.redirect(`${webOrigin}/settings/integrations?connected=quickbooks`);
    } catch {
      const webOrigin = process.env.API_CORS_ORIGIN ?? "http://localhost:3000";
      res.redirect(`${webOrigin}/settings/integrations?error=quickbooks_failed`);
    }
  }

  @Post("quickbooks/sync/invoices")
  @ApiOperation({ summary: "Trigger QuickBooks invoice sync." })
  async quickbooksSyncInvoices(@CurrentAuth() ctx: AuthContext) {
    return this.triggerSync(ctx.organization.id, "QUICKBOOKS", "invoice", "push");
  }

  @Post("quickbooks/sync/payments")
  @ApiOperation({ summary: "Trigger QuickBooks payment sync." })
  async quickbooksSyncPayments(@CurrentAuth() ctx: AuthContext) {
    return this.triggerSync(ctx.organization.id, "QUICKBOOKS", "payment", "push");
  }

  @Get("quickbooks/status")
  @ApiOperation({ summary: "Get QuickBooks connection status." })
  async quickbooksStatus(@CurrentAuth() ctx: AuthContext) {
    return this.getConnectionStatus(ctx.organization.id, "QUICKBOOKS");
  }

  // ── Shared helpers ──

  @Post("webhook-events/:id/replay")
  @ApiOperation({ summary: "Replay a failed Shopify/WooCommerce webhook event." })
  async replayWebhookEvent(
    @Param("id") id: string,
    @CurrentAuth() ctx: AuthContext,
  ) {
    const db = getDbClient();
    const event = await db.webhookEvent.findFirst({
      where: { id, organizationId: ctx.organization.id },
    });

    if (!event) {
      throw new NotFoundException("Webhook event not found.");
    }

    if (!["FAILED", "DEAD_LETTER", "PROCESSING"].includes(event.status)) {
      throw new BadRequestException("Only failed, dead-lettered, or stuck webhook events can be replayed.");
    }

    await db.webhookEvent.update({
      where: { id: event.id },
      data: {
        error: null,
        nextAttemptAt: null,
        processedAt: null,
        status: "PENDING",
      },
    });

    const jobName: WebhookReceivedJobName =
      event.source === "SHOPIFY"
        ? "shopify.webhook.received"
        : "woocommerce.webhook.received";
    const queued = await publishJob(
      jobName,
      {
        webhookEventId: event.id,
        organizationId: event.organizationId,
        source: event.source,
        topic: event.topic,
      },
      {
        attempts: 5,
        backoffMs: 5000,
        jobId: `${event.id}:replay:${Date.now()}`,
      },
    );

    return {
      status: "queued",
      webhookEventId: event.id,
      queue: queued,
    };
  }

  @Get("webhook-events/dead-letter")
  @ApiOperation({ summary: "List dead-lettered Shopify/WooCommerce webhook events." })
  async listWebhookDeadLetter(@CurrentAuth() ctx: AuthContext) {
    const db = getDbClient();
    return db.webhookEvent.findMany({
      where: {
        organizationId: ctx.organization.id,
        status: "DEAD_LETTER",
      },
      orderBy: { receivedAt: "desc" },
      take: 50,
    });
  }

  @Post("sync-logs/:id/replay")
  @ApiOperation({ summary: "Replay a failed accounting sync log." })
  async replayAccountingSyncLog(
    @Param("id") id: string,
    @CurrentAuth() ctx: AuthContext,
  ) {
    const db = getDbClient();
    const failedLog = await db.accountingSyncLog.findFirst({
      where: {
        id,
        connection: { organizationId: ctx.organization.id },
        status: { in: ["FAILED", "DEAD_LETTER"] },
      },
      include: { connection: true },
    });

    if (!failedLog) {
      throw new NotFoundException("Replayable accounting sync log not found.");
    }

    const direction = failedLog.direction === "PULL" ? "pull" : "push";
    const syncLog = await db.accountingSyncLog.create({
      data: {
        connectionId: failedLog.connectionId,
        direction: failedLog.direction,
        entityType: failedLog.entityType,
        entityId: failedLog.entityId,
        status: "QUEUED",
        replayOfId: failedLog.id,
      },
    });

    const queued = await this.queueAccountingJob(
      failedLog.connection.provider,
      failedLog.entityType,
      {
        connectionId: failedLog.connectionId,
        organizationId: ctx.organization.id,
        direction,
        syncLogId: syncLog.id,
      },
    );

    return {
      status: "queued",
      replayOfId: failedLog.id,
      syncLogId: syncLog.id,
      queue: queued,
    };
  }

  private async triggerSync(
    organizationId: string,
    provider: "XERO" | "QUICKBOOKS",
    entityType: "invoice" | "payment",
    direction: "push" | "pull",
  ) {
    const db = getDbClient();
    const connection = await db.accountingConnection.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    });

    if (!connection || !connection.isActive) {
      return { status: "error", message: `${provider} not connected` };
    }

    const syncLog = await db.accountingSyncLog.create({
      data: {
        connectionId: connection.id,
        direction: direction === "pull" ? "PULL" : "PUSH",
        entityType,
        entityId: connection.id,
        status: "QUEUED",
      },
    });
    const queued = await this.queueAccountingJob(provider, entityType, {
      connectionId: connection.id,
      organizationId,
      direction,
      syncLogId: syncLog.id,
    });

    return {
      status: "queued",
      message: `${entityType} sync queued for ${provider}`,
      connectionId: connection.id,
      syncLogId: syncLog.id,
      queue: queued,
    };
  }

  private queueAccountingJob(
    provider: "XERO" | "QUICKBOOKS",
    entityType: string,
    payload: AccountingSyncPayload,
  ) {
    const jobName = accountingJobName(provider, entityType);
    return publishJob(jobName, payload, {
      attempts: 5,
      backoffMs: 10_000,
      jobId: `${payload.syncLogId ?? payload.connectionId}:${jobName}:${Date.now()}`,
    });
  }

  private async getConnectionStatus(organizationId: string, provider: "XERO" | "QUICKBOOKS") {
    const db = getDbClient();
    const connection = await db.accountingConnection.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
      select: {
        id: true,
        isActive: true,
        lastSyncAt: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
    });

    if (!connection) {
      return { connected: false, provider };
    }

    const recentLogs = await db.accountingSyncLog.findMany({
      where: { connectionId: connection.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { direction: true, entityType: true, status: true, createdAt: true, error: true },
    });

    return {
      connected: true,
      provider,
      isActive: connection.isActive,
      lastSyncAt: connection.lastSyncAt,
      tokenExpiresAt: connection.tokenExpiresAt,
      connectedAt: connection.createdAt,
      recentSyncLogs: recentLogs,
    };
  }
}

function accountingJobName(provider: "XERO" | "QUICKBOOKS", entityType: string) {
  if (provider === "XERO" && entityType === "invoice") {
    return "xero.invoice.sync" as const;
  }
  if (provider === "XERO" && entityType === "payment") {
    return "xero.payment.sync" as const;
  }
  if (provider === "QUICKBOOKS" && entityType === "invoice") {
    return "quickbooks.invoice.sync" as const;
  }
  if (provider === "QUICKBOOKS" && entityType === "payment") {
    return "quickbooks.payment.sync" as const;
  }

  throw new BadRequestException(`Unsupported accounting sync entity: ${entityType}`);
}
