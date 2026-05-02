import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Build a Content-Security-Policy that's strict by default but lets the app
// load its own scripts, styles, and fonts (Google fonts via next/font), and
// reaches out to the configured Supabase project + the optional public API.
function buildCsp() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const connectExtras = [supabaseUrl, apiUrl].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  const isProd = process.env.NODE_ENV === "production";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-inline' for styles is required by Tailwind's runtime style-attr
    // injection and Next.js' inline critical CSS. 'unsafe-eval' is only
    // permitted in development for React Refresh.
    "script-src": isProd
      ? ["'self'", "'unsafe-inline'"]
      : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "connect-src": ["'self'", ...connectExtras, "https:", "wss:"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

const sharedHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: buildCsp() },
];

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@stockops/core", "@stockops/db"],
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Default for all routes: deny camera/mic/geolocation/payment.
        source: "/((?!mobile).*)",
        headers: [
          ...sharedHeaders,
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        // Mobile WMS pages need camera access for barcode scanning.
        source: "/mobile/:path*",
        headers: [
          ...sharedHeaders,
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
