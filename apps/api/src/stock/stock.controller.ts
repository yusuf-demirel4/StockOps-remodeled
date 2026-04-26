import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
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
  stockMovementCreateBodySchema,
  stockMovementResponseSchema,
  stockRowSchema,
  stockTransferCreateBodySchema,
  stockTransferResponseSchema,
  warehouseCreateBodySchema,
  warehouseSchema,
  warehouseUpdateBodySchema,
} from "../openapi/schemas";

@ApiTags("Stock")
@ApiTokenSecurity()
@Controller("stock")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class StockController {
  constructor(
    @Inject(StockOpsApiService)
    private readonly stockOps: StockOpsApiService,
  ) {}

  @Get("warehouses")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List warehouses for the organization." })
  @ApiOkResponse({ schema: arrayOf(warehouseSchema) })
  warehouses(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listWarehouses(context);
  }

  @Post("warehouses")
  @RequirePermissions("manage_stock")
  @ApiOperation({ summary: "Create a warehouse for the organization." })
  @ApiBody({ schema: warehouseCreateBodySchema })
  @ApiCreatedResponse({ schema: warehouseSchema })
  @ApiValidationError()
  createWarehouse(@CurrentAuth() context: AuthContext, @Body() body: unknown) {
    return this.stockOps.createWarehouse(body, context);
  }

  @Patch("warehouses/:warehouseId")
  @RequirePermissions("manage_stock")
  @ApiOperation({ summary: "Update a warehouse or make it the default." })
  @ApiBody({ schema: warehouseUpdateBodySchema })
  @ApiOkResponse({ schema: warehouseSchema })
  @ApiValidationError()
  updateWarehouse(
    @CurrentAuth() context: AuthContext,
    @Param("warehouseId") warehouseId: string,
    @Body() body: unknown,
  ) {
    return this.stockOps.updateWarehouse(warehouseId, body, context);
  }

  @Get("rows")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List current stock by product and warehouse." })
  @ApiOkResponse({ schema: arrayOf(stockRowSchema) })
  rows(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listStockRows(context);
  }

  @Get("alerts")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List rows at or below minimum stock." })
  @ApiOkResponse({ schema: arrayOf(stockRowSchema) })
  alerts(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listCriticalStockRows(context);
  }

  @Get("movements")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List recent stock movements." })
  @ApiOkResponse({ schema: arrayOf(stockMovementResponseSchema) })
  movements(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listStockMovements(context);
  }

  @Post("movements")
  @RequirePermissions("manage_stock")
  @ApiOperation({ summary: "Create an inbound, outbound, or adjustment movement." })
  @ApiBody({ schema: stockMovementCreateBodySchema })
  @ApiCreatedResponse({ schema: stockMovementResponseSchema })
  @ApiValidationError()
  createMovement(@CurrentAuth() context: AuthContext, @Body() body: unknown) {
    return this.stockOps.createStockMovement(body, context);
  }

  @Post("transfers")
  @RequirePermissions("manage_stock")
  @ApiOperation({ summary: "Transfer stock between warehouses." })
  @ApiBody({ schema: stockTransferCreateBodySchema })
  @ApiCreatedResponse({ schema: stockTransferResponseSchema })
  @ApiValidationError()
  createTransfer(@CurrentAuth() context: AuthContext, @Body() body: unknown) {
    return this.stockOps.createStockTransfer(body, context);
  }
}
