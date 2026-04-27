import { Controller, Get, Param, Post, Query, Res, UseGuards, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { getDbClient } from "@stockops/db";
import { XeroClient } from "@stockops/integration-xero/client";
import { QuickBooksClient } from "@stockops/integration-quickbooks/client";
import type { AuthContext } from "@stockops/core/types";
import type { Response } from "express";

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
    return this.triggerSync(ctx.organization.id, "XERO", "invoice");
  }

  @Post("xero/sync/payments")
  @ApiOperation({ summary: "Trigger Xero payment sync." })
  async xeroSyncPayments(@CurrentAuth() ctx: AuthContext) {
    return this.triggerSync(ctx.organization.id, "XERO", "payment");
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
    return this.triggerSync(ctx.organization.id, "QUICKBOOKS", "invoice");
  }

  @Post("quickbooks/sync/payments")
  @ApiOperation({ summary: "Trigger QuickBooks payment sync." })
  async quickbooksSyncPayments(@CurrentAuth() ctx: AuthContext) {
    return this.triggerSync(ctx.organization.id, "QUICKBOOKS", "payment");
  }

  @Get("quickbooks/status")
  @ApiOperation({ summary: "Get QuickBooks connection status." })
  async quickbooksStatus(@CurrentAuth() ctx: AuthContext) {
    return this.getConnectionStatus(ctx.organization.id, "QUICKBOOKS");
  }

  // ── Shared helpers ──

  private async triggerSync(organizationId: string, provider: "XERO" | "QUICKBOOKS", entityType: string) {
    const db = getDbClient();
    const connection = await db.accountingConnection.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    });

    if (!connection || !connection.isActive) {
      return { status: "error", message: `${provider} not connected` };
    }

    // In a real implementation, this would publish a queue job
    return {
      status: "queued",
      message: `${entityType} sync queued for ${provider}`,
      connectionId: connection.id,
    };
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
