import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { buttonClass, inputClass, Panel, StatusBadge } from "@/components/ui";
import { createProductAction } from "@/lib/actions";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import { numberFormatter } from "@stockops/core/format";

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
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Panel title="Yeni ürün">
          <form action={createProductAction} className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              SKU
              <input className={inputClass} name="sku" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Ürün adı
              <input className={inputClass} name="name" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Barkod
              <input className={inputClass} name="barcode" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Kategori
              <input className={inputClass} name="category" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Minimum stok
              <input
                className={inputClass}
                min="0"
                name="minimumStock"
                required
                type="number"
              />
            </label>
            <button className={buttonClass} type="submit">
              <Plus aria-hidden="true" className="size-4" />
              Ürün ekle
            </button>
          </form>
        </Panel>

        <Panel title="Ürün listesi">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase text-[#6a746f]">
                <tr className="border-b border-[#e3e5dd]">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Ürün</th>
                  <th className="py-2 pr-3">Kategori</th>
                  <th className="py-2 pr-3">Barkod</th>
                  <th className="py-2 pr-3">Minimum</th>
                  <th className="py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.products.map((product) => (
                  <tr
                    className="border-b border-[#eef0ea] last:border-0"
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
                    <td className="py-3">
                      <StatusBadge tone={product.isActive ? "success" : "danger"}>
                        {product.isActive ? "Aktif" : "Pasif"}
                      </StatusBadge>
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
