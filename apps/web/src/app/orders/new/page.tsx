import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PurchaseOrderForm, SalesOrderForm } from "@/components/order-forms";
import { Panel, subtleButtonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);
  const activeProducts = snapshot.products.filter((product) => product.isActive);

  return (
    <AppShell
      description="Satış veya satın alma siparişi oluşturun."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Yeni Sipariş"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6">
        <Link className={subtleButtonClass} href="/orders">
          Siparişlere dön
        </Link>

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Satış siparişi">
            <SalesOrderForm products={activeProducts} />
          </Panel>

          <Panel title="Satın alma siparişi">
            <PurchaseOrderForm
              products={activeProducts}
              suppliers={snapshot.suppliers}
            />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
