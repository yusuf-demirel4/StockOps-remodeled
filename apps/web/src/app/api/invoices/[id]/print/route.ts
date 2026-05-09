import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getInvoice } from "@/lib/repository";
import { generateInvoiceHtml } from "@/lib/invoice-template";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await requireAuth();
    const invoice = await getInvoice(id, context);

    if (!invoice) {
      return new NextResponse("Fatura bulunamadı.", { status: 404 });
    }

    const html = generateInvoiceHtml(invoice, context.organization, true);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch {
    return new NextResponse("Yetkisiz erişim.", { status: 401 });
  }
}
