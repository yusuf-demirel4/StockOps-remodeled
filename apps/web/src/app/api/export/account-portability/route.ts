import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  let context;
  try {
    context = await requireAuth();
  } catch {
    return new NextResponse("Unauthorized.", { status: 401 });
  }

  const snapshot = await getAppSnapshot(context);
  const payload = {
    schemaVersion: "stockops.account-portability.v1",
    generatedAt: new Date().toISOString(),
    organization: {
      id: snapshot.organization.id,
      name: snapshot.organization.name,
      slug: snapshot.organization.slug,
    },
    counts: {
      products: snapshot.products.length,
      warehouses: snapshot.warehouses.length,
      suppliers: snapshot.suppliers.length,
      stockMovements: snapshot.stockMovements.length,
      salesOrders: snapshot.salesOrders.length,
      purchaseOrders: snapshot.purchaseOrders.length,
      salesReturns: snapshot.salesReturns.length,
      webhookSubscriptions: snapshot.webhookSubscriptions.length,
      customFields: snapshot.customFields.length,
    },
    data: {
      products: snapshot.products,
      warehouses: snapshot.warehouses,
      suppliers: snapshot.suppliers,
      stockRows: snapshot.stockRows,
      stockMovements: snapshot.stockMovements,
      salesOrders: snapshot.salesOrders,
      purchaseOrders: snapshot.purchaseOrders,
      salesReturns: snapshot.salesReturns,
      productVariants: snapshot.productVariants,
      webhookSubscriptions: snapshot.webhookSubscriptions.map((subscription) => ({
        ...subscription,
        secret: subscription.secret ? "redacted" : undefined,
      })),
      customFields: snapshot.customFields,
      auditLogs: snapshot.auditLogs,
    },
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="stockops-account-export.json"',
    },
  });
}
