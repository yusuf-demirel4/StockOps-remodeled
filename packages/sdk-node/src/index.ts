export type StockOpsClientOptions = {
  baseUrl: string;
  apiToken: string;
  fetch?: typeof fetch;
};

export type ExtensionWebhookSubscriptionInput = {
  url: string;
  events: string[];
  secret?: string;
};

export type ForecastQuery = {
  alpha?: number;
  beta?: number;
  gamma?: number;
  horizon?: number;
  method?: "AUTO" | "MOVING_AVG" | "EXPONENTIAL_SMOOTHING" | "HOLT_WINTERS";
  seasonLength?: number;
  warehouseId?: string;
  windowSize?: number;
};

export class StockOpsClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly fetcher: typeof fetch;

  constructor(options: StockOpsClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiToken = options.apiToken;
    this.fetcher = options.fetch ?? fetch;
  }

  me<T = unknown>() {
    return this.request<T>("/auth/me");
  }

  listProducts<T = unknown>() {
    return this.request<T>("/products");
  }

  forecastProduct<T = unknown>(productId: string, query: ForecastQuery = {}) {
    return this.request<T>(
      `/forecasting/products/${encodeURIComponent(productId)}${toQueryString(query)}`,
    );
  }

  forecastOrganization<T = unknown>(query: ForecastQuery = {}) {
    return this.request<T>(`/forecasting/organization${toQueryString(query)}`);
  }

  createProduct<T = unknown>(body: {
    sku: string;
    name: string;
    barcode?: string;
    category: string;
    minimumStock: number;
  }) {
    return this.request<T>("/products", { method: "POST", body });
  }

  listExtensionEvents<T = string[]>() {
    return this.request<T>("/extensions/events");
  }

  listWebhookSubscriptions<T = unknown>() {
    return this.request<T>("/extensions/webhook-subscriptions");
  }

  createWebhookSubscription<T = unknown>(
    body: ExtensionWebhookSubscriptionInput,
  ) {
    return this.request<T>("/extensions/webhook-subscriptions", {
      method: "POST",
      body,
    });
  }

  exportAccountPortability<T = unknown>() {
    return this.request<T>("/exports/account-portability.json");
  }

  setCustomField<T = unknown>(
    entityType: string,
    entityId: string,
    key: string,
    value: unknown,
  ) {
    return this.request<T>(
      `/extensions/custom-fields/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
      {
        method: "PUT",
        body: { key, value },
      },
    );
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`StockOps API ${response.status}: ${message}`);
    }

    return response.json() as Promise<T>;
  }
}

function toQueryString(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}
