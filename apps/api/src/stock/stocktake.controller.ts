import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "@stockops/core/types";

import { ApiAuthGuard } from "../auth/api-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { StockOpsApiService } from "../domain/stockops-api.service";
import { ApiTokenSecurity } from "../openapi/decorators";

@ApiTags("Stocktakes (Cycle Counts)")
@ApiTokenSecurity()
@Controller("v1/stocktakes")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class StocktakeController {
  constructor(private readonly stockOps: StockOpsApiService) {}

  @Post()
  @RequirePermissions("manage_inventory")
  @ApiOperation({ summary: "Create a new cycle count." })
  createStocktake(
    @Body() body: { warehouseId: string; assignedToId?: string },
    @CurrentAuth() context: AuthContext,
  ) {
    return this.stockOps.createStocktake(body.warehouseId, body.assignedToId || null, context);
  }

  @Post(":id/items")
  @RequirePermissions("manage_inventory")
  @ApiOperation({ summary: "Add an item to the cycle count." })
  addStocktakeItem(
    @Param("id") stocktakeId: string,
    @Body() body: { productId: string; binId?: string; expectedQty: number },
    @CurrentAuth() context: AuthContext,
  ) {
    return this.stockOps.addStocktakeItem(stocktakeId, body.productId, body.binId || null, body.expectedQty, context);
  }

  @Patch(":id/items/:itemId/count")
  @RequirePermissions("manage_inventory")
  @ApiOperation({ summary: "Submit counted quantity for an item." })
  submitCount(
    @Param("id") stocktakeId: string,
    @Param("itemId") itemId: string,
    @Body() body: { countedQty: number },
    @CurrentAuth() context: AuthContext,
  ) {
    return this.stockOps.submitStocktakeCount(stocktakeId, itemId, body.countedQty, context);
  }

  @Patch(":id/complete")
  @RequirePermissions("manage_inventory")
  @ApiOperation({ summary: "Mark count as complete, ready for review." })
  completeStocktake(
    @Param("id") stocktakeId: string,
    @CurrentAuth() context: AuthContext,
  ) {
    return this.stockOps.completeStocktake(stocktakeId, context);
  }

  @Patch(":id/approve")
  @RequirePermissions("manage_inventory")
  @ApiOperation({ summary: "Approve variance and adjust stock." })
  approveVariance(
    @Param("id") stocktakeId: string,
    @CurrentAuth() context: AuthContext,
  ) {
    return this.stockOps.approveStocktakeVariance(stocktakeId, context);
  }
}
