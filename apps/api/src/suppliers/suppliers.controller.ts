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
  supplierCreateBodySchema,
  supplierSchema,
  supplierUpdateBodySchema,
} from "../openapi/schemas";

@ApiTags("Suppliers")
@ApiTokenSecurity()
@Controller("suppliers")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(
    @Inject(StockOpsApiService)
    private readonly stockOps: StockOpsApiService,
  ) {}

  @Get()
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List suppliers." })
  @ApiOkResponse({ schema: arrayOf(supplierSchema) })
  list(@CurrentAuth() context: AuthContext) {
    return this.stockOps.listSuppliers(context);
  }

  @Post()
  @RequirePermissions("manage_purchasing")
  @ApiOperation({ summary: "Create a supplier." })
  @ApiBody({ schema: supplierCreateBodySchema })
  @ApiCreatedResponse({ schema: supplierSchema })
  @ApiValidationError()
  create(@CurrentAuth() context: AuthContext, @Body() body: unknown) {
    return this.stockOps.createSupplier(body, context);
  }

  @Patch(":id")
  @RequirePermissions("manage_purchasing")
  @ApiOperation({ summary: "Update supplier fields." })
  @ApiParam({ name: "id", example: "sup_001" })
  @ApiBody({ schema: supplierUpdateBodySchema })
  @ApiOkResponse({ schema: supplierSchema })
  @ApiValidationError()
  update(
    @CurrentAuth() context: AuthContext,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.stockOps.updateSupplier(id, body, context);
  }
}
