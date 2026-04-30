import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import type { AuthContext } from "@stockops/core/types";

import { ApiAuthGuard } from "../auth/api-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { ApiTokenSecurity } from "../openapi/decorators";
import { arrayOf, forecastResultSchema } from "../openapi/schemas";

import { ForecastingService, parseForecastQuery } from "./forecasting.service";

@ApiTags("Forecasting")
@ApiTokenSecurity()
@Controller("forecasting")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class ForecastingController {
  constructor(
    @Inject(ForecastingService)
    private readonly forecasting: ForecastingService,
  ) {}

  @Get("products/:productId")
  @RequirePermissions("view_dashboard")
  @ApiOperation({
    summary:
      "Forecast demand for a product using moving average, exponential smoothing or Holt-Winters.",
  })
  @ApiQuery({ name: "horizon", required: false, schema: { type: "integer", minimum: 1, maximum: 365 } })
  @ApiQuery({
    name: "method",
    required: false,
    schema: {
      type: "string",
      enum: ["AUTO", "MOVING_AVG", "EXPONENTIAL_SMOOTHING", "HOLT_WINTERS"],
    },
  })
  @ApiQuery({ name: "seasonLength", required: false, schema: { type: "integer" } })
  @ApiQuery({ name: "windowSize", required: false, schema: { type: "integer" } })
  @ApiQuery({ name: "alpha", required: false, schema: { type: "number" } })
  @ApiQuery({ name: "beta", required: false, schema: { type: "number" } })
  @ApiQuery({ name: "gamma", required: false, schema: { type: "number" } })
  @ApiQuery({ name: "warehouseId", required: false, schema: { type: "string" } })
  @ApiOkResponse({ schema: forecastResultSchema })
  forecastProduct(
    @CurrentAuth() context: AuthContext,
    @Param("productId") productId: string,
    @Query() query: Record<string, string>,
  ) {
    const options = parseForecastQuery(query ?? {});
    return this.forecasting.forecastProduct(productId, context, options);
  }

  @Get("organization")
  @RequirePermissions("view_dashboard")
  @ApiOperation({
    summary: "Forecast demand for every active product in the organization.",
  })
  @ApiOkResponse({ schema: arrayOf(forecastResultSchema) })
  forecastOrganization(
    @CurrentAuth() context: AuthContext,
    @Query() query: Record<string, string>,
  ) {
    const options = parseForecastQuery(query ?? {});
    return this.forecasting.forecastOrganization(context, options);
  }
}
