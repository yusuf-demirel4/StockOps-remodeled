import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
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
  productVariantCreateBodySchema,
  productVariantSchema,
  productVariantUpdateBodySchema,
} from "../openapi/schemas";

@ApiTags("Product Variants")
@ApiTokenSecurity()
@Controller()
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class VariantsController {
  constructor(
    @Inject(StockOpsApiService)
    private readonly stockOps: StockOpsApiService,
  ) {}

  @Get("products/:productId/variants")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List variants for a product." })
  @ApiParam({ name: "productId", example: "prd_001" })
  @ApiOkResponse({ schema: arrayOf(productVariantSchema) })
  list(
    @CurrentAuth() context: AuthContext,
    @Param("productId") productId: string,
  ) {
    return this.stockOps.listProductVariants(productId, context);
  }

  @Post("products/:productId/variants")
  @RequirePermissions("manage_products")
  @ApiOperation({ summary: "Create a variant for a product." })
  @ApiParam({ name: "productId", example: "prd_001" })
  @ApiBody({ schema: productVariantCreateBodySchema })
  @ApiCreatedResponse({ schema: productVariantSchema })
  @ApiValidationError()
  create(
    @CurrentAuth() context: AuthContext,
    @Param("productId") productId: string,
    @Body() body: unknown,
  ) {
    return this.stockOps.createProductVariant(productId, body, context);
  }

  @Patch("variants/:id")
  @RequirePermissions("manage_products")
  @ApiOperation({ summary: "Update a variant." })
  @ApiParam({ name: "id", example: "var_001" })
  @ApiBody({ schema: productVariantUpdateBodySchema })
  @ApiOkResponse({ schema: productVariantSchema })
  @ApiValidationError()
  update(
    @CurrentAuth() context: AuthContext,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.stockOps.updateProductVariant(id, body, context);
  }

  @Delete("variants/:id")
  @RequirePermissions("manage_products")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a variant." })
  @ApiParam({ name: "id", example: "var_001" })
  @ApiNoContentResponse()
  async remove(
    @CurrentAuth() context: AuthContext,
    @Param("id") id: string,
  ) {
    await this.stockOps.deleteProductVariant(id, context);
  }
}
