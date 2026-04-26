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
  customerSchema,
  customerCreateBodySchema,
  customerUpdateBodySchema,
} from "../openapi/schemas";

@ApiTags("Customers")
@ApiTokenSecurity()
@Controller("customers")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(
    @Inject(StockOpsApiService)
    private readonly stockOps: StockOpsApiService,
  ) {}

  @Get()
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List customers. Supports cursor pagination via ?cursor=&limit= query params." })
  @ApiOkResponse({ schema: arrayOf(customerSchema) })
  list(
    @CurrentAuth() context: AuthContext,
    @Query() query: Record<string, string>,
  ) {
    const hasPagination = query.cursor !== undefined || query.limit !== undefined;
    return this.stockOps.listCustomers(context, hasPagination ? query : undefined);
  }

  @Post()
  @RequirePermissions("manage_sales")
  @ApiOperation({ summary: "Create a customer." })
  @ApiBody({ schema: customerCreateBodySchema })
  @ApiCreatedResponse({ schema: customerSchema })
  @ApiValidationError()
  create(@CurrentAuth() context: AuthContext, @Body() body: unknown) {
    return this.stockOps.createCustomer(body, context);
  }

  @Patch(":id")
  @RequirePermissions("manage_sales")
  @ApiOperation({ summary: "Update customer details." })
  @ApiParam({ name: "id", example: "cus_001" })
  @ApiBody({ schema: customerUpdateBodySchema })
  @ApiOkResponse({ schema: customerSchema })
  @ApiValidationError()
  update(
    @CurrentAuth() context: AuthContext,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.stockOps.updateCustomer(id, body, context);
  }
}
