import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getInvoice } from "@/lib/repository";
import { generateInvoiceHtml } from "@/lib/invoice-template";
import puppeteer from "puppeteer";

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

    const html = generateInvoiceHtml(invoice, context.organization, false);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '16mm', right: '16mm', bottom: '16mm', left: '16mm' }
      });
      
      await browser.close();

      return new NextResponse(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="INV-${(invoice as any).code}.pdf"`,
        },
      });
    } catch (e) {
      await browser.close();
      throw e;
    }
  } catch (error) {
    console.error("PDF generation error:", error);
    return new NextResponse("PDF oluşturulamadı veya yetkisiz erişim.", { status: 500 });
  }
}
