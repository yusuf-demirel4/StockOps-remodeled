import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { CreditNoteForm } from "@/components/credit-note-form";
import { Panel, subtleButtonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { listCustomers, listProducts } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function NewCreditNotePage() {
  const context = await requireAuth();
  const [customers, products] = await Promise.all([
    listCustomers(context),
    listProducts(context),
  ]);

  return (
    <AppShell
      description="Iade veya mahsup sureci icin yeni musteri kredi notu olusturun."
      organizationName={context.organization.name}
      role={context.role}
      title="Yeni Kredi Notu"
      userName={context.user.name}
    >
      <div className="grid gap-6">
        <div className="flex justify-end">
          <Link className={subtleButtonClass} href="/credit-notes">
            Kredi Notlarına Dön
          </Link>
        </div>

        <Panel title="Kredi notu formu">
          <CreditNoteForm customers={customers} products={products} />
        </Panel>
      </div>
    </AppShell>
  );
}
