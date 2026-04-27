export type OAuthUserInfo = {
  email: string;
  name: string;
  providerUserId: string;
};

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: process.env.GOOGLE_CALLBACK_URL ?? "",
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeGoogleCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: process.env.GOOGLE_CALLBACK_URL ?? "",
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  const data = await res.json() as any;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function getGoogleUserInfo(accessToken: string): Promise<OAuthUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`);
  const data = await res.json() as any;
  return {
    email: data.email,
    name: data.name,
    providerUserId: data.id,
  };
}
