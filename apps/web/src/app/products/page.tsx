import { AppShell } from "@/components/app-shell";
import {
  ProductCreateForm,
  ProductStatusForm,
  ProductUpdateDisclosure,
} from "@/components/product-forms";
import { Panel, StatusBadge, subtleButtonClass } from "@/components/ui";
import { VariantManager } from "@/components/variant-forms";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import { numberFormatter } from "@stockops/core/format";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  return (
    <AppShell
      description="SKU, barkod, kategori ve minimum stok seviyeleri."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Ürünler"
      userName={snapshot.user.name}
    >
      <div className="flex justify-end mb-2">
        <a
          href="/api/export/products"
          className={subtleButtonClass}
          download="urunler.csv"
        >
          <Download className="size-4" />
          CSV İndir
        </a>
      </div>
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Panel title="Yeni ürün">
          <ProductCreateForm />
        </Panel>

        <Panel title="Ürün listesi">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Ürün</th>
                  <th className="py-2 pr-3">Kategori</th>
                  <th className="py-2 pr-3">Barkod</th>
                  <th className="py-2 pr-3">Minimum</th>
                  <th className="py-2 pr-3">Durum</th>
                  <th className="py-2">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.products.map((product) => (
                  <tr
                    className="border-b border-[var(--border-table)] align-top last:border-0"
                    key={product.id}
                  >
                    <td className="py-3 pr-3 font-mono text-xs">
                      {product.sku}
                    </td>
                    <td className="py-3 pr-3 font-medium">{product.name}</td>
                    <td className="py-3 pr-3">{product.category}</td>
                    <td className="py-3 pr-3 font-mono text-xs">
                      {product.barcode ?? "-"}
                    </td>
                    <td className="py-3 pr-3">
                      {numberFormatter.format(product.minimumStock)}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge tone={product.isActive ? "success" : "danger"}>
                        {product.isActive ? "Aktif" : "Pasif"}
                      </StatusBadge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-start gap-2">
                        <ProductUpdateDisclosure product={product} />
                        <ProductStatusForm product={product} />
                        <VariantManager
                          product={product}
                          variants={snapshot.productVariants}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
