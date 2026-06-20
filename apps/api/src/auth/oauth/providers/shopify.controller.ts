import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { createHmac } from "crypto";
import { getPrisma } from "@stockops/db";
import { encryptToken } from "@stockops/core";
import { CurrentAuth } from "../../current-auth.decorator";
import { ApiAuthGuard } from "../../api-auth.guard";
import { AuthContext } from "@stockops/core/types";
import { PermissionsGuard } from "../../permissions.guard";
import { RequirePermissions } from "../../permissions.decorator";

const SHOPIFY_SCOPES = [
  "read_products",
  "read_orders",
  "read_inventory",
  "write_inventory",
  "read_locations",
].join(",");

@ApiTags("OAuth Integrations")
@Controller("auth/oauth/shopify")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class ShopifyAuthController {
  
  private generateState(organizationId: string, userId: string): string {
    const payload = `${organizationId}:${userId}:${Date.now()}`;
    const hmac = createHmac("sha256", process.env.ENCRYPTION_KEY!)
      .update(payload)
      .digest("hex");
    return `${payload}:${hmac}`;
  }

  private verifyState(state: string, organizationId: string, userId: string): boolean {
    const parts = state.split(":");
    if (parts.length !== 4) return false;
    
    const [stateOrgId, stateUserId, timestamp, signature] = parts;
    if (stateOrgId !== organizationId || stateUserId !== userId) return false;

    // Check expiration (e.g., 10 minutes)
    if (Date.now() - parseInt(timestamp, 10) > 10 * 60 * 1000) return false;

    const payload = `${stateOrgId}:${stateUserId}:${timestamp}`;
    const expectedSignature = createHmac("sha256", process.env.ENCRYPTION_KEY!)
      .update(payload)
      .digest("hex");

    return signature === expectedSignature;
  }

  private verifyHmac(query: Record<string, any>): boolean {
    const { hmac, ...rest } = query;
    const message = Object.keys(rest)
      .sort()
      .map((key) => `${key}=${rest[key]}`)
      .join("&");
    
    const expected = createHmac("sha256", process.env.SHOPIFY_CLIENT_SECRET!)
      .update(message)
      .digest("hex");
      
    return hmac === expected;
  }

  @Get("install")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RequirePermissions("system.manage") // Only admins can install integrations
  @ApiOperation({ summary: "Initiate Shopify App Installation" })
  @ApiQuery({ name: "shop", description: "The shop domain (e.g., store.myshopify.com)" })
  async install(
    @Query("shop") shop: string,
    @CurrentAuth() auth: AuthContext,
    @Res() res: Response,
  ) {
    if (!shop || !/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)) {
      throw new BadRequestException("Invalid shop domain.");
    }

    const state = this.generateState(auth.organization.id, auth.user.id);
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const redirectUri = process.env.SHOPIFY_CALLBACK_URL;

    const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${SHOPIFY_SCOPES}&redirect_uri=${redirectUri}&state=${state}&grant_options[]=`;

    res.redirect(installUrl);
  }

  @Get("callback")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RequirePermissions("system.manage")
  @ApiOperation({ summary: "Handle Shopify OAuth Callback" })
  async callback(
    @Query() query: any,
    @CurrentAuth() auth: AuthContext,
    @Res() res: Response,
  ) {
    const { shop, hmac, code, state } = query;

    if (!shop || !hmac || !code || !state) {
      throw new BadRequestException("Missing required OAuth parameters.");
    }

    if (!this.verifyState(state, auth.organization.id, auth.user.id)) {
      throw new UnauthorizedException("Invalid or expired state parameter. CSRF validation failed.");
    }

    if (!this.verifyHmac(query)) {
      throw new UnauthorizedException("Invalid Shopify HMAC signature.");
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new BadRequestException("Failed to exchange access token with Shopify.");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const grantedScopes = tokenData.scope;

    const encryptedToken = encryptToken(accessToken, process.env.ENCRYPTION_KEY!);

    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      await tx.shopifyIntegration.upsert({
        where: { shopDomain: shop },
        update: {
          organizationId: auth.organization.id,
          accessToken: encryptedToken,
          scopes: grantedScopes,
          isActive: true,
        },
        create: {
          organizationId: auth.organization.id,
          shopDomain: shop,
          accessToken: encryptedToken,
          scopes: grantedScopes,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: auth.organization.id,
          actorId: auth.user.id,
          action: "UPDATE",
          entityType: "ShopifyIntegration",
          entityId: shop,
          summary: `Connected Shopify store: ${shop} with scopes: ${grantedScopes}`,
        },
      });
    });

    res.redirect("/integrations?success=shopify");
  }
}
