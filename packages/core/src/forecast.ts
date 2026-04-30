import type { SalesOrder, StockMovement } from "./types";

export type ForecastMethod =
  | "MOVING_AVG"
  | "EXPONENTIAL_SMOOTHING"
  | "HOLT_WINTERS"
  | "AUTO";

export type TimeSeriesPoint = {
  date: string;
  value: number;
};

export type ForecastPoint = {
  date: string;
  value: number;
  lower: number;
  upper: number;
};

export type ForecastMetrics = {
  mae: number;
  rmse: number;
  mape: number | null;
  sampleSize: number;
};

export type ForecastResult = {
  method: Exclude<ForecastMethod, "AUTO">;
  history: TimeSeriesPoint[];
  forecast: ForecastPoint[];
  metrics: ForecastMetrics | null;
  parameters: Record<string, number>;
};

export type ForecastOptions = {
  method?: ForecastMethod;
  horizon: number;
  windowSize?: number;
  alpha?: number;
  beta?: number;
  gamma?: number;
  seasonLength?: number;
  confidenceZ?: number;
};

const DEFAULT_WINDOW = 7;
const DEFAULT_ALPHA = 0.4;
const DEFAULT_BETA = 0.1;
const DEFAULT_GAMMA = 0.2;
const DEFAULT_SEASON = 7;
const DEFAULT_CONFIDENCE_Z = 1.96;

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function addDays(iso: string, days: number) {
  const base = new Date(iso);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function toDateOnly(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function aggregateDailyDemand(
  movements: StockMovement[],
  productId: string,
  options?: { warehouseId?: string },
): TimeSeriesPoint[] {
  const buckets = new Map<string, number>();

  for (const movement of movements) {
    if (movement.productId !== productId) continue;
    if (options?.warehouseId && movement.warehouseId !== options.warehouseId) {
      continue;
    }
    if (movement.type !== "SALE" && movement.type !== "OUTBOUND") continue;

    const day = toDateOnly(movement.createdAt);
    const sold = Math.abs(movement.quantityChange);
    buckets.set(day, (buckets.get(day) ?? 0) + sold);
  }

  return fillDailyGaps(buckets);
}

export function aggregateDailyDemandFromSales(
  salesOrders: SalesOrder[],
  productId: string,
): TimeSeriesPoint[] {
  const buckets = new Map<string, number>();

  for (const order of salesOrders) {
    if (
      order.status !== "CONFIRMED" &&
      order.status !== "PICKING" &&
      order.status !== "PACKED" &&
      order.status !== "SHIPPED" &&
      order.status !== "DELIVERED"
    ) {
      continue;
    }

    const day = toDateOnly(order.createdAt);
    const quantity = order.lines
      .filter((line) => line.productId === productId)
      .reduce((sum, line) => sum + line.quantity, 0);

    if (quantity === 0) continue;
    buckets.set(day, (buckets.get(day) ?? 0) + quantity);
  }

  return fillDailyGaps(buckets);
}

function fillDailyGaps(buckets: Map<string, number>): TimeSeriesPoint[] {
  if (buckets.size === 0) return [];

  const sortedDays = Array.from(buckets.keys()).sort();
  const start = sortedDays[0];
  const end = sortedDays[sortedDays.length - 1];

  const result: TimeSeriesPoint[] = [];
  let cursor = start;

  while (cursor <= end) {
    result.push({ date: cursor, value: buckets.get(cursor) ?? 0 });
    cursor = addDays(cursor, 1);
  }

  return result;
}

export function movingAverageForecast(
  history: TimeSeriesPoint[],
  horizon: number,
  windowSize: number = DEFAULT_WINDOW,
): { values: number[]; lastAverage: number } {
  if (history.length === 0 || horizon <= 0) {
    return { values: [], lastAverage: 0 };
  }

  const effectiveWindow = Math.max(1, Math.min(windowSize, history.length));
  const window = history.slice(-effectiveWindow).map((point) => point.value);
  const average = mean(window);

  return {
    values: Array.from({ length: horizon }, () => average),
    lastAverage: average,
  };
}

export function exponentialSmoothingForecast(
  history: TimeSeriesPoint[],
  horizon: number,
  alpha: number = DEFAULT_ALPHA,
): { values: number[]; level: number; fitted: number[] } {
  if (history.length === 0 || horizon <= 0) {
    return { values: [], level: 0, fitted: [] };
  }

  const a = clamp01(alpha);
  let level = history[0].value;
  const fitted: number[] = [level];

  for (let index = 1; index < history.length; index += 1) {
    level = a * history[index].value + (1 - a) * level;
    fitted.push(level);
  }

  return {
    values: Array.from({ length: horizon }, () => level),
    level,
    fitted,
  };
}

export function holtWintersForecast(
  history: TimeSeriesPoint[],
  horizon: number,
  alpha: number = DEFAULT_ALPHA,
  beta: number = DEFAULT_BETA,
  gamma: number = DEFAULT_GAMMA,
  seasonLength: number = DEFAULT_SEASON,
): { values: number[]; fitted: number[] } | null {
  const m = Math.max(2, Math.floor(seasonLength));

  if (history.length < m * 2) return null;
  if (horizon <= 0) return { values: [], fitted: [] };

  const a = clamp01(alpha);
  const b = clamp01(beta);
  const g = clamp01(gamma);

  const values = history.map((point) => point.value);

  const initialLevel = mean(values.slice(0, m));
  const secondSeasonMean = mean(values.slice(m, m * 2));
  let level = initialLevel;
  let trend = (secondSeasonMean - initialLevel) / m;

  const seasonals: number[] = new Array(m).fill(0);
  for (let i = 0; i < m; i += 1) {
    seasonals[i] = values[i] - initialLevel;
  }

  const fitted: number[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const previousLevel = level;
    const seasonalIndex = index % m;
    const observed = values[index];
    const seasonalComponent = seasonals[seasonalIndex];

    const deseasonalised = observed - seasonalComponent;
    level = a * deseasonalised + (1 - a) * (previousLevel + trend);
    trend = b * (level - previousLevel) + (1 - b) * trend;
    seasonals[seasonalIndex] =
      g * (observed - level) + (1 - g) * seasonalComponent;

    fitted.push(previousLevel + trend + seasonalComponent);
  }

  const forecastValues: number[] = [];
  for (let step = 1; step <= horizon; step += 1) {
    const seasonalIndex = (values.length - 1 + step) % m;
    forecastValues.push(level + step * trend + seasonals[seasonalIndex]);
  }

  return { values: forecastValues, fitted };
}

export function backtestMetrics(
  actuals: number[],
  predictions: number[],
): ForecastMetrics {
  const length = Math.min(actuals.length, predictions.length);
  if (length === 0) {
    return { mae: 0, rmse: 0, mape: null, sampleSize: 0 };
  }

  let absSum = 0;
  let squaredSum = 0;
  let percentSum = 0;
  let percentCount = 0;

  for (let index = 0; index < length; index += 1) {
    const error = actuals[index] - predictions[index];
    absSum += Math.abs(error);
    squaredSum += error * error;
    if (actuals[index] !== 0) {
      percentSum += Math.abs(error / actuals[index]);
      percentCount += 1;
    }
  }

  return {
    mae: absSum / length,
    rmse: Math.sqrt(squaredSum / length),
    mape: percentCount > 0 ? (percentSum / percentCount) * 100 : null,
    sampleSize: length,
  };
}

function residualStdDev(actuals: number[], fitted: number[]): number {
  const length = Math.min(actuals.length, fitted.length);
  if (length < 2) return 0;

  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    const residual = actuals[index] - fitted[index];
    sum += residual * residual;
  }

  return Math.sqrt(sum / (length - 1));
}

function pickAutoMethod(
  history: TimeSeriesPoint[],
  seasonLength: number,
): Exclude<ForecastMethod, "AUTO"> {
  if (history.length >= seasonLength * 2) return "HOLT_WINTERS";
  if (history.length >= 4) return "EXPONENTIAL_SMOOTHING";
  return "MOVING_AVG";
}

export function forecastDemand(
  history: TimeSeriesPoint[],
  options: ForecastOptions,
): ForecastResult {
  const horizon = Math.max(0, Math.floor(options.horizon));
  const seasonLength = Math.max(2, Math.floor(options.seasonLength ?? DEFAULT_SEASON));
  const windowSize = Math.max(1, Math.floor(options.windowSize ?? DEFAULT_WINDOW));
  const alpha = clamp01(options.alpha ?? DEFAULT_ALPHA);
  const beta = clamp01(options.beta ?? DEFAULT_BETA);
  const gamma = clamp01(options.gamma ?? DEFAULT_GAMMA);
  const z = options.confidenceZ ?? DEFAULT_CONFIDENCE_Z;

  const requested = options.method ?? "AUTO";
  const resolved =
    requested === "AUTO" ? pickAutoMethod(history, seasonLength) : requested;

  const baseResult = (
    method: Exclude<ForecastMethod, "AUTO">,
    values: number[],
    fitted: number[] | null,
    parameters: Record<string, number>,
  ): ForecastResult => {
    const lastDate =
      history.length > 0 ? history[history.length - 1].date : null;

    const forecast: ForecastPoint[] = values.map((value, index) => {
      const date = lastDate ? addDays(lastDate, index + 1) : `t+${index + 1}`;
      const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);
      const std = fitted
        ? residualStdDev(
            history.map((point) => point.value),
            fitted,
          )
        : 0;
      const margin = z * std * Math.sqrt(index + 1);
      return {
        date,
        value: safeValue,
        lower: Math.max(0, safeValue - margin),
        upper: safeValue + margin,
      };
    });

    const metrics = fitted
      ? backtestMetrics(
          history.map((point) => point.value),
          fitted,
        )
      : null;

    return {
      method,
      history,
      forecast,
      metrics,
      parameters,
    };
  };

  if (history.length === 0) {
    return baseResult(resolved, [], null, {});
  }

  if (resolved === "HOLT_WINTERS") {
    const result = holtWintersForecast(
      history,
      horizon,
      alpha,
      beta,
      gamma,
      seasonLength,
    );

    if (result) {
      return baseResult(resolved, result.values, result.fitted, {
        alpha,
        beta,
        gamma,
        seasonLength,
      });
    }
  }

  if (
    resolved === "EXPONENTIAL_SMOOTHING" ||
    resolved === "HOLT_WINTERS"
  ) {
    const result = exponentialSmoothingForecast(history, horizon, alpha);
    return baseResult(
      resolved === "HOLT_WINTERS" ? "EXPONENTIAL_SMOOTHING" : resolved,
      result.values,
      result.fitted,
      { alpha },
    );
  }

  const result = movingAverageForecast(history, horizon, windowSize);
  const fitted = history.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    return mean(history.slice(start, index + 1).map((point) => point.value));
  });

  return baseResult(resolved, result.values, fitted, { windowSize });
}

export type SuggestedPurchaseOrder = {
  productId: string;
  averageDailyDemand: number;
  forecastTotal: number;
  recommendedQuantity: number;
  method: Exclude<ForecastMethod, "AUTO">;
  confidence: number;
};

export function generateSmartPurchaseSuggestions(params: {
  forecasts: Array<{ productId: string; result: ForecastResult; onHand: number; leadTimeDays: number; safetyStockDays?: number }>;
}): SuggestedPurchaseOrder[] {
  return params.forecasts
    .map(({ productId, result, onHand, leadTimeDays, safetyStockDays = 3 }) => {
      const horizonDays = leadTimeDays + safetyStockDays;
      const slice = result.forecast.slice(0, horizonDays);
      const forecastTotal = slice.reduce((sum, point) => sum + point.value, 0);
      const averageDailyDemand =
        slice.length > 0 ? forecastTotal / slice.length : 0;
      const recommendedQuantity = Math.max(
        0,
        Math.ceil(forecastTotal - onHand),
      );

      const mape = result.metrics?.mape ?? null;
      const confidence =
        mape === null ? 0.5 : Math.max(0, Math.min(1, 1 - mape / 100));

      return {
        productId,
        averageDailyDemand,
        forecastTotal,
        recommendedQuantity,
        method: result.method,
        confidence,
      };
    })
    .filter((suggestion) => suggestion.recommendedQuantity > 0)
    .sort((a, b) => b.recommendedQuantity - a.recommendedQuantity);
}
