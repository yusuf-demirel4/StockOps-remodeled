import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ForecastChart } from "@/components/forecast-chart";
import { EmptyState, Panel } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import {
  aggregateDailyDemand,
  forecastDemand,
  generateSmartPurchaseSuggestions,
  type ForecastMethod,
} from "@stockops/core/forecast";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  AUTO: "Otomatik",
  MOVING_AVG: "Hareketli ortalama",
  EXPONENTIAL_SMOOTHING: "Üstel yumuşatma",
  HOLT_WINTERS: "Holt-Winters",
};

const ALLOWED_METHODS: ForecastMethod[] = [
  "AUTO",
  "MOVING_AVG",
  "EXPONENTIAL_SMOOTHING",
  "HOLT_WINTERS",
];

function clampInt(raw: string | undefined, min: number, max: number, fallback: number) {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function resolveMethod(raw: string | undefined): ForecastMethod {
  if (!raw) return "AUTO";
  const upper = raw.toUpperCase() as ForecastMethod;
  return ALLOWED_METHODS.includes(upper) ? upper : "AUTO";
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ForecastingPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);
  const params = (await searchParams) ?? {};

  const productId =
    readParam(params.productId) ?? snapshot.products[0]?.id ?? null;
  const horizon = clampInt(readParam(params.horizon), 1, 90, 14);
  const seasonLength = clampInt(readParam(params.seasonLength), 2, 60, 7);
  const method = resolveMethod(readParam(params.method));

  const product = snapshot.products.find((item) => item.id === productId);
  const history = product
    ? aggregateDailyDemand(snapshot.stockMovements, product.id)
    : [];
  const result = product
    ? forecastDemand(history, { horizon, method, seasonLength })
    : null;

  const orgSuggestions = (() => {
    const forecasts = snapshot.products
      .filter((item) => item.isActive)
      .slice(0, 50)
      .map((item) => {
        const series = aggregateDailyDemand(snapshot.stockMovements, item.id);
        if (series.length === 0) return null;
        const productResult = forecastDemand(series, {
          horizon: 14,
          method: "AUTO",
          seasonLength: 7,
        });
        const onHand = snapshot.stockRows
          .filter((row) => row.product.id === item.id)
          .reduce((sum, row) => sum + row.onHand, 0);
        const supplier = snapshot.suppliers.find((s) =>
          s.productIds.includes(item.id),
        );
        return {
          productId: item.id,
          result: productResult,
          onHand,
          leadTimeDays: supplier?.leadTimeDays ?? 7,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return generateSmartPurchaseSuggestions({ forecasts });
  })();

  return (
    <AppShell
      description="Geçmiş satış verilerinden talep tahmini ve akıllı satınalma önerileri."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Talep tahmini"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="grid gap-6 self-start">
          <Panel title="Tahmin parametreleri">
            <form className="grid gap-4 text-sm" method="get">
              <label className="grid gap-1">
                <span className="text-[var(--text-secondary)]">Ürün</span>
                <select
                  className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-input)] px-3 py-2 text-[var(--text-primary)]"
                  defaultValue={productId ?? ""}
                  name="productId"
                >
                  {snapshot.products.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sku} — {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-[var(--text-secondary)]">Yöntem</span>
                <select
                  className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-input)] px-3 py-2 text-[var(--text-primary)]"
                  defaultValue={method}
                  name="method"
                >
                  {ALLOWED_METHODS.map((option) => (
                    <option key={option} value={option}>
                      {METHOD_LABEL[option]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-[var(--text-secondary)]">Tahmin ufku (gün)</span>
                <input
                  className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-input)] px-3 py-2 text-[var(--text-primary)]"
                  defaultValue={horizon}
                  max={90}
                  min={1}
                  name="horizon"
                  type="number"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[var(--text-secondary)]">Mevsim uzunluğu (gün)</span>
                <input
                  className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-input)] px-3 py-2 text-[var(--text-primary)]"
                  defaultValue={seasonLength}
                  max={60}
                  min={2}
                  name="seasonLength"
                  type="number"
                />
              </label>
              <button
                className="rounded-md bg-[var(--accent-primary,#6366f1)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                type="submit"
              >
                Tahmini hesapla
              </button>
            </form>
          </Panel>
        </div>

        <div className="grid gap-6 self-start">
          <Panel title={product ? `${product.sku} — ${product.name}` : "Tahmin"}>
            {!product || !result ? (
              <EmptyState>Ürün seçin.</EmptyState>
            ) : history.length === 0 ? (
              <EmptyState>
                Bu ürün için geçmiş satış hareketi yok. Satış oluşturduktan sonra
                tahmin üretilebilir.
              </EmptyState>
            ) : (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <Stat label="Yöntem" value={METHOD_LABEL[result.method] ?? result.method} />
                  <Stat label="Geçmiş veri" value={`${history.length} gün`} />
                  <Stat
                    label="Ortalama hata (MAE)"
                    value={result.metrics ? result.metrics.mae.toFixed(2) : "—"}
                  />
                  <Stat
                    label="MAPE"
                    value={
                      result.metrics?.mape !== null && result.metrics?.mape !== undefined
                        ? `${result.metrics.mape.toFixed(1)}%`
                        : "—"
                    }
                  />
                </div>
                <ForecastChart result={result} />
              </div>
            )}
          </Panel>

          <Panel title="Akıllı satınalma önerileri">
            {orgSuggestions.length === 0 ? (
              <EmptyState>
                Tahmine dayalı satınalma önerisi yok. Satış geçmişi biriktikçe
                burada listelenecek.
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase text-[var(--text-secondary)]">
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-2 pr-3">Ürün</th>
                      <th className="py-2 pr-3">Yöntem</th>
                      <th className="py-2 pr-3 text-right">Günlük talep</th>
                      <th className="py-2 pr-3 text-right">Önerilen miktar</th>
                      <th className="py-2 pr-3 text-right">Güven</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgSuggestions.slice(0, 20).map((suggestion) => {
                      const matched = snapshot.products.find(
                        (item) => item.id === suggestion.productId,
                      );
                      return (
                        <tr
                          key={suggestion.productId}
                          className="border-b border-[var(--border-table)] last:border-0"
                        >
                          <td className="py-2 pr-3">
                            <Link
                              className="text-[var(--accent-primary,#6366f1)] hover:underline"
                              href={`/forecasting?productId=${suggestion.productId}`}
                            >
                              <span className="font-mono text-xs">
                                {matched?.sku ?? "?"}
                              </span>{" "}
                              <span className="text-[var(--text-secondary)]">
                                {matched?.name}
                              </span>
                            </Link>
                          </td>
                          <td className="py-2 pr-3 text-xs text-[var(--text-secondary)]">
                            {METHOD_LABEL[suggestion.method] ?? suggestion.method}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono">
                            {suggestion.averageDailyDemand.toFixed(1)}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono">
                            {suggestion.recommendedQuantity}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono">
                            {(suggestion.confidence * 100).toFixed(0)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="font-mono text-sm text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
