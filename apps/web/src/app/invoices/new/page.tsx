import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { InvoiceForm } from "@/components/invoice-form";
import { Panel, subtleButtonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot, listCustomers } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const context = await requireAuth();
  const [snapshot, customers] = await Promise.all([
    getAppSnapshot(context),
    listCustomers(context),
  ]);
  const activeProducts = snapshot.products.filter((product) => product.isActive);

  return (
    <AppShell
      description="Tek satirli taslak fatura olusturun."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Yeni Fatura"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6">
        <Link className={subtleButtonClass} href="/invoices">
          Faturalara don
        </Link>

        <Panel title="Fatura bilgileri" className="max-w-3xl">
          <InvoiceForm
            customers={customers}
            defaultCurrency={context.organization.defaultCurrency ?? "TRY"}
            products={activeProducts}
          />
        </Panel>
      </div>
    </AppShell>
  );
}
