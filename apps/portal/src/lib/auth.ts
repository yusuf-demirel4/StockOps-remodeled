import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PortalAuthContext } from "@stockops/core/types";

const COOKIE_NAME = "portal_session";

// Demo mode: single hardcoded customer session for now
// In production, this would validate against CustomerSession table

export async function getPortalSession(): Promise<PortalAuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  // Parse the demo token: orgId:customerId:customerUserId
  const parts = token.split(":");
  if (parts.length !== 3) return null;

  return {
    customerUser: {
      id: parts[2],
      customerId: parts[1],
      name: "Demo Müşteri Kullanıcısı",
      email: "musteri@demo.com",
      isActive: true,
    },
    customer: {
      id: parts[1],
      organizationId: parts[0],
      code: "MUS-1001",
      name: "Demo Müşteri A.Ş.",
      email: "info@demo-musteri.com",
      paymentTermDays: 30,
      isActive: true,
    },
    organization: {
      id: parts[0],
      name: "Demo İşletme",
      slug: "demo",
    },
  };
}

export async function requirePortalAuth(): Promise<PortalAuthContext> {
  const session = await getPortalSession();
  if (!session) redirect("/sign-in");
  return session;
}

export async function portalSignIn(email: string, _password: string) {
  // Demo mode: accept any login and create a demo session
  // In production: validate against CustomerUser table with password hash
  const cookieStore = await cookies();

  // Demo token format: orgId:customerId:customerUserId
  const demoToken = "org_demo:cust_demo:cu_demo";

  cookieStore.set(COOKIE_NAME, demoToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return true;
}

export async function portalSignOut() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
