export type QuickBooksTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  realmId: string;
};

export type QBInvoice = {
  Id: string;
  DocNumber: string;
  CustomerRef: { value: string; name: string };
  Line: QBInvoiceLine[];
  TotalAmt: number;
  CurrencyRef: { value: string };
  TxnDate: string;
  DueDate: string;
  MetaData: { LastUpdatedTime: string };
};

export type QBInvoiceLine = {
  Id?: string;
  Description: string;
  Amount: number;
  DetailType: "SalesItemLineDetail";
  SalesItemLineDetail: {
    ItemRef?: { value: string };
    Qty: number;
    UnitPrice: number;
  };
};

export type QBPayment = {
  Id: string;
  TotalAmt: number;
  TxnDate: string;
  PaymentRefNum?: string;
  Line: Array<{
    Amount: number;
    LinkedTxn: Array<{ TxnId: string; TxnType: string }>;
  }>;
};

export type QBItem = {
  Id: string;
  Name: string;
  Sku?: string;
  Description?: string;
  UnitPrice: number;
  PurchaseCost?: number;
  Type: "Inventory" | "NonInventory" | "Service";
  IncomeAccountRef?: { value: string };
  ExpenseAccountRef?: { value: string };
};

export type QBWebhookEvent = {
  realmId: string;
  name: string;
  id: string;
  operation: "Create" | "Update" | "Delete" | "Void";
  lastUpdated: string;
};

export type QBWebhookPayload = {
  eventNotifications: Array<{
    realmId: string;
    dataChangeEvent: {
      entities: QBWebhookEvent[];
    };
  }>;
};
