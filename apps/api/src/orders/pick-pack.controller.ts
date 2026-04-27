import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import type { AuthContext } from "@stockops/core/types";

import { ApiAuthGuard } from "../auth/api-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { StockOpsApiService } from "../domain/stockops-api.service";
import { EventsGateway } from "../realtime/events.gateway";
import { ApiTokenSecurity } from "../openapi/decorators";

@ApiTags("Pick / Pack / Ship")
@ApiTokenSecurity()
@Controller()
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class PickPackController {
  constructor(
    @Inject(StockOpsApiService)
    private readonly stockOps: StockOpsApiService,
    @Inject(EventsGateway)
    private readonly events: EventsGateway,
  ) {}

  // -----------------------------------------------------------------------
  // POST /v1/orders/:id/picking — CONFIRMED → PICKING
  // -----------------------------------------------------------------------

  @Post("orders/:id/picking")
  @HttpCode(200)
  @RequirePermissions("manage_stock")
  @ApiOperation({ summary: "Start picking for a confirmed sales order." })
  @ApiParam({ name: "id", description: "Sales order ID", example: "so_001" })
  @ApiOkResponse({
    description: "Order moved to PICKING, pick list created.",
    schema: {
      type: "object",
      required: ["orderId", "pickListId"],
      properties: {
        orderId: { type: "string", example: "so_001" },
        pickListId: { type: "string", example: "pl_001" },
      },
    },
  })
  async startPicking(
    @CurrentAuth() context: AuthContext,
    @Param("id") id: string,
  ) {
    const result = await this.stockOps.startPicking(id, context);

    this.events.broadcastOrderStatus(context.organization.id, {
      orderId: result.orderId,
      orderCode: id,
      orderType: "SALES",
      newStatus: "PICKING",
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  // -----------------------------------------------------------------------
  // GET /v1/pick-lists — paginated list of pick lists
  // -----------------------------------------------------------------------

  @Get("pick-lists")
  @RequirePermissions("manage_stock")
  @ApiOperation({ summary: "List pick lists for the organization." })
  @ApiQuery({ name: "status", required: false, example: "PENDING" })
  @ApiQuery({ name: "assignedTo", required: false, example: "usr_001" })
  @ApiQuery({ name: "cursor", required: false, description: "Cursor for pagination" })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
  listPickLists(
    @CurrentAuth() context: AuthContext,
    @Query("status") status?: string,
    @Query("assignedTo") assignedTo?: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.stockOps.listPickLists(context, {
      status,
      assignedTo,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // -----------------------------------------------------------------------
  // GET /v1/pick-lists/:id — pick list detail with items + progress
  // -----------------------------------------------------------------------

  @Get("pick-lists/:id")
  @RequirePermissions("manage_stock")
  @ApiOperation({ summary: "Get pick list detail with items and progress." })
  @ApiParam({ name: "id", description: "Pick list ID", example: "pl_001" })
  getPickList(
    @CurrentAuth() context: AuthContext,
    @Param("id") id: string,
  ) {
    return this.stockOps.getPickList(id, context);
  }

  // -----------------------------------------------------------------------
  // PATCH /v1/pick-lists/:id/items/:itemId — update pickedQty (barcode scan)
  // -----------------------------------------------------------------------

  @Patch("pick-lists/:id/items/:itemId")
  @RequirePermissions("manage_stock")
  @ApiOperation({ summary: "Update picked quantity for a pick list item." })
  @ApiParam({ name: "id", description: "Pick list ID", example: "pl_001" })
  @ApiParam({ name: "itemId", description: "Pick list item ID", example: "pli_001" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["pickedQty"],
      properties: {
        pickedQty: { type: "integer", minimum: 0, example: 3 },
      },
    },
  })
  async updatePickListItem(
    @CurrentAuth() context: AuthContext,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() body: { pickedQty: number },
  ) {
    const result = await this.stockOps.updatePickListItem(
      id,
      itemId,
      body.pickedQty,
      context,
    );

    this.events.broadcastPickListUpdate(context.organization.id, {
      pickListId: id,
      itemId,
      pickedQty: result.pickedQty,
      percentComplete: result.progress.percentComplete,
    });

    return result;
  }

  // -----------------------------------------------------------------------
  // POST /v1/orders/:id/pack — PICKING → PACKED
  // -----------------------------------------------------------------------

  @Post("orders/:id/pack")
  @HttpCode(200)
  @RequirePermissions("manage_stock")
  @ApiOperation({ summary: "Pack a sales order (all items must be fully picked)." })
  @ApiParam({ name: "id", description: "Sales order ID", example: "so_001" })
  @ApiOkResponse({
    description: "Order moved to PACKED.",
    schema: {
      type: "object",
      required: ["orderId", "status"],
      properties: {
        orderId: { type: "string", example: "so_001" },
        status: { type: "string", example: "PACKED" },
      },
    },
  })
  async packOrder(
    @CurrentAuth() context: AuthContext,
    @Param("id") id: string,
  ) {
    const result = await this.stockOps.packOrder(id, context);

    this.events.broadcastOrderStatus(context.organization.id, {
      orderId: result.orderId,
      orderCode: id,
      orderType: "SALES",
      newStatus: "PACKED",
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  // -----------------------------------------------------------------------
  // POST /v1/orders/:id/ship — PACKED → SHIPPED
  // -----------------------------------------------------------------------

  @Post("orders/:id/ship")
  @HttpCode(200)
  @RequirePermissions("manage_stock")
  @ApiOperation({ summary: "Ship a packed sales order and create a shipment." })
  @ApiParam({ name: "id", description: "Sales order ID", example: "so_001" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        carrier: { type: "string", example: "yurtici" },
        trackingNumber: { type: "string", example: "TR123456789" },
        weight: { type: "number", example: 2.5 },
        packageCount: { type: "integer", minimum: 1, example: 1 },
      },
    },
  })
  async shipOrder(
    @CurrentAuth() context: AuthContext,
    @Param("id") id: string,
    @Body()
    body: {
      carrier?: string;
      trackingNumber?: string;
      weight?: number;
      packageCount?: number;
    },
  ) {
    const result = await this.stockOps.shipOrder(id, body, context);

    this.events.broadcastOrderStatus(context.organization.id, {
      orderId: result.orderId,
      orderCode: id,
      orderType: "SALES",
      newStatus: "SHIPPED",
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  // -----------------------------------------------------------------------
  // POST /v1/orders/:id/deliver — SHIPPED → DELIVERED
  // -----------------------------------------------------------------------

  @Post("orders/:id/deliver")
  @HttpCode(200)
  @RequirePermissions("manage_stock")
  @ApiOperation({ summary: "Mark a shipped order as delivered." })
  @ApiParam({ name: "id", description: "Sales order ID", example: "so_001" })
  @ApiOkResponse({
    description: "Order moved to DELIVERED.",
    schema: {
      type: "object",
      required: ["orderId", "status"],
      properties: {
        orderId: { type: "string", example: "so_001" },
        status: { type: "string", example: "DELIVERED" },
      },
    },
  })
  async deliverOrder(
    @CurrentAuth() context: AuthContext,
    @Param("id") id: string,
  ) {
    const result = await this.stockOps.deliverOrder(id, context);

    this.events.broadcastOrderStatus(context.organization.id, {
      orderId: result.orderId,
      orderCode: id,
      orderType: "SALES",
      newStatus: "DELIVERED",
      timestamp: new Date().toISOString(),
    });

    return result;
  }
}
