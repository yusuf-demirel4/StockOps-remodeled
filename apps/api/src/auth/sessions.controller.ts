import { Controller, Delete, Get, HttpCode, HttpStatus, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { getDbClient } from "@stockops/db";
import type { AuthContext } from "@stockops/core/types";

import { ApiTokenSecurity } from "../openapi/decorators";
import { ApiAuthGuard } from "./api-auth.guard";
import { CurrentAuth } from "./current-auth.decorator";

@ApiTags("Sessions")
@ApiTokenSecurity()
@Controller("auth/sessions")
@UseGuards(ApiAuthGuard)
export class SessionsController {
  @Get()
  @ApiOperation({ summary: "List all active sessions for the current user." })
  async list(@CurrentAuth() ctx: AuthContext) {
    const db = getDbClient();
    const sessions = await db.session.findMany({
      where: {
        organizationId: ctx.organization.id,
        userId: ctx.user.id,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { lastActiveAt: "desc" },
    });

    return sessions.map((s) => ({
      ...s,
      isCurrent: false, // Would need tokenHash comparison for accuracy
    }));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke a specific session." })
  async revoke(@CurrentAuth() ctx: AuthContext, @Param("id") sessionId: string) {
    const db = getDbClient();
    await db.session.deleteMany({
      where: {
        id: sessionId,
        organizationId: ctx.organization.id,
        userId: ctx.user.id,
      },
    });
  }
}
