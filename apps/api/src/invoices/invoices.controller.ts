import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { AuthContext } from "@stockops/core/types";

import { ApiAuthGuard } from "../auth/api-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { StockOpsApiService } from "../domain/stockops-api.service";
import {
  ApiTokenSecurity,
  ApiValidationError,
} from "../openapi/decorators";
import {
  arrayOf,
  invoiceSchema,
  invoiceCreateBodySchema,
} from "../openapi/schemas";

@ApiTags("Invoices")
@ApiTokenSecurity()
@Controller("invoices")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class InvoicesController {
  constructor(
    @Inject(StockOpsApiService)
    private readonly stockOps: StockOpsApiService,
  ) {}

  @Get()
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List invoices. Supports cursor pagination via ?cursor=&limit= query params." })
  @ApiOkResponse({ schema: arrayOf(invoiceSchema) })
  list(
    @CurrentAuth() context: AuthContext,
    @Query() query: Record<string, string>,
  ) {
    const hasPagination = query.cursor !== undefined || query.limit !== undefined;
    return this.stockOps.listInvoices(context, hasPagination ? query : undefined);
  }

  @Post()
  @RequirePermissions("manage_sales")
  @ApiOperation({ summary: "Create an invoice." })
  @ApiBody({ schema: invoiceCreateBodySchema })
  @ApiCreatedResponse({ schema: invoiceSchema })
  @ApiValidationError()
  create(@CurrentAuth() context: AuthContext, @Body() body: unknown) {
    return this.stockOps.createInvoice(body, context);
  }
}
