import {
  Body,
  Controller,
  Delete,
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
  productCreateBodySchema,
  productListItemSchema,
  productSchema,
  productUpdateBodySchema,
} from "../openapi/schemas";

@ApiTags("Products")
@ApiTokenSecurity()
@Controller("products")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(
    @Inject(StockOpsApiService)
    private readonly stockOps: StockOpsApiService,
  ) {}

  @Get()
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List products with total stock on hand." })
  @ApiOkResponse({ schema: arrayOf(productListItemSchema) })
  list(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listProducts(context);
  }

  @Post()
  @RequirePermissions("manage_products")
  @ApiOperation({ summary: "Create a product/SKU." })
  @ApiBody({ schema: productCreateBodySchema })
  @ApiCreatedResponse({ schema: productSchema })
  @ApiValidationError()
  create(@CurrentAuth() context: AuthContext, @Body() body: unknown) {
    return this.stockOps.createProduct(body, context);
  }

  @Get(":id")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Get one product by id." })
  @ApiParam({ name: "id", example: "prd_001" })
  @ApiOkResponse({ schema: productListItemSchema })
  get(@CurrentAuth() context: AuthContext, @Param("id") id: string) {
    return this.stockOps.getProduct(id, context);
  }

  @Patch(":id")
  @RequirePermissions("manage_products")
  @ApiOperation({ summary: "Update product/SKU fields." })
  @ApiParam({ name: "id", example: "prd_001" })
  @ApiBody({ schema: productUpdateBodySchema })
  @ApiOkResponse({ schema: productSchema })
  @ApiValidationError()
  update(
    @CurrentAuth() context: AuthContext,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.stockOps.updateProduct(id, body, context);
  }

  @Delete(":id")
  @RequirePermissions("manage_products")
  @ApiOperation({ summary: "Deactivate a product/SKU." })
  @ApiParam({ name: "id", example: "prd_001" })
  @ApiOkResponse({ schema: productSchema })
  deactivate(@CurrentAuth() context: AuthContext, @Param("id") id: string) {
    return this.stockOps.deactivateProduct(id, context);
  }
}
