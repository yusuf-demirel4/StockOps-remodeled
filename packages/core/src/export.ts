import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import type { Product, StockRow, StockMovement, Customer, Invoice } from "./types";

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function escapeCSV(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\n");
}

export function exportProductsCSV(products: Product[]): string {
  return toCSV(
    ["SKU", "Name", "Category", "Barcode", "MinStock", "UnitPrice", "CostPrice", "Active"],
    products.map((p) => [
      p.sku,
      p.name,
      p.category,
      p.barcode ?? "",
      p.minimumStock,
      p.unitPrice,
      p.costPrice ?? "",
      p.isActive,
    ]),
  );
}

export function exportStockCSV(rows: StockRow[]): string {
  return toCSV(
    ["Product SKU", "Product Name", "Warehouse", "On Hand", "Min Stock", "Critical"],
    rows.map((r) => [
      r.product.sku,
      r.product.name,
      r.warehouse.name,
      r.onHand,
      r.minimumStock,
      r.isCritical,
    ]),
  );
}

export function exportMovementsCSV(movements: StockMovement[]): string {
  return toCSV(
    ["ID", "Type", "Product ID", "Warehouse ID", "Qty Change", "Reference", "Note", "Date"],
    movements.map((m) => [
      m.id,
      m.type,
      m.productId,
      m.warehouseId,
      m.quantityChange,
      m.reference ?? "",
      m.note ?? "",
      m.createdAt,
    ]),
  );
}

export function exportCustomersCSV(customers: Customer[]): string {
  return toCSV(
    ["Code", "Name", "Email", "Phone", "Tax ID", "Payment Terms (days)", "Active"],
    customers.map((c) => [
      c.code,
      c.name,
      c.email ?? "",
      c.phone ?? "",
      c.taxId ?? "",
      c.paymentTermDays,
      c.isActive,
    ]),
  );
}

export function exportInvoicesCSV(invoices: Invoice[]): string {
  return toCSV(
    ["Code", "Customer ID", "Status", "Subtotal", "Tax", "Total", "Currency", "Due Date", "Created"],
    invoices.map((inv) => [
      inv.code,
      inv.customerId,
      inv.status,
      inv.subtotal,
      inv.taxAmount,
      inv.total,
      inv.currency,
      inv.dueDate ?? "",
      inv.createdAt,
    ]),
  );
}

export function exportOrdersCSV(orders: Array<{ code: string; customerName: string; status: string; createdAt: string; lines: Array<{ productId: string; quantity: number }> }>): string {
  return toCSV(
    ["Code", "Customer", "Status", "Line Count", "Created"],
    orders.map((o) => [
      o.code,
      o.customerName,
      o.status,
      o.lines.length,
      o.createdAt,
    ]),
  );
}

// ---------------------------------------------------------------------------
// Excel Export
// ---------------------------------------------------------------------------

export async function exportProductsExcel(products: Product[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");

  sheet.columns = [
    { header: "SKU", key: "sku", width: 15 },
    { header: "Name", key: "name", width: 30 },
    { header: "Category", key: "category", width: 20 },
    { header: "Barcode", key: "barcode", width: 18 },
    { header: "Min Stock", key: "minimumStock", width: 12 },
    { header: "Unit Price", key: "unitPrice", width: 14 },
    { header: "Cost Price", key: "costPrice", width: 14 },
    { header: "Active", key: "isActive", width: 10 },
  ];

  // Bold header row
  sheet.getRow(1).font = { bold: true };

  for (const p of products) {
    sheet.addRow({
      sku: p.sku,
      name: p.name,
      category: p.category,
      barcode: p.barcode ?? "",
      minimumStock: p.minimumStock,
      unitPrice: p.unitPrice,
      costPrice: p.costPrice ?? "",
      isActive: p.isActive ? "Yes" : "No",
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function exportStockExcel(rows: StockRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Stock");

  sheet.columns = [
    { header: "Product SKU", key: "sku", width: 15 },
    { header: "Product Name", key: "name", width: 30 },
    { header: "Warehouse", key: "warehouse", width: 20 },
    { header: "On Hand", key: "onHand", width: 12 },
    { header: "Min Stock", key: "minStock", width: 12 },
    { header: "Critical", key: "critical", width: 10 },
  ];

  sheet.getRow(1).font = { bold: true };

  for (const r of rows) {
    sheet.addRow({
      sku: r.product.sku,
      name: r.product.name,
      warehouse: r.warehouse.name,
      onHand: r.onHand,
      minStock: r.minimumStock,
      critical: r.isCritical ? "YES" : "No",
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ---------------------------------------------------------------------------
// PDF Invoice Generation
// ---------------------------------------------------------------------------

export type InvoicePDFOptions = {
  invoice: Invoice;
  customer: Customer;
  products: Map<string, Product>;
  companyName: string;
  companyAddress?: string;
  companyTaxId?: string;
  companyPhone?: string;
  companyEmail?: string;
  logoPath?: string;
};

export function generateInvoicePDF(options: InvoicePDFOptions): typeof PDFDocument {
  const {
    invoice,
    customer,
    products,
    companyName,
    companyAddress,
    companyTaxId,
    companyPhone,
    companyEmail,
  } = options;

  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // ---- Header ----
  doc.fontSize(22).font("Helvetica-Bold").text(companyName, 50, 50);
  doc.fontSize(9).font("Helvetica");
  let headerY = 75;
  if (companyAddress) {
    doc.text(companyAddress, 50, headerY);
    headerY += 12;
  }
  if (companyTaxId) {
    doc.text(`Tax ID: ${companyTaxId}`, 50, headerY);
    headerY += 12;
  }
  if (companyPhone) {
    doc.text(`Phone: ${companyPhone}`, 50, headerY);
    headerY += 12;
  }
  if (companyEmail) {
    doc.text(`Email: ${companyEmail}`, 50, headerY);
    headerY += 12;
  }

  // ---- Invoice Info (right side) ----
  doc.fontSize(16).font("Helvetica-Bold").text("INVOICE", 350, 50, { align: "right" });
  doc.fontSize(10).font("Helvetica");
  doc.text(`Invoice #: ${invoice.code}`, 350, 72, { align: "right" });
  doc.text(`Date: ${invoice.issuedAt ?? invoice.createdAt}`, 350, 86, { align: "right" });
  if (invoice.dueDate) {
    doc.text(`Due: ${invoice.dueDate}`, 350, 100, { align: "right" });
  }
  doc.text(`Status: ${invoice.status}`, 350, 114, { align: "right" });

  // ---- Bill To ----
  const billToY = Math.max(headerY + 10, 140);
  doc.fontSize(10).font("Helvetica-Bold").text("Bill To:", 50, billToY);
  doc.font("Helvetica");
  doc.text(customer.name, 50, billToY + 14);
  if (customer.email) doc.text(customer.email, 50, billToY + 28);
  if (customer.phone) doc.text(customer.phone, 50, billToY + 42);
  if (customer.taxId) doc.text(`Tax ID: ${customer.taxId}`, 50, billToY + 56);

  // ---- Table Header ----
  const tableTop = billToY + 80;
  const colX = { item: 50, desc: 200, qty: 330, price: 380, total: 460 };

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("Item", colX.item, tableTop)
    .text("Description", colX.desc, tableTop)
    .text("Qty", colX.qty, tableTop, { width: 40, align: "right" })
    .text("Price", colX.price, tableTop, { width: 60, align: "right" })
    .text("Total", colX.total, tableTop, { width: 80, align: "right" });

  doc
    .moveTo(50, tableTop + 14)
    .lineTo(540, tableTop + 14)
    .stroke();

  // ---- Table Rows ----
  doc.font("Helvetica").fontSize(9);
  let rowY = tableTop + 20;

  for (const line of invoice.lines) {
    const product = products.get(line.productId);
    const itemName = product?.sku ?? line.productId;
    const desc = line.description ?? product?.name ?? "";

    doc.text(itemName, colX.item, rowY, { width: 140 });
    doc.text(desc, colX.desc, rowY, { width: 120 });
    doc.text(String(line.quantity), colX.qty, rowY, { width: 40, align: "right" });
    doc.text(line.unitPrice.toFixed(2), colX.price, rowY, { width: 60, align: "right" });
    doc.text(line.lineTotal.toFixed(2), colX.total, rowY, { width: 80, align: "right" });

    rowY += 18;

    // page break if near bottom
    if (rowY > 700) {
      doc.addPage();
      rowY = 50;
    }
  }

  // ---- Totals ----
  doc.moveTo(350, rowY + 5).lineTo(540, rowY + 5).stroke();
  const totalsX = 400;
  const totalsValX = 460;
  let totalsY = rowY + 14;

  doc.font("Helvetica").fontSize(9);
  doc.text("Subtotal:", totalsX, totalsY);
  doc.text(Number(invoice.subtotal).toFixed(2), totalsValX, totalsY, { width: 80, align: "right" });
  totalsY += 16;

  if (Number(invoice.discountAmount) > 0) {
    doc.text("Discount:", totalsX, totalsY);
    doc.text(`-${Number(invoice.discountAmount).toFixed(2)}`, totalsValX, totalsY, { width: 80, align: "right" });
    totalsY += 16;
  }

  doc.text(`Tax (${(Number(invoice.taxRate) * 100).toFixed(0)}%):`, totalsX, totalsY);
  doc.text(Number(invoice.taxAmount).toFixed(2), totalsValX, totalsY, { width: 80, align: "right" });
  totalsY += 16;

  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("TOTAL:", totalsX, totalsY);
  doc.text(`${invoice.currency} ${Number(invoice.total).toFixed(2)}`, totalsValX, totalsY, { width: 80, align: "right" });

  // ---- Notes ----
  if (invoice.notes) {
    totalsY += 30;
    doc.font("Helvetica-Bold").fontSize(9).text("Notes:", 50, totalsY);
    doc.font("Helvetica").text(invoice.notes, 50, totalsY + 14, { width: 490 });
  }

  // ---- Footer ----
  doc
    .fontSize(8)
    .font("Helvetica")
    .text("Generated by StockOps", 50, 770, { align: "center", width: 490 });

  doc.end();
  return doc;
}
