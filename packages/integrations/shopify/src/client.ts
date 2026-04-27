import type {
  CircuitBreakerState,
  ShopifyConfig,
  ShopifyInventoryLevel,
  ShopifyLocation,
  ShopifyOrder,
  ShopifyProduct,
} from "./types";

const DEFAULT_API_VERSION = "2024-10";
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

export class ShopifyClient {
  private config: ShopifyConfig;
  private circuitState: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private lastFailureAt = 0;

  constructor(config: ShopifyConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || DEFAULT_API_VERSION,
    };
  }

  private get baseUrl() {
    return `https://${this.config.shopDomain}/admin/api/${this.config.apiVersion}`;
  }

  private get graphqlUrl() {
    return `https://${this.config.shopDomain}/admin/api/${this.config.apiVersion}/graphql.json`;
  }

  private get headers() {
    return {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": this.config.accessToken,
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
      throw new ShopifyCircuitOpenError(
        "Circuit breaker is open. Shopify API requests are paused.",
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
          const retryAfter = Number(response.headers.get("Retry-After")) || 2;
          await sleep(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new ShopifyApiError(
            `Shopify API ${response.status}: ${body}`,
            response.status,
          );
        }

        const data = await response.json();
        this.onSuccess();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof ShopifyApiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
          this.onFailure();
          throw error;
        }

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
        }
      }
    }

    this.onFailure();
    throw lastError ?? new Error("Shopify API request failed");
  }

  async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const state = this.getCircuitState();
    if (state === "OPEN") {
      throw new ShopifyCircuitOpenError(
        "Circuit breaker is open. Shopify API requests are paused.",
      );
    }

    const response = await fetch(this.graphqlUrl, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      this.onFailure();
      throw new ShopifyApiError(
        `Shopify GraphQL ${response.status}: ${body}`,
        response.status,
      );
    }

    const data = await response.json();

    if (data.errors?.length) {
      this.onFailure();
      throw new ShopifyApiError(
        `Shopify GraphQL errors: ${JSON.stringify(data.errors)}`,
        422,
      );
    }

    this.onSuccess();
    return data.data as T;
  }

  async getProducts(limit = 50): Promise<ShopifyProduct[]> {
    const query = `
      query GetProducts($first: Int!) {
        products(first: $first) {
          nodes {
            id
            title
            handle
            vendor
            productType
            status
            updatedAt
            variants(first: 100) {
              nodes {
                id
                title
                sku
                barcode
                price
                compareAtPrice
                inventoryItem { id }
                inventoryQuantity
                weight
                weightUnit
              }
            }
          }
        }
      }
    `;

    const data = await this.graphql<{
      products: { nodes: any[] };
    }>(query, { first: limit });

    return data.products.nodes.map(mapGraphqlProduct);
  }

  async getProduct(productId: string): Promise<ShopifyProduct> {
    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          vendor
          productType
          status
          updatedAt
          variants(first: 100) {
            nodes {
              id
              title
              sku
              barcode
              price
              compareAtPrice
              inventoryItem { id }
              inventoryQuantity
              weight
              weightUnit
            }
          }
        }
      }
    `;

    const data = await this.graphql<{ product: any }>(query, {
      id: `gid://shopify/Product/${productId}`,
    });

    return mapGraphqlProduct(data.product);
  }

  async getOrders(limit = 50): Promise<ShopifyOrder[]> {
    const data = await this.request<{ orders: any[] }>(
      `/orders.json?limit=${limit}&status=any`,
    );
    return data.orders.map(mapRestOrder);
  }

  async getOrder(orderId: string): Promise<ShopifyOrder> {
    const data = await this.request<{ order: any }>(
      `/orders/${orderId}.json`,
    );
    return mapRestOrder(data.order);
  }

  async getLocations(): Promise<ShopifyLocation[]> {
    const data = await this.request<{ locations: any[] }>("/locations.json");
    return data.locations.map((loc) => ({
      id: String(loc.id),
      name: loc.name,
      active: loc.active,
    }));
  }

  async getInventoryLevels(locationId: string): Promise<ShopifyInventoryLevel[]> {
    const data = await this.request<{ inventory_levels: any[] }>(
      `/inventory_levels.json?location_ids=${locationId}&limit=250`,
    );
    return data.inventory_levels.map((level) => ({
      inventoryItemId: String(level.inventory_item_id),
      locationId: String(level.location_id),
      available: level.available,
      updatedAt: level.updated_at,
    }));
  }

  async setInventoryLevel(
    inventoryItemId: string,
    locationId: string,
    available: number,
  ): Promise<void> {
    await this.request("/inventory_levels/set.json", {
      method: "POST",
      body: JSON.stringify({
        location_id: Number(locationId),
        inventory_item_id: Number(inventoryItemId),
        available,
      }),
    });
  }

  async adjustInventoryLevel(
    inventoryItemId: string,
    locationId: string,
    adjustment: number,
  ): Promise<void> {
    await this.request("/inventory_levels/adjust.json", {
      method: "POST",
      body: JSON.stringify({
        location_id: Number(locationId),
        inventory_item_id: Number(inventoryItemId),
        available_adjustment: adjustment,
      }),
    });
  }
}

function mapGraphqlProduct(node: any): ShopifyProduct {
  return {
    id: extractGid(node.id),
    title: node.title,
    handle: node.handle,
    vendor: node.vendor,
    productType: node.productType,
    status: node.status,
    updatedAt: node.updatedAt,
    variants: (node.variants?.nodes ?? []).map((v: any) => ({
      id: extractGid(v.id),
      title: v.title,
      sku: v.sku ?? "",
      barcode: v.barcode,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      inventoryItemId: extractGid(v.inventoryItem?.id ?? ""),
      inventoryQuantity: v.inventoryQuantity ?? 0,
      weight: v.weight,
      weightUnit: v.weightUnit,
    })),
  };
}

function mapRestOrder(order: any): ShopifyOrder {
  return {
    id: String(order.id),
    name: order.name,
    email: order.email ?? "",
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    cancelledAt: order.cancelled_at,
    financialStatus: order.financial_status,
    fulfillmentStatus: order.fulfillment_status,
    totalPrice: order.total_price,
    currency: order.currency,
    customer: order.customer
      ? {
          id: String(order.customer.id),
          firstName: order.customer.first_name ?? "",
          lastName: order.customer.last_name ?? "",
          email: order.customer.email ?? "",
        }
      : null,
    lineItems: (order.line_items ?? []).map((item: any) => ({
      id: String(item.id),
      title: item.title,
      sku: item.sku ?? "",
      quantity: item.quantity,
      price: item.price,
      variantId: item.variant_id ? String(item.variant_id) : null,
      productId: item.product_id ? String(item.product_id) : null,
    })),
    refunds: (order.refunds ?? []).map((refund: any) => ({
      id: String(refund.id),
      createdAt: refund.created_at,
      refundLineItems: (refund.refund_line_items ?? []).map((rli: any) => ({
        lineItemId: String(rli.line_item_id),
        quantity: rli.quantity,
        restockType: rli.restock_type ?? "no_restock",
      })),
    })),
  };
}

function extractGid(gid: string): string {
  const match = gid.match(/\/(\d+)$/);
  return match ? match[1] : gid;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ShopifyApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ShopifyApiError";
  }
}

export class ShopifyCircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShopifyCircuitOpenError";
  }
}
