"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ForecastResult } from "@stockops/core/forecast";

type Props = {
  result: ForecastResult;
};

type ChartRow = {
  date: string;
  history: number | null;
  forecast: number | null;
  band: [number, number] | null;
};

export function ForecastChart({ result }: Props) {
  const data = useMemo<ChartRow[]>(() => {
    const historyRows: ChartRow[] = result.history.map((point) => ({
      date: point.date,
      history: point.value,
      forecast: null,
      band: null,
    }));

    const lastHistory = result.history[result.history.length - 1];
    const transition: ChartRow[] = lastHistory
      ? [
          {
            date: lastHistory.date,
            history: lastHistory.value,
            forecast: lastHistory.value,
            band: [lastHistory.value, lastHistory.value],
          },
        ]
      : [];

    const forecastRows: ChartRow[] = result.forecast.map((point) => ({
      date: point.date,
      history: null,
      forecast: point.value,
      band: [point.lower, point.upper],
    }));

    if (transition.length > 0) {
      historyRows[historyRows.length - 1] = {
        ...historyRows[historyRows.length - 1],
        forecast: transition[0].forecast,
        band: transition[0].band,
      };
    }

    return [...historyRows, ...forecastRows];
  }, [result]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--text-secondary)]">
        Gösterilecek geçmiş veri yok.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border-subtle, #2d3748)" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="var(--text-secondary, #94a3b8)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--text-secondary, #94a3b8)" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "var(--surface-overlay, #0f172a)",
              border: "1px solid var(--border-subtle, #1e293b)",
              borderRadius: 8,
              color: "var(--text-primary, #f1f5f9)",
              fontSize: 12,
            }}
            formatter={(value, name) => {
              if (value === undefined || value === null) {
                return ["—", String(name)];
              }
              if (Array.isArray(value)) {
                return [
                  `${Number(value[0]).toFixed(1)} – ${Number(value[1]).toFixed(1)}`,
                  String(name),
                ];
              }
              return [Number(value).toFixed(1), String(name)];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="band"
            name="Belirsizlik aralığı"
            stroke="transparent"
            fill="var(--chart-3, #f59e0b)"
            fillOpacity={0.18}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="history"
            name="Geçmiş talep"
            stroke="var(--chart-1, #6366f1)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Tahmin"
            stroke="var(--chart-3, #f59e0b)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
