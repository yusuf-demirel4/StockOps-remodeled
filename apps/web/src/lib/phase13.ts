import type { AppSnapshot } from "@stockops/core/types";

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  complete: boolean;
  metric: string;
};

export type BuyerJourneyStep = {
  title: string;
  href: string;
  status: "ready" | "needs-work";
  evidence: string;
};

export function buildOnboardingSteps(snapshot: AppSnapshot): OnboardingStep[] {
  const outboundMovements = snapshot.stockMovements.filter(
    (movement) =>
      movement.type === "SALE" ||
      movement.type === "OUTBOUND" ||
      movement.type === "TRANSFER",
  );

  return [
    {
      id: "catalog",
      title: "Catalog",
      description: "Create products with SKUs, barcodes, variants, and minimum stock.",
      href: "/products",
      complete: snapshot.products.some((product) => product.isActive),
      metric: `${snapshot.products.filter((product) => product.isActive).length} active products`,
    },
    {
      id: "warehouses",
      title: "Warehouses",
      description: "Set a default warehouse and keep multi-location stock visible.",
      href: "/settings",
      complete: snapshot.warehouses.length > 0,
      metric: `${snapshot.warehouses.length} warehouses`,
    },
    {
      id: "suppliers",
      title: "Suppliers",
      description: "Attach suppliers and lead times for reorder planning.",
      href: "/suppliers",
      complete: snapshot.suppliers.length > 0,
      metric: `${snapshot.suppliers.length} suppliers`,
    },
    {
      id: "commercial-flow",
      title: "Commercial flow",
      description: "Run sales orders, purchase orders, invoices, returns, and credit notes.",
      href: "/orders",
      complete:
        snapshot.salesOrders.length > 0 ||
        snapshot.purchaseOrders.length > 0 ||
        snapshot.salesReturns.length > 0,
      metric: `${snapshot.salesOrders.length + snapshot.purchaseOrders.length} orders`,
    },
    {
      id: "forecasting",
      title: "Forecasting",
      description: "Use demand history to generate purchase suggestions.",
      href: "/forecasting",
      complete: outboundMovements.length > 0,
      metric: `${outboundMovements.length} demand movements`,
    },
    {
      id: "extensions",
      title: "Open API",
      description: "Register extension webhooks and keep data portable.",
      href: "/developers",
      complete: snapshot.webhookSubscriptions.length > 0,
      metric: `${snapshot.webhookSubscriptions.length} webhook subscriptions`,
    },
  ];
}

export function onboardingProgress(steps: OnboardingStep[]) {
  const completed = steps.filter((step) => step.complete).length;
  return {
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
  };
}

export function buildBuyerJourney(snapshot: AppSnapshot): BuyerJourneyStep[] {
  return [
    {
      title: "Product setup",
      href: "/products",
      status: snapshot.products.length > 0 ? "ready" : "needs-work",
      evidence: `${snapshot.products.length} products in catalog`,
    },
    {
      title: "Receive stock",
      href: "/inventory",
      status: snapshot.stockMovements.some((movement) => movement.quantityChange > 0)
        ? "ready"
        : "needs-work",
      evidence: `${snapshot.stockMovements.filter((movement) => movement.quantityChange > 0).length} inbound movements`,
    },
    {
      title: "Sell and pick",
      href: "/orders",
      status: snapshot.salesOrders.length > 0 ? "ready" : "needs-work",
      evidence: `${snapshot.salesOrders.length} sales orders`,
    },
    {
      title: "Plan replenishment",
      href: "/forecasting",
      status: snapshot.stockMovements.some(
        (movement) => movement.type === "SALE" || movement.type === "OUTBOUND",
      )
        ? "ready"
        : "needs-work",
      evidence: "Forecasting uses stock movement demand history",
    },
    {
      title: "Sync and recover",
      href: "/settings/integrations",
      status:
        snapshot.webhookEvents.length > 0 || snapshot.integrationSyncLogs.length > 0
          ? "ready"
          : "needs-work",
      evidence: `${snapshot.webhookEvents.length + snapshot.integrationSyncLogs.length} integration records`,
    },
    {
      title: "Export and extend",
      href: "/developers",
      status: "ready",
      evidence: "OpenAPI, SDK, webhooks, CSV/XLSX, and account portability export",
    },
  ];
}

export function phase13BuyerMetrics(snapshot: AppSnapshot) {
  return {
    openApiEndpoints: 6,
    includedAddOns: 4,
    exportSurfaces: 7,
    mobileWorkflows: 4,
    extensionEvents: snapshot.webhookSubscriptions.length,
  };
}
