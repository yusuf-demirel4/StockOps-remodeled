import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { AuthContext } from "@stockops/core/types";

import { ApiAuthGuard } from "../auth/api-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { StockOpsApiService } from "../domain/stockops-api.service";
import { ApiTokenSecurity } from "../openapi/decorators";

@ApiTags("Credit Notes")
@ApiTokenSecurity()
@Controller("credit-notes")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class CreditNotesController {
  constructor(private readonly stockOps: StockOpsApiService) {}

  @Get()
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List credit notes." })
  list(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listCreditNotes(context);
  }

  @Get(":id")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Get a credit note by ID." })
  findOne(@CurrentAuth() context: AuthContext, @Param("id") id: string) {
    return this.stockOps.getCreditNote(id, context);
  }

  @Post()
  @RequirePermissions("manage_sales")
  @ApiOperation({ summary: "Create a credit note." })
  create(
    @CurrentAuth() context: AuthContext,
    @Body() body: { customerId: string; salesReturnId?: string; lines: any[]; notes?: string },
  ) {
    return this.stockOps.createCreditNote(body.customerId, body.salesReturnId, body.lines, body.notes, context);
  }
}
