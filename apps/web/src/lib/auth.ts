import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDataSourceMode } from "@/lib/data-source";
import {
  authenticateDemoUser,
  createDemoSession,
  deleteDemoSession,
  getDemoAuthContext,
} from "@/lib/demo-store";
import { verifyPassword } from "@stockops/core/password";
import { getPrisma } from "@/lib/prisma";
import type { AuthContext, Role } from "@stockops/core/types";

const SESSION_DAYS = 7;

function sessionCookieName() {
  return process.env.SESSION_COOKIE_NAME ?? "stockops_session";
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionExpiresAt() {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * SESSION_DAYS);
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName(), token, {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function signInWithPassword(email: string, password: string) {
  if (getDataSourceMode() === "demo") {
    const authUser = authenticateDemoUser(email, password);

    if (!authUser) {
      return false;
    }

    const { token, session } = createDemoSession(
      authUser.user.id,
      authUser.organization.id,
    );

    await setSessionCookie(token, new Date(session.expiresAt));
    return true;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (
    !user?.passwordHash ||
    !verifyPassword(password, user.passwordHash) ||
    user.memberships.length === 0
  ) {
    return false;
  }

  const membership = user.memberships[0];
  const token = randomBytes(32).toString("base64url");
  const expiresAt = sessionExpiresAt();

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId: user.id,
      organizationId: membership.organizationId,
      expiresAt,
    },
  });

  await setSessionCookie(token, expiresAt);
  return true;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;

  if (!token) {
    return null;
  }

  if (getDataSourceMode() === "demo") {
    return getDemoAuthContext(token);
  }

  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { organization: true, user: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }

    return null;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: session.organizationId,
        userId: session.userId,
      },
    },
  });

  if (!membership) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      passwordHash: session.user.passwordHash ?? undefined,
    },
    organization: {
      id: session.organization.id,
      name: session.organization.name,
      slug: session.organization.slug,
      defaultCurrency: session.organization.defaultCurrency,
      locale: session.organization.locale,
    },
    role: membership.role as Role,
    sessionToken: token,
  };
}

export async function requireAuth() {
  const context = await getAuthContext();

  if (!context) {
    redirect("/sign-in");
  }

  return context;
}

export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;

  if (token) {
    if (getDataSourceMode() === "demo") {
      deleteDemoSession(token);
    } else {
      await getPrisma().session.deleteMany({
        where: { tokenHash: hashSessionToken(token) },
      });
    }
  }

  cookieStore.delete(sessionCookieName());
}
