import type { QuickBooksTokens } from "./types";

const QB_API_BASE = "https://quickbooks.api.intuit.com/v3/company";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";

export class QuickBooksClient {
  private tokens: QuickBooksTokens;

  constructor(tokens: QuickBooksTokens) {
    this.tokens = tokens;
  }

  static getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "com.intuit.quickbooks.accounting",
      state,
    });
    return `${QB_AUTH_URL}?${params}`;
  }

  static async exchangeCode(code: string, realmId: string): Promise<QuickBooksTokens> {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID ?? "";
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET ?? "";
    const redirectUri = process.env.QUICKBOOKS_CALLBACK_URL ?? "";

    const res = await fetch(QB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) throw new Error(`QuickBooks token exchange failed: ${res.status}`);
    const data = await res.json() as any;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      realmId,
    };
  }

  async refreshTokens(): Promise<QuickBooksTokens> {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID ?? "";
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET ?? "";

    const res = await fetch(QB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.tokens.refreshToken,
      }),
    });

    if (!res.ok) throw new Error(`QuickBooks token refresh failed: ${res.status}`);
    const data = await res.json() as any;

    this.tokens = {
      ...this.tokens,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };

    return this.tokens;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (this.tokens.expiresAt < new Date()) {
      await this.refreshTokens();
    }

    const url = `${QB_API_BASE}/${this.tokens.realmId}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`QuickBooks API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async queryInvoices(modifiedSince?: Date) {
    const where = modifiedSince
      ? ` WHERE MetaData.LastUpdatedTime > '${modifiedSince.toISOString()}'`
      : "";
    const query = encodeURIComponent(`SELECT * FROM Invoice${where}`);
    return this.request<{ QueryResponse: { Invoice: any[] } }>(`/query?query=${query}`);
  }

  async createInvoice(invoice: any) {
    return this.request<{ Invoice: any }>("/invoice", {
      method: "POST",
      body: JSON.stringify(invoice),
    });
  }

  async queryPayments(modifiedSince?: Date) {
    const where = modifiedSince
      ? ` WHERE MetaData.LastUpdatedTime > '${modifiedSince.toISOString()}'`
      : "";
    const query = encodeURIComponent(`SELECT * FROM Payment${where}`);
    return this.request<{ QueryResponse: { Payment: any[] } }>(`/query?query=${query}`);
  }

  async createPayment(payment: any) {
    return this.request<{ Payment: any }>("/payment", {
      method: "POST",
      body: JSON.stringify(payment),
    });
  }

  async queryItems() {
    const query = encodeURIComponent("SELECT * FROM Item");
    return this.request<{ QueryResponse: { Item: any[] } }>(`/query?query=${query}`);
  }

  async createOrUpdateItem(item: any) {
    return this.request<{ Item: any }>("/item", {
      method: "POST",
      body: JSON.stringify(item),
    });
  }
}
