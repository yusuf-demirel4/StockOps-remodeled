import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import type { ThemeMode } from "@/lib/theme";
import { THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockOps",
  description: "Stok takip yönetim sistemi",
  manifest: "/manifest.webmanifest",
  applicationName: "StockOps",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StockOps",
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE)?.value;
  const mode: ThemeMode =
    themeCookie === "light" || themeCookie === "dark" || themeCookie === "system"
      ? themeCookie
      : "system";

  const resolved =
    mode === "dark" ? "dark" : mode === "light" ? "light" : "light";

  return (
    <html
      lang="tr"
      data-theme={resolved}
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body
        className="min-h-full flex flex-col antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider initialMode={mode}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
