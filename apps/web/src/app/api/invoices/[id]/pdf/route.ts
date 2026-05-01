import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getInvoice } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireAuth();
    const invoice = await getInvoice(params.id, context);

    if (!invoice) {
      return new NextResponse("Fatura bulunamadı.", { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inv = invoice as any;
    const totalPaid =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inv.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) ?? 0;
    const remaining = Number(inv.total) - totalPaid;

    const fmt = new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: inv.currency ?? "TRY",
    });

    const fmtDate = (d: string | Date | undefined) => {
      if (!d) return "-";
      return new Date(d).toLocaleDateString("tr-TR");
    };

    const linesHtml = (inv.lines ?? [])
      .map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (line: any) => `
      <tr>
        <td>${line.product?.name ?? line.productId ?? "-"}</td>
        <td style="text-align:right">${line.quantity}</td>
        <td style="text-align:right">${fmt.format(Number(line.unitPrice))}</td>
        <td style="text-align:right">${Number(line.discount ?? 0)}%</td>
        <td style="text-align:right">${fmt.format(Number(line.lineTotal))}</td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fatura ${inv.code}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 13px;
      color: #1a1a2e;
      padding: 32px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 24px; font-weight: 700; color: #0f3460; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .company { font-weight: 700; font-size: 16px; margin-bottom: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-meta dt { font-size: 11px; color: #666; }
    .invoice-meta dd { font-weight: 600; margin-bottom: 4px; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background: #e0f2fe;
      color: #0369a1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
    }
    th {
      background: #f1f5f9;
      padding: 8px 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      color: #475569;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    tfoot td {
      border-top: 2px solid #cbd5e1;
      font-weight: 600;
    }
    .totals { margin-top: 24px; display: flex; justify-content: flex-end; }
    .totals-grid { min-width: 240px; }
    .totals-grid .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .totals-grid .row.total-row { border-top: 2px solid #1a1a2e; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 15px; }
    .footer { margin-top: 48px; font-size: 11px; color: #999; text-align: center; }
    @media print {
      body { padding: 20px; }
      @page { margin: 16mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${context.organization.name}</div>
      <div style="color:#666">StockOps Fatura Sistemi</div>
    </div>
    <div class="invoice-meta">
      <h1>${inv.code}</h1>
      <span class="badge">${inv.status}</span>
      <dl style="margin-top:8px">
        <dt>Düzenleme Tarihi</dt>
        <dd>${fmtDate(inv.issuedAt ?? inv.createdAt)}</dd>
        <dt>Vade Tarihi</dt>
        <dd>${fmtDate(inv.dueDate)}</dd>
        <dt>Para Birimi</dt>
        <dd>${inv.currency ?? "TRY"}</dd>
      </dl>
    </div>
  </div>

  <div style="margin-bottom:16px">
    <div style="font-size:11px;color:#666;margin-bottom:4px">FATURA KESİLEN</div>
    <div style="font-weight:700;font-size:15px">${inv.customer?.name ?? inv.customerId}</div>
    ${inv.customer?.email ? `<div>${inv.customer.email}</div>` : ""}
    ${inv.customer?.address ? `<div>${inv.customer.address}</div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Ürün / Açıklama</th>
        <th style="text-align:right">Miktar</th>
        <th style="text-align:right">Birim Fiyat</th>
        <th style="text-align:right">İndirim</th>
        <th style="text-align:right">Toplam</th>
      </tr>
    </thead>
    <tbody>${linesHtml}</tbody>
  </table>

  <div class="totals">
    <div class="totals-grid">
      <div class="row"><span>Ara Toplam</span><span>${fmt.format(Number(inv.subtotal ?? 0))}</span></div>
      <div class="row"><span>KDV (${(Number(inv.taxRate ?? 0) * 100).toFixed(0)}%)</span><span>${fmt.format(Number(inv.taxAmount ?? 0))}</span></div>
      <div class="row total-row"><span>Genel Toplam</span><span>${fmt.format(Number(inv.total ?? 0))}</span></div>
      <div class="row" style="color:#16a34a"><span>Ödenen</span><span>${fmt.format(totalPaid)}</span></div>
      <div class="row" style="color:#dc2626;font-weight:700"><span>Kalan</span><span>${fmt.format(remaining)}</span></div>
    </div>
  </div>

  ${inv.notes ? `<div style="margin-top:24px;padding:12px;background:#f8fafc;border-radius:6px;font-size:12px"><b>Not:</b> ${inv.notes}</div>` : ""}

  <div class="footer">
    Bu belge StockOps tarafından oluşturulmuştur. Yazdırmak için Ctrl+P tuşlayın.
  </div>

  <script>
    // Otomatik print dialog aç
    window.onload = function() {
      // Küçük gecikme ile print aç ki CSS tam yüklensin
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="INV-${inv.code}.html"`,
      },
    });
  } catch {
    return new NextResponse("Yetkisiz erişim.", { status: 401 });
  }
}
