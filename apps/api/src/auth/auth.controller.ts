import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "@stockops/core/types";

import { ApiTokenSecurity } from "../openapi/decorators";
import { authMeResponseSchema } from "../openapi/schemas";
import { ApiAuthGuard } from "./api-auth.guard";
import { CurrentAuth } from "./current-auth.decorator";

@ApiTags("Auth")
@ApiTokenSecurity()
@Controller("auth")
@UseGuards(ApiAuthGuard)
export class AuthController {
  @Get("me")
  @ApiOperation({ summary: "Return the authenticated API token context." })
  @ApiOkResponse({ schema: authMeResponseSchema })
  me(@CurrentAuth() context: AuthContext) {
    return {
      user: {
        id: context.user.id,
        name: context.user.name,
        email: context.user.email,
      },
      organization: context.organization,
      role: context.role,
    };
  }
}
