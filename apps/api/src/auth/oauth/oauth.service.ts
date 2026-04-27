import crypto from "node:crypto";
import { getDbClient } from "@stockops/db";

import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleUserInfo,
  type OAuthUserInfo,
} from "./providers/google.provider";
import {
  getMicrosoftAuthUrl,
  exchangeMicrosoftCode,
  getMicrosoftUserInfo,
} from "./providers/microsoft.provider";

type OAuthResult = {
  sessionToken: string;
  user: { id: string; name: string; email: string };
  organization: { id: string; name: string; slug: string };
  isNewUser: boolean;
};

const SUPPORTED_PROVIDERS = ["google", "microsoft"] as const;
type Provider = (typeof SUPPORTED_PROVIDERS)[number];

export class OAuthService {
  getAuthUrl(provider: string): string {
    this.assertProvider(provider);
    if (provider === "google") return getGoogleAuthUrl();
    return getMicrosoftAuthUrl();
  }

  async handleCallback(provider: string, code: string): Promise<OAuthResult> {
    this.assertProvider(provider);

    const tokens = provider === "google"
      ? await exchangeGoogleCode(code)
      : await exchangeMicrosoftCode(code);

    const userInfo: OAuthUserInfo = provider === "google"
      ? await getGoogleUserInfo(tokens.accessToken)
      : await getMicrosoftUserInfo(tokens.accessToken);

    const db = getDbClient();

    // Find or create user by email
    let user = await db.user.findUnique({ where: { email: userInfo.email } });
    const isNewUser = !user;

    if (!user) {
      user = await db.user.create({
        data: { name: userInfo.name, email: userInfo.email },
      });
    }

    // Upsert OAuth account
    await db.oAuthAccount.upsert({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: userInfo.providerUserId,
        },
      },
      create: {
        userId: user.id,
        provider,
        providerUserId: userInfo.providerUserId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? undefined,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
    });

    // Find or create membership (use first org or create default)
    let membership = await db.membership.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    });

    if (!membership) {
      const org = await db.organization.findFirst();
      if (!org) throw new Error("No organization found — seed the database first");

      membership = await db.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: "Viewer",
        },
        include: { organization: true },
      });
    }

    // Create session
    const sessionToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");

    await db.session.create({
      data: {
        userId: user.id,
        organizationId: membership.organizationId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      sessionToken,
      user: { id: user.id, name: user.name, email: user.email },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
      },
      isNewUser,
    };
  }

  private assertProvider(provider: string): asserts provider is Provider {
    if (!SUPPORTED_PROVIDERS.includes(provider as Provider)) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
  }
}
