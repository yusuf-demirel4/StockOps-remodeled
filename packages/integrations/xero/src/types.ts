export type XeroTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tenantId: string;
};

export type XeroInvoice = {
  invoiceID: string;
  invoiceNumber: string;
  type: "ACCREC" | "ACCPAY";
  contact: { contactID: string; name: string };
  lineItems: XeroLineItem[];
  status: string;
  total: number;
  currencyCode: string;
  date: string;
  dueDate: string;
  updatedDateUTC: string;
};

export type XeroLineItem = {
  lineItemID?: string;
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode: string;
  lineAmount: number;
  itemCode?: string;
};

export type XeroPayment = {
  paymentID: string;
  invoice: { invoiceID: string };
  amount: number;
  date: string;
  reference?: string;
  status: string;
};

export type XeroItem = {
  itemID: string;
  code: string;
  name: string;
  description?: string;
  purchaseDetails?: { unitPrice: number; accountCode: string };
  salesDetails?: { unitPrice: number; accountCode: string };
};

export type XeroWebhookEvent = {
  resourceUrl: string;
  resourceId: string;
  eventDateUtc: string;
  eventType: string;
  eventCategory: string;
  tenantId: string;
  tenantType: string;
};
