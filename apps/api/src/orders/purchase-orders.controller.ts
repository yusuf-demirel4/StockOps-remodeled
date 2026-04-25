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
  purchaseOrderCreateBodySchema,
  purchaseOrderSchema,
} from "../openapi/schemas";

@ApiTags("Purchase Orders")
@ApiTokenSecurity()
@Controller("purchase-orders")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class PurchaseOrdersController {
  constructor(
    @Inject(StockOpsApiService)
    private readonly stockOps: StockOpsApiService,
  ) {}

  @Get()
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List purchase orders." })
  @ApiOkResponse({ schema: arrayOf(purchaseOrderSchema) })
  list(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listPurchaseOrders(context);
  }

  @Get("open")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List open purchase orders." })
  @ApiOkResponse({ schema: arrayOf(purchaseOrderSchema) })
  open(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listOpenPurchaseOrders(context);
  }

  @Post()
  @RequirePermissions("manage_purchasing")
  @ApiOperation({ summary: "Create a purchase order." })
  @ApiBody({ schema: purchaseOrderCreateBodySchema })
  @ApiCreatedResponse({ schema: purchaseOrderSchema })
  @ApiValidationError()
  create(@CurrentAuth() context: AuthContext, @Body() body: unknown) {
    return this.stockOps.createPurchaseOrder(body, context);
  }

  @Post(":id/receive")
  @HttpCode(200)
  @RequirePermissions("manage_purchasing")
  @ApiOperation({ summary: "Receive a purchase order and increase stock." })
  @ApiParam({ name: "id", example: "po_001" })
  @ApiOkResponse({ schema: purchaseOrderSchema })
  receive(@CurrentAuth() context: AuthContext, @Param("id") id: string) {
    return this.stockOps.receivePurchaseOrder(id, context);
  }
}
