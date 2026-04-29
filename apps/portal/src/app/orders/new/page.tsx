import { PortalShell } from "@/components/portal-shell";
import { OrderForm } from "@/components/order-form";
import { requirePortalAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const catalogProducts = [
  { id: "1", sku: "WDG-001", name: "Widget Alpha", tierPrice: 21.5, stock: 150 },
  { id: "2", sku: "WDG-002", name: "Widget Beta", tierPrice: 35.0, stock: 85 },
  { id: "3", sku: "GDG-001", name: "Gadget Pro", tierPrice: 129.99, stock: 30 },
  { id: "4", sku: "GDG-002", name: "Gadget Lite", tierPrice: 79.99, stock: 62 },
  { id: "5", sku: "ACC-001", name: "Aksesuar Paketi", tierPrice: 12.5, stock: 200 },
  { id: "6", sku: "ACC-002", name: "Premium Kılıf", tierPrice: 25.0, stock: 120 },
  { id: "7", sku: "CMP-001", name: "Bileşen X", tierPrice: 4.5, stock: 500 },
  { id: "8", sku: "CMP-002", name: "Bileşen Y", tierPrice: 7.0, stock: 350 },
];

export default async function NewOrderPage() {
  const ctx = await requirePortalAuth();

  return (
    <PortalShell
      title="Yeni Sipariş"
      description="Ürünleri seçin, miktarları belirleyin ve sipariş oluşturun."
      customerName={ctx.customerUser.name}
      organizationName={ctx.organization.name}
    >
      <OrderForm products={catalogProducts} />
    </PortalShell>
  );
}
