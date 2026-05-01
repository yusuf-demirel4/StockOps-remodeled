import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
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
  salesOrderCreateBodySchema,
  salesOrderSchema,
} from "../openapi/schemas";

@ApiTags("Sales Orders")
@ApiTokenSecurity()
@Controller("sales-orders")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class SalesOrdersController {
  constructor(
    @Inject(StockOpsApiService)
    private readonly stockOps: StockOpsApiService,
  ) {}

  @Get()
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List sales orders." })
  @ApiOkResponse({ schema: arrayOf(salesOrderSchema) })
  list(
    @CurrentAuth() context: AuthContext,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.stockOps.listSalesOrders(context, {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get("open")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List draft sales orders." })
  @ApiOkResponse({ schema: arrayOf(salesOrderSchema) })
  open(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listOpenSalesOrders(context);
  }

  @Post()
  @RequirePermissions("manage_sales")
  @ApiOperation({ summary: "Create a draft sales order." })
  @ApiBody({ schema: salesOrderCreateBodySchema })
  @ApiCreatedResponse({ schema: salesOrderSchema })
  @ApiValidationError()
  create(@CurrentAuth() context: AuthContext, @Body() body: unknown) {
    return this.stockOps.createSalesOrder(body, context);
  }

  @Post(":id/confirm")
  @HttpCode(200)
  @RequirePermissions("manage_sales")
  @ApiOperation({ summary: "Confirm a sales order and deduct stock." })
  @ApiParam({ name: "id", example: "so_001" })
  @ApiOkResponse({ schema: salesOrderSchema })
  confirm(@CurrentAuth() context: AuthContext, @Param("id") id: string) {
    return this.stockOps.confirmSalesOrder(id, context);
  }
}
