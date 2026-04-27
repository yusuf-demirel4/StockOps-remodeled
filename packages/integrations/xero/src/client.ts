import type { XeroTokens } from "./types";

const XERO_API_BASE = "https://api.xero.com/api.xro/2.0";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

export class XeroClient {
  private tokens: XeroTokens;

  constructor(tokens: XeroTokens) {
    this.tokens = tokens;
  }

  static getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "openid profile email accounting.transactions accounting.contacts accounting.settings offline_access",
      state,
    });
    return `${XERO_AUTH_URL}?${params}`;
  }

  static async exchangeCode(code: string): Promise<XeroTokens & { tenantId: string }> {
    const clientId = process.env.XERO_CLIENT_ID ?? "";
    const clientSecret = process.env.XERO_CLIENT_SECRET ?? "";
    const redirectUri = process.env.XERO_CALLBACK_URL ?? "";

    const tokenRes = await fetch(XERO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) throw new Error(`Xero token exchange failed: ${tokenRes.status}`);
    const data = await tokenRes.json() as any;

    // Get tenant ID from connections
    const connRes = await fetch(XERO_CONNECTIONS_URL, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const connections = await connRes.json() as any[];
    const tenantId = connections[0]?.tenantId ?? "";

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tenantId,
    };
  }

  async refreshTokens(): Promise<XeroTokens> {
    const clientId = process.env.XERO_CLIENT_ID ?? "";
    const clientSecret = process.env.XERO_CLIENT_SECRET ?? "";

    const res = await fetch(XERO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.tokens.refreshToken,
      }),
    });

    if (!res.ok) throw new Error(`Xero token refresh failed: ${res.status}`);
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

    const res = await fetch(`${XERO_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken}`,
        "Xero-Tenant-Id": this.tokens.tenantId,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Xero API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async getInvoices(modifiedSince?: Date) {
    const headers: Record<string, string> = {};
    if (modifiedSince) {
      headers["If-Modified-Since"] = modifiedSince.toUTCString();
    }
    return this.request<{ Invoices: any[] }>("/Invoices", { headers });
  }

  async createInvoice(invoice: any) {
    return this.request<{ Invoices: any[] }>("/Invoices", {
      method: "POST",
      body: JSON.stringify(invoice),
    });
  }

  async getPayments(modifiedSince?: Date) {
    const headers: Record<string, string> = {};
    if (modifiedSince) {
      headers["If-Modified-Since"] = modifiedSince.toUTCString();
    }
    return this.request<{ Payments: any[] }>("/Payments", { headers });
  }

  async createPayment(payment: any) {
    return this.request<{ Payments: any[] }>("/Payments", {
      method: "POST",
      body: JSON.stringify(payment),
    });
  }

  async getItems() {
    return this.request<{ Items: any[] }>("/Items");
  }

  async createOrUpdateItem(item: any) {
    return this.request<{ Items: any[] }>("/Items", {
      method: "POST",
      body: JSON.stringify(item),
    });
  }
}
