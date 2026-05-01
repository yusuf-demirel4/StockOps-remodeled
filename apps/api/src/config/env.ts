const DEFAULT_DEMO_TOKEN = "stockops_demo_api_key";

function truthy(value: string | undefined) {
  return value === "1" || value === "true" || value === "yes";
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function allowProductionDemoMode() {
  return truthy(process.env.STOCKOPS_ALLOW_DEMO_IN_PRODUCTION);
}

export function allowUnsignedProviderWebhooks() {
  return truthy(process.env.STOCKOPS_ALLOW_UNSIGNED_PROVIDER_WEBHOOKS);
}

export function getRateLimitConfig() {
  return {
    ttl: Number(process.env.API_RATE_LIMIT_TTL_MS ?? 60_000),
    limit: Number(process.env.API_RATE_LIMIT_MAX ?? 100),
  };
}

export function validateApiEnvironment() {
  const dataSource = process.env.APP_DATA_SOURCE ?? "demo";

  if (dataSource !== "demo" && dataSource !== "database") {
    throw new Error('APP_DATA_SOURCE must be either "demo" or "database".');
  }

  if (dataSource === "database" && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when APP_DATA_SOURCE=database.");
  }

  if (!isProduction()) {
    return;
  }

  if (dataSource === "demo" && !allowProductionDemoMode()) {
    throw new Error(
      "Refusing to start in production with APP_DATA_SOURCE=demo. Set APP_DATA_SOURCE=database or explicitly set STOCKOPS_ALLOW_DEMO_IN_PRODUCTION=true for isolated demos.",
    );
  }

  if ((process.env.API_DEMO_TOKEN ?? DEFAULT_DEMO_TOKEN) === DEFAULT_DEMO_TOKEN) {
    throw new Error("Refusing to start in production with the default API demo token.");
  }

  const corsOrigin = process.env.API_CORS_ORIGIN;
  if (!corsOrigin || corsOrigin === "*" || corsOrigin.includes("*")) {
    throw new Error("API_CORS_ORIGIN must be an explicit origin list in production.");
  }

  if (
    !allowUnsignedProviderWebhooks() &&
    (!process.env.SHOPIFY_WEBHOOK_SECRET || !process.env.WOOCOMMERCE_WEBHOOK_SECRET)
  ) {
    throw new Error(
      "Provider webhook secrets are required in production unless STOCKOPS_ALLOW_UNSIGNED_PROVIDER_WEBHOOKS=true.",
    );
  }
}
