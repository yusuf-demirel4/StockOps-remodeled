import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "@stockops/core/types";

import { ApiTokenSecurity } from "../openapi/decorators";
import { ApiAuthGuard } from "./api-auth.guard";
import { CurrentAuth } from "./current-auth.decorator";
import { TwoFactorService } from "./two-factor.service";

const twoFactorService = new TwoFactorService();

@ApiTags("Two-Factor Authentication")
@ApiTokenSecurity()
@Controller("auth/2fa")
@UseGuards(ApiAuthGuard)
export class TwoFactorController {
  @Post("setup")
  @ApiOperation({ summary: "Start 2FA enrollment — returns QR URI and secret." })
  async setup(@CurrentAuth() ctx: AuthContext) {
    const result = await twoFactorService.setup(ctx.user.id, ctx.user.email);
    return { uri: result.uri, secret: result.secret };
  }

  @Post("verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify TOTP code to complete 2FA enrollment." })
  async verify(@CurrentAuth() ctx: AuthContext, @Body() body: { code: string }) {
    const result = await twoFactorService.verifySetup(ctx.user.id, body.code);
    if (!result) {
      return { success: false, message: "Invalid code or 2FA already verified" };
    }
    return { success: true, backupCodes: result.backupCodes };
  }

  @Post("validate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Validate a TOTP or backup code during login." })
  async validate(@CurrentAuth() ctx: AuthContext, @Body() body: { code: string }) {
    const valid = await twoFactorService.validate(ctx.user.id, body.code);
    return { valid };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Disable 2FA for the current user." })
  async disable(@CurrentAuth() ctx: AuthContext) {
    await twoFactorService.disable(ctx.user.id);
  }

  @Get("backup-codes")
  @ApiOperation({ summary: "List backup code status (used/unused)." })
  async backupCodes(@CurrentAuth() ctx: AuthContext) {
    return twoFactorService.getBackupCodes(ctx.user.id);
  }

  @Post("backup-codes/regenerate")
  @ApiOperation({ summary: "Regenerate all backup codes." })
  async regenerateBackupCodes(@CurrentAuth() ctx: AuthContext) {
    const codes = await twoFactorService.regenerateBackupCodes(ctx.user.id);
    return { backupCodes: codes };
  }
}
