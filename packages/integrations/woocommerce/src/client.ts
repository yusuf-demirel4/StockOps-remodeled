import type {
  CircuitBreakerState,
  WooCommerceConfig,
  WooOrder,
  WooProduct,
  WooVariation,
} from "./types";

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

export class WooCommerceClient {
  private config: WooCommerceConfig;
  private circuitState: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private lastFailureAt = 0;

  constructor(config: WooCommerceConfig) {
    this.config = config;
  }

  private get baseUrl() {
    return `${this.config.siteUrl}/wp-json/wc/v3`;
  }

  private get authHeaders() {
    const credentials = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`,
    ).toString("base64");

    return {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
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

  private async request<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    const state = this.getCircuitState();
    if (state === "OPEN") {
      throw new WooCircuitOpenError(
        "Circuit breaker is open. WooCommerce API requests are paused.",
      );
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers: { ...this.authHeaders, ...options?.headers },
        });

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After")) || 2;
          await sleep(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new WooApiError(
            `WooCommerce API ${response.status}: ${body}`,
            response.status,
          );
        }

        const data = await response.json();
        this.onSuccess();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof WooApiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
          this.onFailure();
          throw error;
        }

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
        }
      }
    }

    this.onFailure();
    throw lastError ?? new Error("WooCommerce API request failed");
  }

  async getProducts(perPage = 50, page = 1): Promise<WooProduct[]> {
    return this.request<WooProduct[]>(
      `/products?per_page=${perPage}&page=${page}`,
    );
  }

  async getProduct(productId: number): Promise<WooProduct> {
    return this.request<WooProduct>(`/products/${productId}`);
  }

  async getProductVariations(productId: number): Promise<WooVariation[]> {
    return this.request<WooVariation[]>(
      `/products/${productId}/variations?per_page=100`,
    );
  }

  async getOrders(perPage = 50, page = 1): Promise<WooOrder[]> {
    return this.request<WooOrder[]>(
      `/orders?per_page=${perPage}&page=${page}`,
    );
  }

  async getOrder(orderId: number): Promise<WooOrder> {
    return this.request<WooOrder>(`/orders/${orderId}`);
  }

  async updateProductStock(
    productId: number,
    stockQuantity: number,
  ): Promise<void> {
    await this.request(`/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify({
        manage_stock: true,
        stock_quantity: stockQuantity,
      }),
    });
  }

  async updateVariationStock(
    productId: number,
    variationId: number,
    stockQuantity: number,
  ): Promise<void> {
    await this.request(`/products/${productId}/variations/${variationId}`, {
      method: "PUT",
      body: JSON.stringify({
        manage_stock: true,
        stock_quantity: stockQuantity,
      }),
    });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class WooApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "WooApiError";
  }
}

export class WooCircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WooCircuitOpenError";
  }
}
