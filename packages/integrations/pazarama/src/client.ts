import type {
  CircuitBreakerState,
  PazaramaConfig,
  PazaramaInventoryItem,
  PazaramaOrdersResponse,
  PazaramaProduct,
  PazaramaTokenInfo,
} from "./types";

const DEFAULT_BASE_URL = "https://isortagim.pazarama.com/api";
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

/**
 * Token storage interface.
 * The caller must provide an implementation that persists tokens
 * to a shared store (database) to avoid race conditions in multi-node deployments.
 *
 * The `refreshWithLock` method must:
 * 1. Acquire a distributed lock (e.g., SELECT ... FOR UPDATE on PazaramaIntegration row)
 * 2. Re-read the token — another node may have already refreshed it
 * 3. If still expired, call the provided refreshFn to get a new token
 * 4. Save the new token and release the lock
 */
export type TokenStore = {
  getToken(): Promise<PazaramaTokenInfo | null>;
  saveToken(token: PazaramaTokenInfo): Promise<void>;
  refreshWithLock(refreshFn: () => Promise<PazaramaTokenInfo>): Promise<PazaramaTokenInfo>;
};

export class PazaramaClient {
  private config: PazaramaConfig;
  private tokenStore: TokenStore;
  private circuitState: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private lastFailureAt = 0;

  constructor(config: PazaramaConfig, tokenStore: TokenStore) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
    };
    this.tokenStore = tokenStore;
  }

  private get baseUrl() {
    return this.config.baseUrl!;
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

  /**
   * Ensure we have a valid access token.
   * If expired, uses distributed lock to refresh exactly once across all nodes.
   */
  private async ensureValidToken(): Promise<string> {
    const existing = await this.tokenStore.getToken();

    if (existing && existing.expiresAt.getTime() > Date.now() + TOKEN_REFRESH_MARGIN_MS) {
      return existing.accessToken;
    }

    // Token is expired or about to expire — refresh with lock
    const refreshed = await this.tokenStore.refreshWithLock(async () => {
      return this.requestNewToken(existing?.refreshToken);
    });

    return refreshed.accessToken;
  }

  /**
   * Request a new token from Pazarama OAuth2 endpoint.
   */
  private async requestNewToken(refreshToken?: string): Promise<PazaramaTokenInfo> {
    const body: Record<string, string> = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    };

    if (refreshToken) {
      body.grant_type = "refresh_token";
      body.refresh_token = refreshToken;
    } else {
      body.grant_type = "client_credentials";
    }

    const response = await fetch(`${this.baseUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new PazaramaApiError(
        `Pazarama token request failed ${response.status}: ${text}`,
        response.status,
      );
    }

    const data = await response.json();
    const expiresInMs = (data.expires_in ?? 3600) * 1000;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken ?? "",
      expiresAt: new Date(Date.now() + expiresInMs),
    };
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const state = this.getCircuitState();
    if (state === "OPEN") {
      throw new PazaramaCircuitOpenError(
        "Circuit breaker is open. Pazarama API requests are paused.",
      );
    }

    const accessToken = await this.ensureValidToken();

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            ...options?.headers,
          },
        });

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After")) || 5;
          await sleep(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new PazaramaApiError(
            `Pazarama API ${response.status}: ${body}`,
            response.status,
          );
        }

        const data = await response.json();
        this.onSuccess();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (
          error instanceof PazaramaApiError &&
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
    throw lastError ?? new Error("Pazarama API request failed");
  }

  async getOrders(params?: {
    page?: number;
    size?: number;
    status?: string;
  }): Promise<PazaramaOrdersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page !== undefined) searchParams.set("page", String(params.page));
    if (params?.size !== undefined) searchParams.set("size", String(params.size));
    if (params?.status) searchParams.set("status", params.status);

    const query = searchParams.toString();
    return this.request<PazaramaOrdersResponse>(
      `/orders${query ? `?${query}` : ""}`,
    );
  }

  async getProducts(params?: {
    page?: number;
    size?: number;
  }): Promise<PazaramaProduct[]> {
    const searchParams = new URLSearchParams();
    if (params?.page !== undefined) searchParams.set("page", String(params.page));
    if (params?.size !== undefined) searchParams.set("size", String(params.size));

    const query = searchParams.toString();
    return this.request<PazaramaProduct[]>(
      `/products${query ? `?${query}` : ""}`,
    );
  }

  async updateInventory(items: PazaramaInventoryItem[]): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/products/stock-update", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PazaramaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PazaramaApiError";
  }
}

export class PazaramaCircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PazaramaCircuitOpenError";
  }
}
