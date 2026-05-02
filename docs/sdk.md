# StockOps SDK and Open API

StockOps exposes extension-friendly APIs as part of the core product surface. The goal is to avoid lock-in: customers can use OpenAPI, the Node SDK, plain HTTP, webhook subscriptions, custom fields, and account portability exports.

## Node SDK

```ts
import { StockOpsClient } from "@stockops/sdk-node";

const stockops = new StockOpsClient({
  baseUrl: "https://api.example.com/v1",
  apiToken: process.env.STOCKOPS_API_TOKEN!,
});

const products = await stockops.listProducts();
const forecast = await stockops.forecastProduct("prd_123", {
  horizon: 30,
  method: "AUTO",
});

await stockops.createWebhookSubscription({
  url: "https://example.com/stockops/webhook",
  events: ["product.updated", "stock.movement.created"],
  secret: process.env.STOCKOPS_EXTENSION_SECRET,
});

const accountExport = await stockops.exportAccountPortability();
```

## Python HTTP

```py
import os
import requests

base_url = "https://api.example.com/v1"
headers = {"Authorization": f"Bearer {os.environ['STOCKOPS_API_TOKEN']}"}

response = requests.get(f"{base_url}/products", headers=headers, timeout=30)
response.raise_for_status()
print(response.json())
```

## Account Portability

Use `GET /v1/exports/account-portability.json` to export an inspectable JSON bundle containing products, warehouses, suppliers, stock rows, stock movements, sales orders, purchase orders, customers, and invoices.

Secrets are not exported. Webhook subscription secrets are redacted in web exports.

## Extension Webhooks

1. List events with `GET /v1/extensions/events`.
2. Register a target URL with `POST /v1/extensions/webhook-subscriptions`.
3. Store a per-subscription secret.
4. Verify signatures before processing incoming payloads.
5. Use sync logs and webhook inbox records for replay and recovery.
