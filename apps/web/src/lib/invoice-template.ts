export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function generateInvoiceHtml(
  invoice: any,
  organization: any,
  isPrintPage = false,
): string {
  const totalPaid =
    invoice.payments?.reduce(
      (s: number, p: any) => s + Number(p.amount),
      0,
    ) ?? 0;
  const remaining = Number(invoice.total) - totalPaid;

  const fmt = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: invoice.currency ?? "TRY",
  });

  const fmtDate = (d: string | Date | undefined): string => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("tr-TR");
  };

  const linesHtml = (invoice.lines ?? [])
    .map(
      (line: any) =>
        "<tr>" +
        "<td>" + escapeHtml(line.product?.name ?? line.productId ?? "-") + "</td>" +
        '<td style="text-align:right">' + escapeHtml(line.quantity) + "</td>" +
        '<td style="text-align:right">' + escapeHtml(fmt.format(Number(line.unitPrice))) + "</td>" +
        '<td style="text-align:right">' + escapeHtml(Number(line.discount ?? 0)) + "%</td>" +
        '<td style="text-align:right">' + escapeHtml(fmt.format(Number(line.lineTotal))) + "</td>" +
        "</tr>",
    )
    .join("");

  const printBar = isPrintPage
    ? '<div class="action-bar"><button class="btn" onclick="window.print()">Yazdır</button></div>'
    : "";

  const orgTaxId = organization.taxId
    ? '<div style="color:#666">Vergi No: ' + escapeHtml(organization.taxId) + "</div>"
    : "";

  const orgAddress = organization.address
    ? '<div style="color:#666; max-width: 200px;">' + escapeHtml(organization.address) + "</div>"
    : "";

  const customerEmail = invoice.customer?.email
    ? "<div>" + escapeHtml(invoice.customer.email) + "</div>"
    : "";

  const customerPhone = invoice.customer?.phone
    ? "<div>" + escapeHtml(invoice.customer.phone) + "</div>"
    : "";

  const customerTaxId = invoice.customer?.taxId
    ? "<div>Vergi No: " + escapeHtml(invoice.customer.taxId) + "</div>"
    : "";

  const customerAddress = invoice.customer?.billingAddress
    ? '<div style="white-space: pre-wrap;">' +
      escapeHtml(
        typeof invoice.customer.billingAddress === "string"
          ? invoice.customer.billingAddress
          : JSON.stringify(invoice.customer.billingAddress),
      ) +
      "</div>"
    : "";

  const notesHtml = invoice.notes
    ? '<div style="margin-top:24px;padding:12px;background:#f8fafc;border-radius:6px;font-size:12px"><b>Not:</b> ' +
      escapeHtml(invoice.notes) +
      "</div>"
    : "";

  return (
    `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Fatura ` + escapeHtml(invoice.code) + `</title>
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
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  tfoot td { border-top: 2px solid #cbd5e1; font-weight: 600; }
  .totals { margin-top: 24px; display: flex; justify-content: flex-end; }
  .totals-grid { min-width: 240px; }
  .totals-grid .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals-grid .row.total-row { border-top: 2px solid #1a1a2e; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 15px; }
  .footer { margin-top: 48px; font-size: 11px; color: #999; text-align: center; }
  .action-bar { padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: flex-end; }
  .btn { background: #0f3460; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; }
  .btn:hover { background: #1a1a2e; }
  @media print {
    body { padding: 0; }
    .action-bar { display: none !important; }
    @page { margin: 16mm; }
  }
</style>
</head>
<body>
` +
    printBar +
    `
<div class="header">
  <div>
    <div class="company">` + escapeHtml(organization.name) + `</div>
    ` + orgTaxId + `
    ` + orgAddress + `
  </div>
  <div class="invoice-meta">
    <h1>` + escapeHtml(invoice.code) + `</h1>
    <span class="badge">` + escapeHtml(invoice.status) + `</span>
    <dl style="margin-top:8px">
      <dt>Düzenleme Tarihi</dt>
      <dd>` + escapeHtml(fmtDate(invoice.issuedAt ?? invoice.createdAt)) + `</dd>
      <dt>Vade Tarihi</dt>
      <dd>` + escapeHtml(fmtDate(invoice.dueDate)) + `</dd>
      <dt>Para Birimi</dt>
      <dd>` + escapeHtml(invoice.currency ?? "TRY") + `</dd>
    </dl>
  </div>
</div>

<div style="margin-bottom:16px">
  <div style="font-size:11px;color:#666;margin-bottom:4px">FATURA KESİLEN</div>
  <div style="font-weight:700;font-size:15px">` + escapeHtml(invoice.customer?.name ?? invoice.customerId) + `</div>
  ` + customerEmail + `
  ` + customerPhone + `
  ` + customerTaxId + `
  ` + customerAddress + `
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
  <tbody>` + linesHtml + `</tbody>
</table>

<div class="totals">
  <div class="totals-grid">
    <div class="row"><span>Ara Toplam</span><span>` + fmt.format(Number(invoice.subtotal ?? 0)) + `</span></div>
    <div class="row"><span>KDV (` + (Number(invoice.taxRate ?? 0) * 100).toFixed(0) + `%)</span><span>` + fmt.format(Number(invoice.taxAmount ?? 0)) + `</span></div>
    <div class="row total-row"><span>Genel Toplam</span><span>` + fmt.format(Number(invoice.total ?? 0)) + `</span></div>
    <div class="row" style="color:#16a34a"><span>Ödenen</span><span>` + fmt.format(totalPaid) + `</span></div>
    <div class="row" style="color:#dc2626;font-weight:700"><span>Kalan</span><span>` + fmt.format(remaining) + `</span></div>
  </div>
</div>

` + notesHtml + `

<div class="footer">
  Bu belge StockOps tarafından oluşturulmuştur.
</div>

</body>
</html>`
  );
}
