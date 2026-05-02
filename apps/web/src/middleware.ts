import { NextResponse, type NextRequest } from "next/server";

// Lightweight middleware that augments the responses Next.js produces.
// It does NOT perform auth (auth is handled in server components and server
// actions via requireAuth) — its purpose is to add security defaults that
// belong on every request and to prevent caching of auth-sensitive routes.

const NO_STORE_PATHS = [
  "/sign-in",
  "/api/health",
  "/api/export",
  "/api/invoices",
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (NO_STORE_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }

  return response;
}

export const config = {
  // Skip Next.js internals and static assets so the middleware doesn't add
  // overhead to image, CSS, or font requests.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|map)$).*)",
  ],
};
