import { Controller, Get, Param, Query, Res, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { OAuthService } from "./oauth.service";

const oauthService = new OAuthService();

@ApiTags("OAuth")
@Controller("auth/oauth")
export class OAuthController {
  @Get(":provider")
  @ApiOperation({ summary: "Redirect to OAuth provider login page." })
  redirect(@Param("provider") provider: string, @Res() res: Response) {
    try {
      const url = oauthService.getAuthUrl(provider);
      res.redirect(url);
    } catch {
      res.status(HttpStatus.BAD_REQUEST).json({ message: "Unsupported provider" });
    }
  }

  @Get(":provider/callback")
  @ApiOperation({ summary: "OAuth callback — exchange code for session." })
  async callback(
    @Param("provider") provider: string,
    @Query("code") code: string,
    @Res() res: Response,
  ) {
    if (!code) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: "Missing authorization code" });
      return;
    }

    try {
      const result = await oauthService.handleCallback(provider, code);

      // Set session cookie and redirect to web app
      const webOrigin = process.env.API_CORS_ORIGIN ?? "http://localhost:3000";
      res.cookie("stockops_session", result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
      res.redirect(`${webOrigin}/dashboard`);
    } catch (err) {
      const webOrigin = process.env.API_CORS_ORIGIN ?? "http://localhost:3000";
      res.redirect(`${webOrigin}/login?error=oauth_failed`);
    }
  }
}
