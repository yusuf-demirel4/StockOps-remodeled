import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createInitialState } from "@stockops/core/demo-data";
import { hashToken } from "@stockops/core/tokens";
import type { AuthContext, Role } from "@stockops/core/types";
import { getPrisma } from "@stockops/db";

function extractBearerToken(
  header: string | string[] | undefined,
): string | null {
  const value = Array.isArray(header) ? header[0] : header;

  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  return value.slice("Bearer ".length).trim();
}

@Injectable()
export class ApiAuthService {
  async authenticate(
    authorization: string | string[] | undefined,
  ): Promise<AuthContext> {
    const token = extractBearerToken(authorization);

    if (!token) {
      throw new UnauthorizedException("Bearer token is required.");
    }

    if (process.env.APP_DATA_SOURCE === "database") {
      return this.authenticateDatabaseToken(token);
    }

    return this.authenticateDemoToken(token);
  }

  private authenticateDemoToken(token: string): AuthContext {
    const expected = process.env.API_DEMO_TOKEN ?? "stockops_demo_api_key";

    if (token !== expected) {
      throw new UnauthorizedException("Invalid API token.");
    }

    const state = createInitialState();
    const user = state.users[0];
    const organization = state.organizations[0];
    const membership = state.memberships.find(
      (item) =>
        item.userId === user.id && item.organizationId === organization.id,
    );

    if (!membership) {
      throw new UnauthorizedException("API token has no organization access.");
    }

    return {
      user,
      organization,
      role: membership.role,
      sessionToken: token,
    };
  }

  private async authenticateDatabaseToken(token: string): Promise<AuthContext> {
    const prisma = getPrisma();
    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { organization: true, user: true },
    });

    if (!apiToken || apiToken.revokedAt) {
      throw new UnauthorizedException("Invalid API token.");
    }

    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: apiToken.organizationId,
          userId: apiToken.userId,
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedException("API token has no organization access.");
    }

    await prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      user: {
        id: apiToken.user.id,
        name: apiToken.user.name,
        email: apiToken.user.email,
        passwordHash: apiToken.user.passwordHash ?? undefined,
      },
      organization: {
        id: apiToken.organization.id,
        name: apiToken.organization.name,
        slug: apiToken.organization.slug,
        defaultCurrency: apiToken.organization.defaultCurrency,
        locale: apiToken.organization.locale,
      },
      role: membership.role as Role,
      sessionToken: token,
    };
  }
}
