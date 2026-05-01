import { PortalShell } from "@/components/portal-shell";
import { Panel, EmptyState } from "@/components/ui";
import { requirePortalAuth } from "@/lib/auth";
import { ShoppingCart } from "lucide-react";

export const dynamic = "force-dynamic";

const fallbackDemoProducts = [
  { id: "1", sku: "WDG-001", name: "Widget Alpha", category: "Widgets", price: 24.99, tierPrice: 21.50, stock: 150 },
  { id: "2", sku: "WDG-002", name: "Widget Beta", category: "Widgets", price: 39.99, tierPrice: 35.00, stock: 85 },
  { id: "3", sku: "GDG-001", name: "Gadget Pro", category: "Gadgets", price: 149.99, tierPrice: 129.99, stock: 30 },
  { id: "4", sku: "GDG-002", name: "Gadget Lite", category: "Gadgets", price: 89.99, tierPrice: 79.99, stock: 62 },
  { id: "5", sku: "ACC-001", name: "Aksesuar Paketi", category: "Aksesuarlar", price: 14.99, tierPrice: 12.50, stock: 200 },
  { id: "6", sku: "ACC-002", name: "Premium Kılıf", category: "Aksesuarlar", price: 29.99, tierPrice: 25.00, stock: 120 },
  { id: "7", sku: "CMP-001", name: "Bileşen X", category: "Bileşenler", price: 5.99, tierPrice: 4.50, stock: 500 },
  { id: "8", sku: "CMP-002", name: "Bileşen Y", category: "Bileşenler", price: 8.99, tierPrice: 7.00, stock: 350 },
];

const fmt = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export default async function CatalogPage() {
  const ctx = await requirePortalAuth();
  const isDbMode = process.env.APP_DATA_SOURCE === "database";
  
  let catalogProducts = fallbackDemoProducts;

  if (isDbMode) {
    const { getPrisma } = await import("@stockops/db/client");
    const prisma = getPrisma();
    
    // Aktif ürünleri, müşteriye özel fiyatları ve toplam stokları getir
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
        category: p.category,
        price: Number(p.unitPrice),
        tierPrice: tier ? Number(tier.tierPrice) : Number(p.unitPrice),
        stock,
      };
    });
  }

  return (
    <PortalShell
      title="Ürün Kataloğu"
      description="Müşteri fiyatlarınızla ürünleri görüntüleyin ve sipariş verin."
      customerName={ctx.customerUser.name}
      organizationName={ctx.organization.name}
    >
      <Panel title={`Ürünler (${catalogProducts.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-[var(--text-secondary)]">
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3">Ürün</th>
                <th className="py-2 pr-3">Kategori</th>
                <th className="py-2 pr-3 text-right">Liste Fiyatı</th>
                <th className="py-2 pr-3 text-right">Sizin Fiyatınız</th>
                <th className="py-2 pr-3 text-right">Stok</th>
                <th className="py-2">Sipariş</th>
              </tr>
            </thead>
            <tbody>
              {catalogProducts.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[var(--border-table)] last:border-0"
                >
                  <td className="py-3 pr-3 font-mono text-xs">{product.sku}</td>
                  <td className="py-3 pr-3 font-medium">{product.name}</td>
                  <td className="py-3 pr-3 text-[var(--text-secondary)]">
                    {product.category}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-xs text-[var(--text-secondary)] line-through">
                    {fmt.format(product.price)}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-xs font-semibold text-[var(--accent-primary)]">
                    {fmt.format(product.tierPrice)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <span
                      className={
                        product.stock > 50
                          ? "text-[var(--accent-success-text)]"
                          : product.stock > 10
                            ? "text-[var(--accent-warning-text)]"
                            : "text-[var(--accent-danger-text)]"
                      }
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="py-3">
                    <a
                      href="/orders/new"
                      className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-primary)] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-primary-hover)]"
                    >
                      <ShoppingCart className="size-3" />
                      Sipariş
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-4 rounded-md bg-[var(--accent-success-bg)] px-4 py-3 text-sm text-[var(--accent-success-text)]">
        Müşterinize özel indirimli fiyatlar uygulanmaktadır. Toplu siparişlerde ek indirim için iletişime geçin.
      </div>
    </PortalShell>
  );
}
