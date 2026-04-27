import type { OAuthUserInfo } from "./google.provider";

const MS_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MS_USERINFO_URL = "https://graph.microsoft.com/v1.0/me";

export function getMicrosoftAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    redirect_uri: process.env.MICROSOFT_CALLBACK_URL ?? "",
    response_type: "code",
    scope: "openid email profile User.Read",
    response_mode: "query",
  });
  return `${MS_AUTH_URL}?${params}`;
}

export async function exchangeMicrosoftCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const res = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
      client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
      redirect_uri: process.env.MICROSOFT_CALLBACK_URL ?? "",
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) throw new Error(`Microsoft token exchange failed: ${res.status}`);
  const data = await res.json() as any;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function getMicrosoftUserInfo(accessToken: string): Promise<OAuthUserInfo> {
  const res = await fetch(MS_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Microsoft userinfo failed: ${res.status}`);
  const data = await res.json() as any;
  return {
    email: data.mail ?? data.userPrincipalName,
    name: data.displayName,
    providerUserId: data.id,
  };
}
