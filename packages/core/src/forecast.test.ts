import { describe, expect, it } from "vitest";

import {
  aggregateDailyDemand,
  aggregateDailyDemandFromSales,
  backtestMetrics,
  exponentialSmoothingForecast,
  forecastDemand,
  generateSmartPurchaseSuggestions,
  holtWintersForecast,
  movingAverageForecast,
  type TimeSeriesPoint,
} from "./forecast";
import type { SalesOrder, StockMovement } from "./types";

const day = (offset: number) => {
  const base = new Date("2026-04-01T00:00:00.000Z");
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
};

const flatSeries: TimeSeriesPoint[] = Array.from({ length: 14 }, (_, index) => ({
  date: day(index),
  value: 10,
}));

const trendingSeries: TimeSeriesPoint[] = Array.from({ length: 14 }, (_, index) => ({
  date: day(index),
  value: 5 + index,
}));

const seasonalSeries: TimeSeriesPoint[] = Array.from({ length: 28 }, (_, index) => ({
  date: day(index),
  value: 10 + (index % 7 === 6 ? 20 : 0),
}));

describe("movingAverageForecast", () => {
  it("returns the trailing window average for every horizon step", () => {
    const result = movingAverageForecast(flatSeries, 5, 7);
    expect(result.values).toHaveLength(5);
    expect(result.values.every((value) => value === 10)).toBe(true);
    expect(result.lastAverage).toBe(10);
  });

  it("clamps window size to history length", () => {
    const result = movingAverageForecast(flatSeries.slice(0, 3), 2, 10);
    expect(result.values).toEqual([10, 10]);
  });

  it("returns empty values when history is empty", () => {
    expect(movingAverageForecast([], 5).values).toEqual([]);
  });
});

describe("exponentialSmoothingForecast", () => {
  it("converges to the steady-state value", () => {
    const result = exponentialSmoothingForecast(flatSeries, 3, 0.4);
    expect(result.values).toHaveLength(3);
    result.values.forEach((value) => expect(value).toBeCloseTo(10, 5));
  });

  it("clamps alpha into [0,1]", () => {
    const result = exponentialSmoothingForecast(trendingSeries, 1, 5);
    expect(Number.isFinite(result.level)).toBe(true);
  });
});

describe("holtWintersForecast", () => {
  it("returns null when history is shorter than two seasons", () => {
    expect(holtWintersForecast(flatSeries.slice(0, 6), 3, 0.4, 0.1, 0.2, 7)).toBeNull();
  });

  it("captures weekly seasonality", () => {
    const result = holtWintersForecast(seasonalSeries, 7, 0.4, 0.1, 0.5, 7);
    expect(result).not.toBeNull();
    expect(result!.values).toHaveLength(7);

    const peak = Math.max(...result!.values);
    const trough = Math.min(...result!.values);
    expect(peak - trough).toBeGreaterThan(5);
  });
});

describe("backtestMetrics", () => {
  it("computes MAE, RMSE, and MAPE", () => {
    const metrics = backtestMetrics([10, 20, 30], [12, 18, 33]);
    expect(metrics.mae).toBeCloseTo((2 + 2 + 3) / 3, 5);
    expect(metrics.rmse).toBeCloseTo(Math.sqrt((4 + 4 + 9) / 3), 5);
    expect(metrics.mape).not.toBeNull();
    expect(metrics.sampleSize).toBe(3);
  });

  it("returns null MAPE when all actuals are zero", () => {
    const metrics = backtestMetrics([0, 0], [1, 2]);
    expect(metrics.mape).toBeNull();
  });

  it("handles empty input", () => {
    const metrics = backtestMetrics([], []);
    expect(metrics.sampleSize).toBe(0);
  });
});

describe("forecastDemand auto-selection", () => {
  it("uses Holt-Winters when enough seasonal history exists", () => {
    const result = forecastDemand(seasonalSeries, { horizon: 7, seasonLength: 7 });
    expect(result.method).toBe("HOLT_WINTERS");
    expect(result.forecast).toHaveLength(7);
    expect(result.metrics).not.toBeNull();
  });

  it("falls back to exponential smoothing for shorter series", () => {
    const result = forecastDemand(flatSeries.slice(0, 8), { horizon: 3, seasonLength: 7 });
    expect(result.method).toBe("EXPONENTIAL_SMOOTHING");
  });

  it("falls back to moving average for very short series", () => {
    const result = forecastDemand(flatSeries.slice(0, 3), { horizon: 2, seasonLength: 7 });
    expect(result.method).toBe("MOVING_AVG");
  });

  it("clamps forecast values to non-negative", () => {
    const negativeTrend: TimeSeriesPoint[] = Array.from({ length: 30 }, (_, index) => ({
      date: day(index),
      value: Math.max(0, 20 - index),
    }));
    const result = forecastDemand(negativeTrend, { horizon: 14, method: "HOLT_WINTERS", seasonLength: 7 });
    result.forecast.forEach((point) => {
      expect(point.value).toBeGreaterThanOrEqual(0);
      expect(point.lower).toBeGreaterThanOrEqual(0);
    });
  });

  it("produces sequential dates after the last history point", () => {
    const result = forecastDemand(flatSeries, { horizon: 3, method: "MOVING_AVG" });
    expect(result.forecast.map((point) => point.date)).toEqual([day(14), day(15), day(16)]);
  });
});

describe("aggregateDailyDemand from stock movements", () => {
  const movements: StockMovement[] = [
    {
      id: "m1",
      organizationId: "org",
      warehouseId: "wh",
      productId: "p1",
      type: "SALE",
      quantityChange: -5,
      createdAt: "2026-04-10T08:00:00.000Z",
    },
    {
      id: "m2",
      organizationId: "org",
      warehouseId: "wh",
      productId: "p1",
      type: "SALE",
      quantityChange: -3,
      createdAt: "2026-04-10T20:00:00.000Z",
    },
    {
      id: "m3",
      organizationId: "org",
      warehouseId: "wh",
      productId: "p1",
      type: "INBOUND",
      quantityChange: 50,
      createdAt: "2026-04-11T10:00:00.000Z",
    },
    {
      id: "m4",
      organizationId: "org",
      warehouseId: "wh",
      productId: "p1",
      type: "SALE",
      quantityChange: -2,
      createdAt: "2026-04-12T09:00:00.000Z",
    },
  ];

  it("sums absolute outbound quantities per day and fills gaps", () => {
    const series = aggregateDailyDemand(movements, "p1");
    expect(series).toHaveLength(3);
    expect(series[0]).toEqual({ date: "2026-04-10", value: 8 });
    expect(series[1]).toEqual({ date: "2026-04-11", value: 0 });
    expect(series[2]).toEqual({ date: "2026-04-12", value: 2 });
  });

  it("filters by warehouse when requested", () => {
    const series = aggregateDailyDemand(movements, "p1", { warehouseId: "other" });
    expect(series).toEqual([]);
  });
});

describe("aggregateDailyDemandFromSales", () => {
  const orders: SalesOrder[] = [
    {
      id: "o1",
      organizationId: "org",
      code: "SO-1",
      customerName: "Acme",
      status: "DRAFT",
      lines: [{ productId: "p1", quantity: 5 }],
      createdAt: "2026-04-10T08:00:00.000Z",
    },
    {
      id: "o2",
      organizationId: "org",
      code: "SO-2",
      customerName: "Acme",
      status: "CONFIRMED",
      lines: [{ productId: "p1", quantity: 4 }, { productId: "p2", quantity: 1 }],
      createdAt: "2026-04-12T08:00:00.000Z",
    },
    {
      id: "o3",
      organizationId: "org",
      code: "SO-3",
      customerName: "Acme",
      status: "SHIPPED",
      lines: [{ productId: "p1", quantity: 2 }],
      createdAt: "2026-04-12T10:00:00.000Z",
    },
  ];

  it("ignores draft orders and aggregates per day", () => {
    const series = aggregateDailyDemandFromSales(orders, "p1");
    expect(series).toEqual([{ date: "2026-04-12", value: 6 }]);
  });
});

describe("generateSmartPurchaseSuggestions", () => {
  it("recommends quantity to cover lead-time + safety horizon", () => {
    const result = forecastDemand(flatSeries, { horizon: 14, method: "MOVING_AVG", windowSize: 7 });
    const suggestions = generateSmartPurchaseSuggestions({
      forecasts: [
        { productId: "p1", result, onHand: 20, leadTimeDays: 7, safetyStockDays: 3 },
      ],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].recommendedQuantity).toBe(80);
    expect(suggestions[0].method).toBe("MOVING_AVG");
  });

  it("filters out items where stock is sufficient", () => {
    const result = forecastDemand(flatSeries, { horizon: 14, method: "MOVING_AVG", windowSize: 7 });
    const suggestions = generateSmartPurchaseSuggestions({
      forecasts: [
        { productId: "p1", result, onHand: 1000, leadTimeDays: 7 },
      ],
    });

    expect(suggestions).toHaveLength(0);
  });
});
