import type {
  CircuitBreakerState,
  TrendyolConfig,
  TrendyolInventoryItem,
  TrendyolOrdersResponse,
  TrendyolProductsResponse,
} from "./types";

const DEFAULT_BASE_URL = "https://api.trendyol.com/sapigw";
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

export class TrendyolClient {
  private config: TrendyolConfig;
  private circuitState: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private lastFailureAt = 0;

  constructor(config: TrendyolConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
    };
  }

  private get baseUrl() {
    return `${this.config.baseUrl}/suppliers/${this.config.supplierId}`;
  }

  private get headers(): Record<string, string> {
    const credentials = btoa(`${this.config.apiKey}:${this.config.apiSecret}`);
    return {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
      "User-Agent": `${this.config.supplierId} - StockOps`,
    };
  }

  getCircuitState(): CircuitBreakerState {
    if (this.circuitState === "OPEN") {
      if (Date.now() - this.lastFailureAt > CIRCUIT_BREAKER_RESET_MS) {
        this.circuitState = "HALF_OPEN";
      }
    }
    return this.circuitState;
  }

  private onSuccess() {
    this.failureCount = 0;
    this.circuitState = "CLOSED";
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureAt = Date.now();
    if (this.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitState = "OPEN";
    }
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const state = this.getCircuitState();
    if (state === "OPEN") {
      throw new TrendyolCircuitOpenError(
        "Circuit breaker is open. Trendyol API requests are paused.",
      );
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers: { ...this.headers, ...options?.headers },
        });

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After")) || 5;
          await sleep(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new TrendyolApiError(
            `Trendyol API ${response.status}: ${body}`,
            response.status,
          );
        }

        const data = await response.json();
        this.onSuccess();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (
          error instanceof TrendyolApiError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 429
        ) {
          this.onFailure();
          throw error;
        }

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
        }
      }
    }

    this.onFailure();
    throw lastError ?? new Error("Trendyol API request failed");
  }

  async getOrders(params?: {
    status?: string;
    startDate?: number;
    endDate?: number;
    page?: number;
    size?: number;
  }): Promise<TrendyolOrdersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.startDate) searchParams.set("startDate", String(params.startDate));
    if (params?.endDate) searchParams.set("endDate", String(params.endDate));
    if (params?.page !== undefined) searchParams.set("page", String(params.page));
    if (params?.size !== undefined) searchParams.set("size", String(params.size));

    const query = searchParams.toString();
    return this.request<TrendyolOrdersResponse>(
      `/orders${query ? `?${query}` : ""}`,
    );
  }

  async getProducts(params?: {
    barcode?: string;
    page?: number;
    size?: number;
  }): Promise<TrendyolProductsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.barcode) searchParams.set("barcode", params.barcode);
    if (params?.page !== undefined) searchParams.set("page", String(params.page));
    if (params?.size !== undefined) searchParams.set("size", String(params.size));

    const query = searchParams.toString();
    return this.request<TrendyolProductsResponse>(
      `/products${query ? `?${query}` : ""}`,
    );
  }

  async updatePriceAndInventory(items: TrendyolInventoryItem[]): Promise<{ batchRequestId: string }> {
    return this.request<{ batchRequestId: string }>(
      "/products/price-and-inventory",
      {
        method: "POST",
        body: JSON.stringify({ items }),
      },
    );
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TrendyolApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TrendyolApiError";
  }
}

export class TrendyolCircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrendyolCircuitOpenError";
  }
}
