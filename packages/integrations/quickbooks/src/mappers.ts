import type { QBInvoice, QBInvoiceLine, QBPayment, QBItem } from "./types";

/** Map StockOps invoice to QuickBooks format */
export function toQBInvoice(invoice: {
  code: string;
  customerName: string;
  issuedAt: Date | null;
  dueDate: Date | null;
  lines: Array<{
    description?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}): Partial<QBInvoice> {
  return {
    DocNumber: invoice.code,
    CustomerRef: { value: "", name: invoice.customerName },
    TxnDate: invoice.issuedAt?.toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0],
    DueDate: invoice.dueDate?.toISOString().split("T")[0] ?? "",
    Line: invoice.lines.map((line): QBInvoiceLine => ({
      Description: line.description ?? "",
      Amount: Number(line.lineTotal),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        Qty: line.quantity,
        UnitPrice: Number(line.unitPrice),
      },
    })),
  };
}

/** Map QuickBooks invoice to StockOps format */
export function fromQBInvoice(qbInvoice: QBInvoice) {
  return {
    externalId: qbInvoice.Id,
    code: qbInvoice.DocNumber,
    customerName: qbInvoice.CustomerRef.name,
    total: qbInvoice.TotalAmt,
    currency: qbInvoice.CurrencyRef?.value ?? "USD",
    issuedAt: new Date(qbInvoice.TxnDate),
    dueDate: new Date(qbInvoice.DueDate),
    lines: qbInvoice.Line.filter((l) => l.DetailType === "SalesItemLineDetail").map((li) => ({
      description: li.Description,
      quantity: li.SalesItemLineDetail.Qty,
      unitPrice: li.SalesItemLineDetail.UnitPrice,
      lineTotal: li.Amount,
    })),
  };
}

/** Map StockOps payment to QuickBooks format */
export function toQBPayment(payment: {
  amount: number;
  reference?: string | null;
  paidAt: Date;
  qbInvoiceId: string;
}): Partial<QBPayment> {
  return {
    TotalAmt: payment.amount,
    TxnDate: payment.paidAt.toISOString().split("T")[0],
    PaymentRefNum: payment.reference ?? undefined,
    Line: [{
      Amount: payment.amount,
      LinkedTxn: [{ TxnId: payment.qbInvoiceId, TxnType: "Invoice" }],
    }],
  };
}

/** Map QuickBooks payment to StockOps format */
export function fromQBPayment(qbPayment: QBPayment) {
  const invoiceLink = qbPayment.Line?.[0]?.LinkedTxn?.find((t) => t.TxnType === "Invoice");
  return {
    externalId: qbPayment.Id,
    qbInvoiceId: invoiceLink?.TxnId ?? "",
    amount: qbPayment.TotalAmt,
    paidAt: new Date(qbPayment.TxnDate),
    reference: qbPayment.PaymentRefNum,
  };
}

/** Map StockOps product to QuickBooks item */
export function toQBItem(product: {
  sku: string;
  name: string;
  description?: string | null;
  unitPrice: number;
  costPrice?: number | null;
}): Partial<QBItem> {
  return {
    Name: product.name,
    Sku: product.sku,
    Description: product.description ?? undefined,
    Type: "NonInventory",
    UnitPrice: Number(product.unitPrice),
    ...(product.costPrice != null ? { PurchaseCost: Number(product.costPrice) } : {}),
  };
}

/** Map QuickBooks item to StockOps product format */
export function fromQBItem(item: QBItem) {
  return {
    externalId: item.Id,
    sku: item.Sku ?? item.Name,
    name: item.Name,
    description: item.Description,
    unitPrice: item.UnitPrice,
    costPrice: item.PurchaseCost ?? null,
  };
}
