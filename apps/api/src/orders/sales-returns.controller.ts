import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
  salesReturnCreateBodySchema,
  salesReturnSchema,
} from "../openapi/schemas";

@ApiTags("Sales Returns")
@ApiTokenSecurity()
@Controller()
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class SalesReturnsController {
  constructor(
    @Inject(StockOpsApiService)
    private readonly stockOps: StockOpsApiService,
  ) {}

  @Get("sales-returns")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List sales returns." })
  @ApiOkResponse({ schema: arrayOf(salesReturnSchema) })
  list(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listSalesReturns(context);
  }

  @Post("sales-orders/:id/returns")
  @RequirePermissions("manage_sales")
  @ApiOperation({ summary: "Create a return against a confirmed sales order." })
  @ApiParam({ name: "id", example: "so_001" })
  @ApiBody({ schema: salesReturnCreateBodySchema })
  @ApiCreatedResponse({ schema: salesReturnSchema })
  @ApiValidationError()
  create(
    @CurrentAuth() context: AuthContext,
    @Param("id") salesOrderId: string,
    @Body() body: unknown,
  ) {
    const payload = {
      ...((body as Record<string, unknown>) ?? {}),
      salesOrderId,
    };
    return this.stockOps.createSalesReturn(payload, context);
  }

  @Post("sales-returns/:id/approve")
  @HttpCode(200)
  @RequirePermissions("manage_sales")
  @ApiOperation({
    summary: "Approve a return; restocks items and closes the return.",
  })
  @ApiParam({ name: "id", example: "ret_001" })
  @ApiOkResponse({ schema: salesReturnSchema })
  approve(@CurrentAuth() context: AuthContext, @Param("id") id: string) {
    return this.stockOps.approveSalesReturn(id, context);
  }
}
