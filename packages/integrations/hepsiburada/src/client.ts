import type {
  CircuitBreakerState,
  HepsiburadaConfig,
  HepsiburadaInventoryItem,
  HepsiburadaOrdersResponse,
  HepsiburadaProduct,
  HepsiburadaTicket,
  InventoryUploadResponse,
} from "./types";

const DEFAULT_BASE_URL = "https://mpop.hepsiburada.com";
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

export class HepsiburadaClient {
  private config: HepsiburadaConfig;
  private circuitState: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private lastFailureAt = 0;

  constructor(config: HepsiburadaConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
    };
  }

  private get headers(): Record<string, string> {
    const credentials = btoa(`${this.config.apiKey}:${this.config.apiSecret}`);
    return {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
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

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const state = this.getCircuitState();
    if (state === "OPEN") {
      throw new HepsiburadaCircuitOpenError(
        "Circuit breaker is open. Hepsiburada API requests are paused.",
      );
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
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
          throw new HepsiburadaApiError(
            `Hepsiburada API ${response.status}: ${body}`,
            response.status,
          );
        }

        const data = await response.json();
        this.onSuccess();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (
          error instanceof HepsiburadaApiError &&
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
    throw lastError ?? new Error("Hepsiburada API request failed");
  }

  async getOrders(params?: {
    offset?: number;
    limit?: number;
    status?: string;
  }): Promise<HepsiburadaOrdersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
    if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
    if (params?.status) searchParams.set("status", params.status);

    const query = searchParams.toString();
    const url = `${this.config.baseUrl}/orders/merchantid/${this.config.merchantId}${query ? `?${query}` : ""}`;
    return this.request<HepsiburadaOrdersResponse>(url);
  }

  async getProducts(params?: {
    offset?: number;
    limit?: number;
  }): Promise<HepsiburadaProduct[]> {
    const searchParams = new URLSearchParams();
    if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
    if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));

    const query = searchParams.toString();
    const url = `${this.config.baseUrl}/listings/merchantid/${this.config.merchantId}${query ? `?${query}` : ""}`;
    return this.request<HepsiburadaProduct[]>(url);
  }

  /**
   * Upload inventory to Hepsiburada.
   * IMPORTANT: This is ASYNCHRONOUS - returns a ticketId.
   * The actual update happens in the background on Hepsiburada's side.
   * Use getTicketStatus() to poll for completion.
   */
  async uploadInventory(items: HepsiburadaInventoryItem[]): Promise<InventoryUploadResponse> {
    const url = `${this.config.baseUrl}/listings/merchantid/${this.config.merchantId}/inventory-uploads`;
    return this.request<InventoryUploadResponse>(url, {
      method: "POST",
      body: JSON.stringify({ listings: items }),
    });
  }

  /**
   * Check the status of an inventory upload ticket.
   */
  async getTicketStatus(ticketId: string): Promise<HepsiburadaTicket> {
    const url = `${this.config.baseUrl}/listings/merchantid/${this.config.merchantId}/tickets/${ticketId}`;
    return this.request<HepsiburadaTicket>(url);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HepsiburadaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HepsiburadaApiError";
  }
}

export class HepsiburadaCircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HepsiburadaCircuitOpenError";
  }
}
