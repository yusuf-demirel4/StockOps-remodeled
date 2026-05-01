import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
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
  rows(
    @CurrentAuth() context: AuthContext,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.stockOps.listStockRows(context, {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
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
  movements(
    @CurrentAuth() context: AuthContext,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.stockOps.listStockMovements(context, {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
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

  @Post("reconcile")
  @RequirePermissions("manage_stock")
  @ApiOperation({
    summary: "Run stock reconciliation comparing ledger totals against stock balances.",
  })
  reconcile(
    @CurrentAuth() context: AuthContext,
    @Body() body: { autoFix?: boolean },
  ) {
    return this.stockOps.runReconciliation(context, body?.autoFix ?? false);
  }

  @Get("reconciliations")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List past reconciliation runs." })
  listReconciliations(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listReconciliations(context);
  }
}
