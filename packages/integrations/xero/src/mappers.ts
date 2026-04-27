import type { XeroInvoice, XeroLineItem, XeroPayment, XeroItem } from "./types";

/** Map a StockOps invoice to Xero invoice format */
export function toXeroInvoice(invoice: {
  code: string;
  customerName: string;
  issuedAt: Date | null;
  dueDate: Date | null;
  currency: string;
  lines: Array<{
    description?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}): Partial<XeroInvoice> {
  return {
    type: "ACCREC",
    invoiceNumber: invoice.code,
    contact: { contactID: "", name: invoice.customerName },
    date: invoice.issuedAt?.toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0],
    dueDate: invoice.dueDate?.toISOString().split("T")[0] ?? "",
    currencyCode: invoice.currency,
    status: "AUTHORISED",
    lineItems: invoice.lines.map((line) => ({
      description: line.description ?? "",
      quantity: line.quantity,
      unitAmount: Number(line.unitPrice),
      lineAmount: Number(line.lineTotal),
      accountCode: "200", // Default sales account
    })),
  };
}

/** Map a Xero invoice to StockOps-compatible format */
export function fromXeroInvoice(xeroInvoice: XeroInvoice) {
  return {
    externalId: xeroInvoice.invoiceID,
    code: xeroInvoice.invoiceNumber,
    customerName: xeroInvoice.contact.name,
    total: xeroInvoice.total,
    currency: xeroInvoice.currencyCode,
    issuedAt: new Date(xeroInvoice.date),
    dueDate: new Date(xeroInvoice.dueDate),
    lines: xeroInvoice.lineItems.map((li: XeroLineItem) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitAmount,
      lineTotal: li.lineAmount,
    })),
  };
}

/** Map a StockOps payment to Xero format */
export function toXeroPayment(payment: {
  amount: number;
  reference?: string | null;
  paidAt: Date;
  xeroInvoiceId: string;
}): Partial<XeroPayment> {
  return {
    invoice: { invoiceID: payment.xeroInvoiceId },
    amount: payment.amount,
    date: payment.paidAt.toISOString().split("T")[0],
    reference: payment.reference ?? undefined,
  };
}

/** Map a Xero payment to StockOps format */
export function fromXeroPayment(xeroPayment: XeroPayment) {
  return {
    externalId: xeroPayment.paymentID,
    xeroInvoiceId: xeroPayment.invoice.invoiceID,
    amount: xeroPayment.amount,
    paidAt: new Date(xeroPayment.date),
    reference: xeroPayment.reference,
  };
}

/** Map a StockOps product to Xero item */
export function toXeroItem(product: {
  sku: string;
  name: string;
  description?: string | null;
  unitPrice: number;
  costPrice?: number | null;
}): Partial<XeroItem> {
  return {
    code: product.sku,
    name: product.name,
    description: product.description ?? undefined,
    salesDetails: { unitPrice: Number(product.unitPrice), accountCode: "200" },
    ...(product.costPrice != null
      ? { purchaseDetails: { unitPrice: Number(product.costPrice), accountCode: "300" } }
      : {}),
  };
}

/** Map a Xero item to StockOps product format */
export function fromXeroItem(item: XeroItem) {
  return {
    externalId: item.itemID,
    sku: item.code,
    name: item.name,
    description: item.description,
    unitPrice: item.salesDetails?.unitPrice ?? 0,
    costPrice: item.purchaseDetails?.unitPrice ?? null,
  };
}
