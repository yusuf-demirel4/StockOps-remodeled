import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "@stockops/core/types";

import { ApiAuthGuard } from "../auth/api-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { StockOpsApiService } from "../domain/stockops-api.service";
import { ApiTokenSecurity } from "../openapi/decorators";
import {
  arrayOf,
  productListItemSchema,
  stockRowSchema,
} from "../openapi/schemas";

@ApiTags("Inventory Compatibility")
@ApiTokenSecurity()
@Controller("inventory")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    @Inject(StockOpsApiService)
    private readonly stockOps: StockOpsApiService,
  ) {}

  @Get("products")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Compatibility alias for GET /v1/products." })
  @ApiOkResponse({ schema: arrayOf(productListItemSchema) })
  listProducts(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listProducts(context);
  }

  @Get("alerts")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Compatibility alias for GET /v1/stock/alerts." })
  @ApiOkResponse({ schema: arrayOf(stockRowSchema) })
  listAlerts(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listCriticalStockRows(context);
  }
}
