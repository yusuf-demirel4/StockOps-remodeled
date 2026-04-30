import { Injectable, NotFoundException } from "@nestjs/common";
import {
  aggregateDailyDemand,
  forecastDemand,
  type ForecastMethod,
  type ForecastResult,
  type TimeSeriesPoint,
} from "@stockops/core/forecast";
import type { AuthContext, StockMovement, StockMovementType } from "@stockops/core/types";
import { createInitialState } from "@stockops/core/demo-data";
import { getPrisma } from "@stockops/db";

const HISTORY_LIMIT_DAYS = 180;
const MAX_PRODUCTS_FOR_ORG_FORECAST = 100;

const globalForApiDemo = globalThis as typeof globalThis & {
  stockOpsApiState?: ReturnType<typeof createInitialState>;
};

function demoState() {
  globalForApiDemo.stockOpsApiState ??= createInitialState();
  return globalForApiDemo.stockOpsApiState;
}

function dbMode() {
  return process.env.APP_DATA_SOURCE === "database";
}

export type ForecastQueryOptions = {
  horizon: number;
  method: ForecastMethod;
  windowSize?: number;
  alpha?: number;
  beta?: number;
  gamma?: number;
  seasonLength?: number;
  warehouseId?: string;
};

function parseFraction(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function parseInteger(
  value: string | undefined,
  { min, max, fallback }: { min: number; max: number; fallback: number },
): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function parseForecastQuery(query: Record<string, string>): ForecastQueryOptions {
  const horizon = parseInteger(query.horizon, { min: 1, max: 365, fallback: 14 });
  const seasonLength = parseInteger(query.seasonLength, { min: 2, max: 365, fallback: 7 });
  const windowSize = parseInteger(query.windowSize, { min: 1, max: 90, fallback: 7 });

  const allowedMethods: ForecastMethod[] = [
    "AUTO",
    "MOVING_AVG",
    "EXPONENTIAL_SMOOTHING",
    "HOLT_WINTERS",
  ];
  const requestedMethod = (query.method ?? "AUTO").toUpperCase() as ForecastMethod;
  const method = allowedMethods.includes(requestedMethod) ? requestedMethod : "AUTO";

  return {
    horizon,
    method,
    windowSize,
    alpha: parseFraction(query.alpha),
    beta: parseFraction(query.beta),
    gamma: parseFraction(query.gamma),
    seasonLength,
    warehouseId: query.warehouseId && query.warehouseId.length > 0 ? query.warehouseId : undefined,
  };
}

@Injectable()
export class ForecastingService {
  async forecastProduct(
    productId: string,
    context: AuthContext,
    options: ForecastQueryOptions,
  ): Promise<ForecastResult & { productId: string; productName: string; productSku: string }> {
    const product = await this.fetchProduct(productId, context);
    const movements = await this.fetchMovementsForProduct(productId, context);

    const series = aggregateDailyDemand(movements, productId, {
      warehouseId: options.warehouseId,
    });

    const result = forecastDemand(series, {
      method: options.method,
      horizon: options.horizon,
      windowSize: options.windowSize,
      alpha: options.alpha,
      beta: options.beta,
      gamma: options.gamma,
      seasonLength: options.seasonLength,
    });

    return {
      ...result,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
    };
  }

  async forecastOrganization(
    context: AuthContext,
    options: ForecastQueryOptions,
  ): Promise<
    Array<
      ForecastResult & {
        productId: string;
        productName: string;
        productSku: string;
        historyDays: number;
      }
    >
  > {
    const products = await this.fetchActiveProducts(context);
    const movements = await this.fetchAllRecentMovements(context);

    return products
      .slice(0, MAX_PRODUCTS_FOR_ORG_FORECAST)
      .map((product) => {
        const series: TimeSeriesPoint[] = aggregateDailyDemand(
          movements,
          product.id,
          { warehouseId: options.warehouseId },
        );

        const result = forecastDemand(series, {
          method: options.method,
          horizon: options.horizon,
          windowSize: options.windowSize,
          alpha: options.alpha,
          beta: options.beta,
          gamma: options.gamma,
          seasonLength: options.seasonLength,
        });

        return {
          ...result,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          historyDays: series.length,
        };
      })
      .filter((entry) => entry.historyDays > 0);
  }

  private async fetchProduct(productId: string, context: AuthContext) {
    if (dbMode()) {
      const product = await getPrisma().product.findFirst({
        where: { id: productId, organizationId: context.organization.id },
        select: { id: true, name: true, sku: true },
      });

      if (!product) {
        throw new NotFoundException("Product not found.");
      }

      return product;
    }

    const product = demoState().products.find(
      (item) =>
        item.id === productId &&
        item.organizationId === context.organization.id,
    );

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    return { id: product.id, name: product.name, sku: product.sku };
  }

  private async fetchActiveProducts(context: AuthContext) {
    if (dbMode()) {
      return getPrisma().product.findMany({
        where: { organizationId: context.organization.id, isActive: true },
        select: { id: true, name: true, sku: true },
        orderBy: { sku: "asc" },
      });
    }

    return demoState()
      .products.filter(
        (product) =>
          product.organizationId === context.organization.id && product.isActive,
      )
      .map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
      }));
  }

  private async fetchMovementsForProduct(
    productId: string,
    context: AuthContext,
  ): Promise<StockMovement[]> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - HISTORY_LIMIT_DAYS);

    if (dbMode()) {
      const movements = await getPrisma().stockMovement.findMany({
        where: {
          organizationId: context.organization.id,
          productId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "asc" },
      });

      return movements.map((movement) => ({
        id: movement.id,
        organizationId: movement.organizationId,
        warehouseId: movement.warehouseId,
        productId: movement.productId,
        type: movement.type as StockMovementType,
        quantityChange: movement.quantityChange,
        reference: movement.reference ?? undefined,
        note: movement.note ?? undefined,
        createdById: movement.createdById ?? undefined,
        createdAt: movement.createdAt.toISOString(),
      }));
    }

    return demoState().stockMovements.filter(
      (movement) =>
        movement.organizationId === context.organization.id &&
        movement.productId === productId &&
        new Date(movement.createdAt) >= since,
    );
  }

  private async fetchAllRecentMovements(
    context: AuthContext,
  ): Promise<StockMovement[]> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - HISTORY_LIMIT_DAYS);

    if (dbMode()) {
      const movements = await getPrisma().stockMovement.findMany({
        where: {
          organizationId: context.organization.id,
          type: { in: ["SALE", "OUTBOUND"] },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "asc" },
      });

      return movements.map((movement) => ({
        id: movement.id,
        organizationId: movement.organizationId,
        warehouseId: movement.warehouseId,
        productId: movement.productId,
        type: movement.type as StockMovementType,
        quantityChange: movement.quantityChange,
        reference: movement.reference ?? undefined,
        note: movement.note ?? undefined,
        createdById: movement.createdById ?? undefined,
        createdAt: movement.createdAt.toISOString(),
      }));
    }

    return demoState().stockMovements.filter(
      (movement) =>
        movement.organizationId === context.organization.id &&
        (movement.type === "SALE" || movement.type === "OUTBOUND") &&
        new Date(movement.createdAt) >= since,
    );
  }
}
