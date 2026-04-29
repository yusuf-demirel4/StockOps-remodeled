import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockOps B2B Portal",
  description: "Müşteri sipariş ve fatura portalı",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
