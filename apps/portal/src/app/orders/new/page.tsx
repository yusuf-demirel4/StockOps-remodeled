import { PortalShell } from "@/components/portal-shell";
import { OrderForm } from "@/components/order-form";
import { requirePortalAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const fallbackCatalogProducts = [
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
  const isDbMode = process.env.APP_DATA_SOURCE === "database";

  let catalogProducts = fallbackCatalogProducts;

  if (isDbMode) {
    const { getPrisma } = await import("@stockops/db/client");
    const prisma = getPrisma();
    
    const [products, tiers, balances] = await Promise.all([
      prisma.product.findMany({
        where: { organizationId: ctx.organization.id, isActive: true },
      }),
      (prisma as any).customerPriceTier?.findMany({
        where: { organizationId: ctx.organization.id, customerId: ctx.customer.id },
      }).catch(() => []) ?? [],
      prisma.stockBalance.findMany({
        where: { organizationId: ctx.organization.id },
      })
    ]);

    catalogProducts = products.map((p) => {
      const tier = (tiers as any[]).find((t) => t.productId === p.id);
      const stock = balances
        .filter((b) => b.productId === p.id)
        .reduce((sum, b) => sum + b.onHand, 0);
        
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        tierPrice: tier ? Number(tier.tierPrice) : Number(p.unitPrice),
        stock,
      };
    });
  }

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
