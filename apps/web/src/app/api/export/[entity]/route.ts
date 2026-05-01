import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  exportProductsCsv,
  exportOrdersCsv,
  exportInvoicesCsv,
  exportCustomersCsv,
  exportStockCsv,
} from "@/lib/repository";

export const dynamic = "force-dynamic";

const ALLOWED_ENTITIES = ["products", "orders", "invoices", "customers", "stock"] as const;
type Entity = (typeof ALLOWED_ENTITIES)[number];

const FILENAME_MAP: Record<Entity, string> = {
  products: "urunler.csv",
  orders: "siparisler.csv",
  invoices: "faturalar.csv",
  customers: "musteriler.csv",
  stock: "stok.csv",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity: rawEntity } = await params;
  const entity = rawEntity as Entity;

  if (!ALLOWED_ENTITIES.includes(entity)) {
    return new NextResponse("Geçersiz varlık türü.", { status: 400 });
  }

  let context;
  try {
    context = await requireAuth();
  } catch {
    return new NextResponse("Yetkisiz erişim.", { status: 401 });
  }

  let csv: string;

  try {
    switch (entity) {
      case "products":
        csv = await exportProductsCsv(context);
        break;
      case "orders":
        csv = await exportOrdersCsv(context);
        break;
      case "invoices":
        csv = await exportInvoicesCsv(context);
        break;
      case "customers":
        csv = await exportCustomersCsv(context);
        break;
      case "stock":
        csv = await exportStockCsv(context);
        break;
      default:
        return new NextResponse("Geçersiz varlık türü.", { status: 400 });
    }
  } catch (error) {
    console.error("[CSV Export] Error:", error);
    return new NextResponse("Dışa aktarım sırasında hata oluştu.", { status: 500 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${FILENAME_MAP[entity]}"`,
      "Cache-Control": "no-store",
    },
  });
}
